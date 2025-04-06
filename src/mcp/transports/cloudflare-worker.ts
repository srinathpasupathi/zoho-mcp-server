import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorkerProps } from "../../types";
import { configureServer } from "../server";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
export default class SentryMCPWorker extends McpAgent<
  Env,
  unknown,
  WorkerProps
> {
  server = new McpServer({
    name: "Sentry MCP",
    version: "0.1.0",
  });

  async init() {
    configureServer(this.server, this.props);
  }
}
