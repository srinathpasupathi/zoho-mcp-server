import { Hono } from "hono";
import { withSentry } from "@sentry/cloudflare";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import authHandler from "./auth-handler";

const app = new Hono<{
	Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers; SENTRY_DSN: string };
}>()
	.get("/", async (c) => {
		return c.html('<a href="/authorize">Auth</a>');
	})
	.route("/", authHandler);

export default withSentry(
	(env) => ({
		// @ts-ignore
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.1,
	}),
	app,
);
