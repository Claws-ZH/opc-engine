/**
 * publish.interface.ts — Domain types for the publish pipeline.
 *
 * `PublishingTaskResult` is a sum type so the consumer/scheduler can encode
 * three distinct outcomes without lossy boolean flags. Borrowed from
 * AiToEarn's task model.
 */

export type PublishingTaskResult =
  | { status: 'published'; postId: string; permalink: string }
  | { status: 'publishing'; postId: string } // async — wait for webhook
  | { status: 'failed'; error: string; retryable: boolean };

export type PublishPlatform = 'twitter' | 'youtube' | 'linkedin';

export interface PublishTaskInput {
  userId: string;
  platform: PublishPlatform;
  // Plain text for now — extend with media[] when YouTube/LinkedIn land.
  text: string;
  // ISO timestamp; if omitted or in the past, publish immediately.
  scheduledAt?: string;
}
