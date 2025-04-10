import { withSentry } from "@sentry/cloudflare";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import app from "./app";
import SentryMCP from "./mcp/transports/cloudflare-worker";
import { SCOPES } from "./routes/auth";

// required for Durable Objects
export { SentryMCP };

const oAuthProvider = new OAuthProvider({
  apiRoute: "/sse",
  // @ts-ignore
  apiHandler: SentryMCP.mount("/sse"),
  // @ts-ignore
  defaultHandler: app,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: SCOPES.split(" "),
});

export default withSentry(
  (env) => ({
    debug: true,
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1,
    environment: env.NODE_ENV === "production" ? "production" : "development",
  }),
  oAuthProvider,
) satisfies ExportedHandler<Env>;
