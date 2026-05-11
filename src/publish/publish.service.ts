/**
 * publish.service.ts — Public façade for creating publish tasks.
 *
 * MCP tools call `enqueue()`; we persist a PublishTask in Mongo. The
 * scheduler picks it up on its next tick. For tasks whose scheduledAt is now
 * or in the past, we still go through the queue (no direct fast-path) so the
 * one code path is exercised in dev.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PublishTask, PublishTaskDocument } from './publish-task.schema';
import { PublishTaskInput } from './publish.interface';

@Injectable()
export class PublishService {
  constructor(
    @InjectModel(PublishTask.name)
    private readonly model: Model<PublishTaskDocument>,
  ) {}

  async enqueue(input: PublishTaskInput): Promise<PublishTaskDocument> {
    const scheduledAt = input.scheduledAt
      ? new Date(input.scheduledAt)
      : new Date();
    return this.model.create({
      userId: input.userId,
      platform: input.platform,
      text: input.text,
      scheduledAt,
      status: 'pending',
    });
  }

  async markPublished(
    id: string,
    postId: string,
    permalink: string,
  ): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      { $set: { status: 'published', postId, permalink } },
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      { $set: { status: 'failed', error }, $inc: { attempts: 1 } },
    );
  }
}
