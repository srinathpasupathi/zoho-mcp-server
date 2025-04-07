import { Hono } from "hono";
import authHandler from "./routes/auth";
import homeHandler from "./routes/home";

export default new Hono<{
  Bindings: Env & { SENTRY_DSN: string };
}>()
  .get("/robots.txt", (c) => {
    return c.text(["User-agent: *", "Allow: /$", "Disallow: /"].join("\n"));
  })
  .get("/llms.txt", (c) => {
    return c.text(
      [
        "# sentry-mcp",
        "",
        "This service provides a Model Context Provider for interacting with Sentry's API (https://sentry.io).",
        "",
        `The MCP's server address is: ${new URL("/sse", c.req.url).href}`,
        "",
      ].join("\n"),
    );
  })
  .route("/", homeHandler)
  .route("/", authHandler);
