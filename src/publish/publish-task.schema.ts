/**
 * publish-task.schema.ts — Mongo model for a queued/scheduled publish.
 *
 * The scheduler sweeps `status: 'pending' && scheduledAt <= now` rows and
 * enqueues them on BullMQ with `jobId = task._id` for idempotency.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PublishPlatform } from './publish.interface';

export type PublishTaskStatus =
  | 'pending'
  | 'enqueued'
  | 'publishing'
  | 'published'
  | 'failed';

@Schema({ collection: 'publish_tasks', timestamps: true })
export class PublishTask {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, enum: ['twitter', 'youtube', 'linkedin'] })
  platform!: PublishPlatform;

  @Prop({ required: true })
  text!: string;

  @Prop({ required: true, index: true })
  scheduledAt!: Date;

  @Prop({
    required: true,
    enum: ['pending', 'enqueued', 'publishing', 'published', 'failed'],
    default: 'pending',
    index: true,
  })
  status!: PublishTaskStatus;

  @Prop()
  postId?: string;

  @Prop()
  permalink?: string;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  attempts!: number;
}

export type PublishTaskDocument = HydratedDocument<PublishTask>;
export const PublishTaskSchema = SchemaFactory.createForClass(PublishTask);
PublishTaskSchema.index({ status: 1, scheduledAt: 1 });
