/**
 * publish.mcp.ts — MCP tool registrations for the publish domain.
 *
 * `createSdkMcpServer` from @anthropic-ai/claude-agent-sdk gives us an
 * in-process MCP surface; we register tools on it here and the HTTP layer
 * forwards calls. Each tool handler is wrapped by `wrapTool` for validation,
 * uniform results, and AsyncLocalStorage user injection.
 */
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { wrapTool } from '../common/mcp/wrap-tool';
import { successResult } from '../common/mcp/result';
import { PublishService } from '../publish/publish.service';

const publishTweetSchema = z.object({
  text: z.string().min(1).max(280),
  scheduledAt: z.string().datetime().optional(),
});

@Injectable()
export class PublishMcp {
  constructor(private readonly publish: PublishService) {}

  /**
   * Build an MCP server bound to *this* request's user context. The handler
   * captures `user.userId` via wrapTool's closure injection — no userId ever
   * appears in the tool's public schema.
   */
  buildServer() {
    return createSdkMcpServer({
      name: 'opc-engine',
      version: '0.1.0',
      tools: [
        tool(
          'publishTweet',
          'Publish a tweet immediately, or schedule for a future ISO timestamp.',
          publishTweetSchema.shape,
          wrapTool('publishTweet', publishTweetSchema, async (args, user) => {
            const task = await this.publish.enqueue({
              userId: user.userId,
              platform: 'twitter',
              text: args.text,
              scheduledAt: args.scheduledAt,
            });
            return successResult({
              taskId: String(task._id),
              status: task.status,
              scheduledAt: task.scheduledAt.toISOString(),
            });
          }),
        ),
      ],
    });
  }
}
