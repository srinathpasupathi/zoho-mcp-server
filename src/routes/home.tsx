import { Hono } from "hono";
import SentryMCP from "../mcp";

export default new Hono<{
  Bindings: Env & {
    MCP_OBJECT: DurableObjectNamespace<SentryMCP>;
  };
}>().get("/", async (c) => {
  return c.html(
    <html>
      <head>
        <title>Sentry MCP</title>
      </head>
      <body>
        <h1>Sentry MCP</h1>
        <p>
          This service provides a Model Context Provider for interacting with{" "}
          <a href="https://docs.sentry.io/api/">Sentry's API</a>.
        </p>
        <pre>
          {JSON.stringify(
            {
              mcpServers: {
                sentry: {
                  command: "npx",
                  args: ["mcp-remote", new URL("/sse", c.req.url).href],
                },
              },
            },
            undefined,
            2
          )}
        </pre>
        <h2>Available Tools</h2>
      </body>
    </html>
  );
});
