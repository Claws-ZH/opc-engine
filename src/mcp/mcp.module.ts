/**
 * mcp.module.ts — MCP surface (HTTP transport + tool registrations).
 */
import { Module } from '@nestjs/common';
import { PublishModule } from '../publish/publish.module';
import { PublishMcp } from './publish.mcp';
import { McpHttpController } from './mcp-http.controller';

@Module({
  imports: [PublishModule],
  controllers: [McpHttpController],
  providers: [PublishMcp],
})
export class McpModule {}
