/**
 * api-key.guard.ts — x-api-key SHA1-hash gate.
 *
 * Compares sha1(salt + key) against the configured allow-list. On match, opens
 * an AsyncLocalStorage scope with the resolved user so downstream MCP tools
 * and services can call `requestContext.getUser()`.
 *
 * Dev convenience: if no hashes are configured, requests are accepted as the
 * synthetic `dev-user`. Never deploy with an empty allow-list.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Request } from 'express';
import { config } from '../../config/config';
import { RequestUser } from './request-context';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw = (req.headers['x-api-key'] as string | undefined)?.trim();

    const hash = raw
      ? createHash('sha1').update(config.apiKey.salt + raw).digest('hex')
      : '';

    let user: RequestUser | undefined;

    if (config.apiKey.allowedHashes.length === 0) {
      // Dev bypass — log loudly so this can't sneak into prod silently.
      this.logger.warn('OPC_API_KEY_HASHES is empty; accepting as dev-user');
      user = { userId: 'dev-user', apiKeyHash: hash || 'dev' };
    } else if (raw && config.apiKey.allowedHashes.includes(hash)) {
      // The userId-from-key mapping is intentionally trivial in MVP: the hash
      // *is* the tenant key. Replace with a Mongo lookup once multi-user.
      user = { userId: `user:${hash.slice(0, 12)}`, apiKeyHash: hash };
    }

    if (!user) {
      throw new UnauthorizedException('Invalid or missing x-api-key');
    }

    // Stash on the request; the controller is responsible for opening the
    // AsyncLocalStorage scope around the handler body (guards return before
    // the handler runs, so ALS opened here would not be inherited).
    (req as Request & { user?: RequestUser }).user = user;
    return true;
  }
}
