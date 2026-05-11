/**
 * main.ts — Nest bootstrap.
 *
 * Starts the HTTP server. The MCP Streamable HTTP endpoint is mounted as a
 * regular Nest controller (see src/mcp/mcp-http.controller.ts).
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from './config/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();
  await app.listen(config.port);
  new Logger('bootstrap').log(`opc-engine listening on :${config.port}`);
}

void bootstrap();
