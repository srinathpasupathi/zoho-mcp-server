import { Hono } from "hono";
import type SentryMCP from "../mcp";

const copyPasteHelper = `
const nodes = document.querySelectorAll("[data-copy]");
nodes.forEach((button) => {
  button.addEventListener("click", (e) => {
    const text = button.getAttribute("data-copy");
    navigator.clipboard.writeText(decodeURIComponent(text));
  });
});
`;

export default new Hono<{
  Bindings: Env & {
    MCP_OBJECT: DurableObjectNamespace<SentryMCP>;
  };
}>().get("/", async (c) => {
  const mcpSnippet = JSON.stringify(
    {
      mcpServers: {
        sentry: {
          command: "npx",
          args: ["mcp-remote", new URL("/sse", c.req.url).href],
        },
      },
    },
    undefined,
    2,
  );

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
        <div>
          <button type="button" data-copy={mcpSnippet}>
            Copy
          </button>
          <pre>{mcpSnippet}</pre>
        </div>
        <h2>Available Tools</h2>
        <p>TODO:</p>
        <footer>
          <a href="https://github.com/getsentry/sentry-mcp">GitHub</a>
        </footer>

        <script dangerouslySetInnerHTML={{ __html: copyPasteHelper }} />
      </body>
    </html>,
  );
});
