/**
 * immediate-publish.consumer.ts — BullMQ worker that performs the actual
 * platform call for a publish task.
 *
 * jobId is the Mongo task _id so re-enqueues are idempotent. On platform
 * success we mark the task `published`; on `retryable` failures we throw so
 * BullMQ retries with backoff; on permanent failures we mark `failed` and
 * return.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TwitterService } from '../../platforms/twitter/twitter.service';
import { PublishService } from '../publish.service';
import { AppException } from '../../common/exceptions/app.exception';
import { PublishingTaskResult } from '../publish.interface';

export const PUBLISH_QUEUE = 'opc.publish';

export interface PublishJobData {
  taskId: string;
  userId: string;
  platform: 'twitter' | 'youtube' | 'linkedin';
  text: string;
}

@Processor(PUBLISH_QUEUE)
export class ImmediatePublishConsumer extends WorkerHost {
  private readonly logger = new Logger(ImmediatePublishConsumer.name);

  constructor(
    private readonly twitter: TwitterService,
    private readonly publish: PublishService,
  ) {
    super();
  }

  async process(job: Job<PublishJobData>): Promise<PublishingTaskResult> {
    const { taskId, userId, platform, text } = job.data;
    this.logger.log(`process task=${taskId} platform=${platform}`);

    try {
      if (platform !== 'twitter') {
        throw new AppException(
          'PLATFORM_NOT_IMPLEMENTED',
          `Platform ${platform} not wired yet`,
        );
      }
      const posted = await this.twitter.postTweet(userId, text);
      await this.publish.markPublished(taskId, posted.tweetId, posted.permalink);
      return {
        status: 'published',
        postId: posted.tweetId,
        permalink: posted.permalink,
      };
    } catch (err) {
      const retryable = err instanceof AppException ? err.retryable : true;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`task=${taskId} failed retryable=${retryable}: ${message}`);
      if (retryable) {
        // Let BullMQ retry per queue settings.
        throw err;
      }
      await this.publish.markFailed(taskId, message);
      return { status: 'failed', error: message, retryable: false };
    }
  }
}
