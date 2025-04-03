import { Hono } from "hono";
import authHandler from "./routes/auth";
import homeHandler from "./routes/home";

export default new Hono<{
  Bindings: Env & { SENTRY_DSN: string };
}>()
  .get("/robots.txt", (c) => {
    return c.text(["User-agent: *", "Allow: /$", "Disallow: /"].join("\n"));
  })
  .route("/", homeHandler)
  .route("/", authHandler);
