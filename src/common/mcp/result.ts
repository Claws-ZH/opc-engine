/**
 * result.ts — Uniform MCP tool result envelopes.
 *
 * MCP tools must return a `{ content: [{ type: 'text', text }] }` shape. We
 * always serialize a JSON payload inside that text so MCP clients can parse
 * a stable schema regardless of tool. `isError` is set on failures so Claude
 * surfaces it as a tool error rather than a normal response.
 */

type McpToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export const successResult = (data: unknown): McpToolResult => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify({ ok: true, data }, null, 2),
    },
  ],
});

export const errorResult = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
): McpToolResult => ({
  isError: true,
  content: [
    {
      type: 'text',
      text: JSON.stringify({ ok: false, error: { code, message, details } }, null, 2),
    },
  ],
});

export type { McpToolResult };
