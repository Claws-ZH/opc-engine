/**
 * mcp-http.controller.ts — External MCP endpoint (Streamable HTTP).
 *
 * Speaks the MCP Streamable HTTP transport defined by
 * @modelcontextprotocol/sdk. Every request is gated by ApiKeyGuard, which
 * also opens the AsyncLocalStorage user scope consumed by tool closures.
 *
 * Note: the Streamable HTTP transport handles both POST (client->server
 * messages) and GET (SSE stream for server->client notifications). We bind
 * both here and hand the raw req/res to the transport.
 */
import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ApiKeyGuard } from '../common/auth/api-key.guard';
import { requestContext, RequestUser } from '../common/auth/request-context';
import { PublishMcp } from './publish.mcp';

@Controller('mcp')
@UseGuards(ApiKeyGuard)
export class McpHttpController {
  private readonly logger = new Logger(McpHttpController.name);

  constructor(private readonly publishMcp: PublishMcp) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as Request & { user?: RequestUser }).user;
    if (!user) {
      // Guard should have rejected, but be defensive.
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    const server = this.publishMcp.buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    res.on('close', () => {
      void transport.close();
    });

    await requestContext.run(user, async () => {
      try {
        await server.instance.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (err) {
        this.logger.error(
          `mcp handler error: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (!res.headersSent) {
          res.status(500).json({ error: 'mcp_internal_error' });
        }
      }
    });
  }
}
