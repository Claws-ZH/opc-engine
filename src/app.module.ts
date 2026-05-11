/**
 * app.module.ts — Top-level Nest module.
 *
 * Wires Mongo, Redis (BullMQ), schedule, and feature modules. Keep this file
 * thin: feature modules own their own providers.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { config } from './config/config';
import { AccountModule } from './account/account.module';
import { TwitterModule } from './platforms/twitter/twitter.module';
import { PublishModule } from './publish/publish.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    MongooseModule.forRoot(config.mongoUri),
    BullModule.forRoot({
      connection: { url: config.redisUrl },
    }),
    ScheduleModule.forRoot(),
    AccountModule,
    TwitterModule,
    PublishModule,
    McpModule,
  ],
})
export class AppModule {}
