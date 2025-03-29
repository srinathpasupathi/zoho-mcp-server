import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Props } from "./types";
import { z } from "zod";
import app from "./app";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
export class SentryMCP extends McpAgent<Props, Env> {
	server = new McpServer({
		name: "Sentry MCP",
		version: "1.0.0",
	});

	async init() {
		// Hello, world!
		this.server.tool("echo", "Echo a message", { message: z.string() }, async ({ message }) => ({
			content: [{ type: "text", text: message }],
		}));

		this.server.tool(
			"list_errors",
			"Get a list of errors",
			{ filename: z.string() },
			async ({ filename }) => ({
				// this.props.accessToken
				content: [
					{
						type: "text",
						text: JSON.stringify([
							// do the thing
						]),
					},
				],
			}),
		);
	}
}

export default new OAuthProvider({
	apiRoute: "/sse",
	// @ts-ignore
	apiHandler: SentryMCP.mount("/sse"),
	// @ts-ignore
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});
