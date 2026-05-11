/**
 * account.service.ts — CRUD over connected social accounts.
 *
 * Thin layer over Mongoose. Platform-specific token refresh lives in each
 * platform service (e.g. twitter.service); this module just persists.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument, Platform } from './account.schema';
import { AppException } from '../common/exceptions/app.exception';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name) private readonly model: Model<AccountDocument>,
  ) {}

  async findOne(
    userId: string,
    platform: Platform,
  ): Promise<AccountDocument> {
    const acc = await this.model.findOne({ userId, platform }).exec();
    if (!acc) {
      throw new AppException(
        'ACCOUNT_NOT_CONNECTED',
        `No ${platform} account connected for user`,
      );
    }
    return acc;
  }

  async upsert(
    userId: string,
    platform: Platform,
    externalId: string,
    tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
    meta?: Record<string, unknown>,
  ): Promise<AccountDocument> {
    return this.model
      .findOneAndUpdate(
        { userId, platform, externalId },
        { $set: { ...tokens, meta } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }
}
