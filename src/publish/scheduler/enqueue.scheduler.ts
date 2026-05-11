/**
 * enqueue.scheduler.ts — Periodic sweep of due publish tasks into BullMQ.
 *
 * Uses a Redlock-backed advisory lock so multiple replicas don't double-enqueue.
 * Single-instance dev still works (Redlock with one node is degenerate but
 * safe). Job ids equal the task _id so retries / re-sweeps are idempotent —
 * BullMQ refuses duplicate jobIds.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import Redlock from 'redlock';
import {
  PublishJobData,
  PUBLISH_QUEUE,
} from '../consumers/immediate-publish.consumer';
import { PublishTask, PublishTaskDocument } from '../publish-task.schema';
import { config } from '../../config/config';

@Injectable()
export class EnqueueScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnqueueScheduler.name);
  private redis!: Redis;
  private redlock!: Redlock;

  constructor(
    @InjectQueue(PUBLISH_QUEUE) private readonly queue: Queue<PublishJobData>,
    @InjectModel(PublishTask.name)
    private readonly model: Model<PublishTaskDocument>,
  ) {}

  onModuleInit(): void {
    this.redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    this.redlock = new Redlock([this.redis], {
      retryCount: 0, // we're polling, miss this tick and try again
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweep(): Promise<void> {
    if (!config.scheduler.enabled) return;

    let lock;
    try {
      lock = await this.redlock.acquire(['opc:scheduler:sweep'], 25_000);
    } catch {
      // Another instance owns this tick.
      return;
    }

    try {
      const now = new Date();
      const due = await this.model
        .find({ status: 'pending', scheduledAt: { $lte: now } })
        .limit(50)
        .exec();

      for (const task of due) {
        const jobId = String(task._id);
        await this.queue.add(
          'publish',
          {
            taskId: jobId,
            userId: task.userId,
            platform: task.platform,
            text: task.text,
          },
          {
            jobId, // idempotency: same task -> same job
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: 100,
            removeOnFail: 100,
          },
        );
        await this.model.updateOne(
          { _id: task._id, status: 'pending' },
          { $set: { status: 'enqueued' } },
        );
        this.logger.log(`enqueued task=${jobId} platform=${task.platform}`);
      }
    } catch (err) {
      this.logger.error(
        `sweep error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      try {
        await lock.release();
      } catch {
        /* lock already expired */
      }
    }
  }
}
