/**
 * twitter.service.ts — X/Twitter publish + OAuth2 PKCE (stub).
 *
 * Implementation notes (do this when wiring for real):
 *
 *   OAuth2 PKCE (user-context, required for v2 write scopes):
 *     1. GET /oauth/twitter/start
 *          - generate code_verifier (43-128 chars, [A-Za-z0-9-._~])
 *          - code_challenge = base64url(sha256(code_verifier))
 *          - state = random; persist {state -> {userId, code_verifier}} in Redis (TTL 10m)
 *          - redirect to https://twitter.com/i/oauth2/authorize
 *              ?response_type=code
 *              &client_id=TWITTER_CLIENT_ID
 *              &redirect_uri=TWITTER_REDIRECT_URI
 *              &scope=tweet.read tweet.write users.read offline.access
 *              &state=...
 *              &code_challenge=...&code_challenge_method=S256
 *
 *     2. GET /oauth/twitter/callback?code&state
 *          - look up state in Redis, recover code_verifier + userId
 *          - POST https://api.twitter.com/2/oauth2/token (Basic auth = clientId:clientSecret)
 *              grant_type=authorization_code
 *              code, redirect_uri, code_verifier, client_id
 *          - persist via AccountService.upsert(userId, 'twitter', externalId, tokens)
 *
 *     3. Refresh: when expiresAt within 60s, POST /2/oauth2/token with
 *        grant_type=refresh_token. Rotate refreshToken in Mongo.
 *
 *   Publish:
 *     POST https://api.twitter.com/2/tweets
 *       Authorization: Bearer <accessToken>
 *       body: { "text": "..." }
 *     Response: { data: { id, text } }
 *     permalink: `https://x.com/i/web/status/${id}`
 *
 * The `twitter-api-v2` package handles all of the above; we keep this file
 * as the documented seam.
 */
import { Injectable, Logger } from '@nestjs/common';
import { AccountService } from '../../account/account.service';
import { AppException } from '../../common/exceptions/app.exception';
import { PostedTweet } from './twitter.types';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);

  constructor(private readonly accounts: AccountService) {}

  /**
   * Publish a tweet on behalf of `userId`. Throws AppException with a
   * `retryable` flag set sensibly so the BullMQ consumer can decide whether
   * to surface a transient failure vs. a permanent one.
   */
  async postTweet(userId: string, text: string): Promise<PostedTweet> {
    if (text.length === 0 || text.length > 280) {
      throw new AppException(
        'TWEET_INVALID_LENGTH',
        'Tweet must be 1..280 characters',
      );
    }

    const account = await this.accounts.findOne(userId, 'twitter');

    // --- STUB ---
    // Real impl:
    //   const client = new TwitterApi(await this.ensureFreshToken(account));
    //   const { data } = await client.v2.tweet(text);
    //   return { tweetId: data.id, permalink: `https://x.com/i/web/status/${data.id}` };
    this.logger.warn(
      `STUB postTweet user=${userId} acct=${account.externalId} text="${text.slice(0, 40)}..."`,
    );
    const fakeId = `stub_${Date.now()}`;
    return {
      tweetId: fakeId,
      permalink: `https://x.com/i/web/status/${fakeId}`,
    };
  }
}
