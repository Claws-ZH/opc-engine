/**
 * twitter.module.ts — Twitter integration module.
 */
import { Module } from '@nestjs/common';
import { AccountModule } from '../../account/account.module';
import { TwitterService } from './twitter.service';

@Module({
  imports: [AccountModule],
  providers: [TwitterService],
  exports: [TwitterService],
})
export class TwitterModule {}
