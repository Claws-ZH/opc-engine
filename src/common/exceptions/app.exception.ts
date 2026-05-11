/**
 * app.exception.ts — Single typed exception for domain errors.
 *
 * Throw this from services; the MCP `wrapTool` adapter turns it into a
 * structured `errorResult`. Anything else bubbles as 500 + generic message.
 */
export class AppException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppException';
  }
}
