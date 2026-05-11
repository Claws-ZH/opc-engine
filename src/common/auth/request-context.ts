/**
 * request-context.ts — AsyncLocalStorage for the current request user.
 *
 * Set by ApiKeyGuard at the edge, read by MCP tool closures and any deep
 * service code that needs the caller identity without prop-drilling.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestUser {
  userId: string;
  // Hash of the api key that authenticated this request (for audit).
  apiKeyHash: string;
}

const storage = new AsyncLocalStorage<RequestUser>();

export const requestContext = {
  run<T>(user: RequestUser, fn: () => T): T {
    return storage.run(user, fn);
  },
  get(): RequestUser | undefined {
    return storage.getStore();
  },
  getUser(): RequestUser {
    const u = storage.getStore();
    if (!u) {
      throw new Error('No request user in context');
    }
    return u;
  },
};
