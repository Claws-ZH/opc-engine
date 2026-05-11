/**
 * publish.module.ts — Publish pipeline: model, service, queue, scheduler.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { PublishTask, PublishTaskSchema } from './publish-task.schema';
import { PublishService } from './publish.service';
import {
  ImmediatePublishConsumer,
  PUBLISH_QUEUE,
} from './consumers/immediate-publish.consumer';
import { EnqueueScheduler } from './scheduler/enqueue.scheduler';
import { TwitterModule } from '../platforms/twitter/twitter.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublishTask.name, schema: PublishTaskSchema },
    ]),
    BullModule.registerQueue({ name: PUBLISH_QUEUE }),
    TwitterModule,
  ],
  providers: [PublishService, ImmediatePublishConsumer, EnqueueScheduler],
  exports: [PublishService],
})
export class PublishModule {}
