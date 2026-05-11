/**
 * wrap-tool.ts — Higher-order helper for MCP tool handlers.
 *
 * Inspired by AiToEarn's mcp.utils.wrapTool, simplified for a single-service
 * world:
 *
 *   - validate args with a zod schema
 *   - run handler inside the caller's AsyncLocalStorage user context
 *   - convert AppException -> errorResult, anything else -> generic errorResult
 *   - log timing + outcome
 *
 * Usage:
 *
 *   server.tool('publishTweet', schema.shape, wrapTool('publishTweet', schema,
 *     async (args, user) => successResult(await svc.publish(user.userId, args))));
 */
import { Logger } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { errorResult, McpToolResult, successResult } from './result';
import { AppException } from '../exceptions/app.exception';
import { requestContext, RequestUser } from '../auth/request-context';

const log = new Logger('mcp.tool');

export type ToolHandler<TArgs> = (
  args: TArgs,
  user: RequestUser,
) => Promise<McpToolResult> | Promise<unknown>;

export const wrapTool = <TArgs>(
  name: string,
  schema: ZodSchema<TArgs>,
  handler: ToolHandler<TArgs>,
) => {
  return async (rawArgs: unknown): Promise<McpToolResult> => {
    const startedAt = Date.now();
    const user = requestContext.get();
    if (!user) {
      return errorResult('UNAUTHENTICATED', 'No request user in context');
    }

    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      return errorResult('BAD_ARGS', 'Invalid tool arguments', {
        issues: parsed.error.issues,
      });
    }

    try {
      const out = await handler(parsed.data, user);
      const result: McpToolResult =
        typeof out === 'object' && out !== null && 'content' in (out as object)
          ? (out as McpToolResult)
          : successResult(out);
      log.log(`${name} ok user=${user.userId} ${Date.now() - startedAt}ms`);
      return result;
    } catch (err) {
      if (err instanceof AppException) {
        log.warn(`${name} app-error code=${err.code} msg=${err.message}`);
        return errorResult(err.code, err.message, err.details);
      }
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`${name} crashed: ${msg}`);
      return errorResult('INTERNAL', 'Tool handler crashed');
    }
  };
};
