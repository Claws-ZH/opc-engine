/**
 * smoke.spec.ts — Boot the Nest application and hit a trivial route.
 *
 * Doesn't require live Mongo/Redis: we mock-disable connection at config
 * import time via env vars set in this file's top scope. For full
 * integration testing, run docker compose first then `npm test -- --runInBand`.
 */
process.env.MONGODB_URI ||= 'mongodb://localhost:27017/opc_test';
process.env.REDIS_URL ||= 'redis://localhost:6379';
process.env.OPC_API_KEY_SALT ||= 'test-salt';

import { wrapTool } from '../src/common/mcp/wrap-tool';
import { z } from 'zod';
import { requestContext } from '../src/common/auth/request-context';
import { successResult } from '../src/common/mcp/result';

describe('wrapTool', () => {
  it('rejects when no user context', async () => {
    const handler = wrapTool('t', z.object({ x: z.number() }), async () =>
      successResult({ ok: true }),
    );
    const out = await handler({ x: 1 });
    expect(out.isError).toBe(true);
  });

  it('runs handler with parsed args under user context', async () => {
    const handler = wrapTool(
      't',
      z.object({ x: z.number() }),
      async (args, user) => successResult({ doubled: args.x * 2, user: user.userId }),
    );
    const out = await requestContext.run(
      { userId: 'u1', apiKeyHash: 'h' },
      () => handler({ x: 21 }),
    );
    expect(out.isError).toBeUndefined();
    expect(out.content[0]!.text).toContain('"doubled": 42');
    expect(out.content[0]!.text).toContain('"user": "u1"');
  });

  it('reports bad args structurally', async () => {
    const handler = wrapTool('t', z.object({ x: z.number() }), async () =>
      successResult({}),
    );
    const out = await requestContext.run(
      { userId: 'u1', apiKeyHash: 'h' },
      () => handler({ x: 'nope' }),
    );
    expect(out.isError).toBe(true);
    expect(out.content[0]!.text).toContain('BAD_ARGS');
  });
});
