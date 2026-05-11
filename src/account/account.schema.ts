/**
 * account.schema.ts — Mongoose model for a user's connected social account.
 *
 * Stores OAuth tokens per (userId, platform). accessToken is short-lived and
 * rotated from refreshToken by platform services. In prod, encrypt at rest —
 * left plain here to keep the MVP readable.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type Platform = 'twitter' | 'youtube' | 'linkedin';

@Schema({ collection: 'accounts', timestamps: true })
export class Account {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, enum: ['twitter', 'youtube', 'linkedin'] })
  platform!: Platform;

  // Platform-side user id (e.g. twitter numeric id).
  @Prop({ required: true })
  externalId!: string;

  @Prop({ required: true })
  accessToken!: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  expiresAt?: Date;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;
}

export type AccountDocument = HydratedDocument<Account>;
export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.index({ userId: 1, platform: 1, externalId: 1 }, { unique: true });
