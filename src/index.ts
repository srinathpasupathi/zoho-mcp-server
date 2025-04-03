import { withSentry } from "@sentry/cloudflare";
import oAuthProvider from "./oauth-provider";

// required for Durable Objects
export { default as SentryMCP } from "./mcp";

export default withSentry(
  (env) => ({
    // @ts-ignore
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1,
  }),
  oAuthProvider
);
