import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type SentryMCP from "../mcp/transports/cloudflare-worker";
import type { ServerContext } from "../mcp/types";

export type WorkerProps = ServerContext & {
  id: string;
  name: string;
};

export interface Env {
  NODE_ENV: string;
  ASSETS: Fetcher;
  OAUTH_KV: KVNamespace;
  SENTRY_CLIENT_ID: string;
  SENTRY_CLIENT_SECRET: string;
  SENTRY_DSN?: string;
  SENTRY_HOST?: string;
  MCP_OBJECT: DurableObjectNamespace<SentryMCP>;
  OAUTH_PROVIDER: OAuthHelpers;
  AI: Ai;
}
