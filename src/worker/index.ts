import { withSentry, setUser } from "@sentry/cloudflare";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import SentryMCP from "../mcp/transports/cloudflare-worker";
import { SCOPES } from "./auth";
import app from "./app";
import type { Env } from "./types";

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

const worker = {
  fetch: (request, env, ctx) => {
    setUser({
      ip: request.headers.get("cf-connecting-ip"),
    });
    return oAuthProvider.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

export default withSentry(
  (env) => ({
    debug: true,
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1,
    environment: env.NODE_ENV === "production" ? "production" : "development",
  }),
  worker,
) satisfies ExportedHandler<Env>;
