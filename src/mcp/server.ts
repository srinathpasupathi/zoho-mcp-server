import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Props } from "../types";
import { logError } from "../lib/logging";
import { TOOL_DEFINITIONS, TOOL_HANDLERS } from "./tools";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
export default class SentryMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({
    name: "Sentry MCP",
    version: "0.1.0",
  });

  async init() {
    for (const tool of TOOL_DEFINITIONS) {
      const handler = TOOL_HANDLERS[tool.name];

      this.server.tool(
        tool.name as string,
        tool.description,
        tool.paramsSchema ? tool.paramsSchema : {},
        async (...args) => {
          try {
            // TODO(dcramer): I'm too dumb to figure this out
            // @ts-ignore
            const output = await handler(this.props, ...args);

            return {
              content: [
                {
                  type: "text",
                  text: output,
                },
              ],
            };
          } catch (error) {
            logError(error);
            return {
              content: [
                {
                  type: "text",
                  text: `**Error**\n\nIt looks like there was a problem communicating with the Sentry API:\n\n${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
              ],
              isError: true,
            };
          }
        },
      );
    }
  }
}
