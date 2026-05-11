/**
 * twitter.types.ts — Internal shapes for the X/Twitter integration.
 */

export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PostedTweet {
  tweetId: string;
  permalink: string;
}
