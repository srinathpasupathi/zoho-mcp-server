import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Props } from "./types";
import { z } from "zod";
import app from "./app";
import { SentryDiscoverEventSchema, SentryEventSchema, SentryIssueSchema } from "./schema";

const API_BASE_URL = "https://sentry.io/api/0";

function formatEventOutput(event: z.infer<typeof SentryEventSchema>) {
  let output = "";
  for (const entry of event.entries) {
    if (entry.type === "exception") {
      const firstError = entry.data.values[0];
      output += `Error:\n${"```"}\n${firstError.type}: ${firstError.value}\n${"```"}\n\n`;
      output += `Stacktrace:\n${"```"}\n${firstError.stacktrace.frames
        .map(
          (frame) =>
            `${frame.filename} (line ${frame.lineno})\n${frame.context
              .filter(([lineno, _]) => lineno === frame.lineno)
              .map(([_, code]) => `${code}`)
              .join("\n")}`,
        )
        .join("\n")}\n${"```"}\n\n`;
    }
  }
  return output;
}

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
      "search_errors_in_file",
      "Search Sentry for errors occurring in a specific file. A maximum of 5 results will be returned.",
      {
        filename: z.string().describe("The path or name of the file to search for errors in"),
      },
      async ({
        filename,
      }: {
        filename: string;
      }) => {
        try {
          // Construct the query based on identifier type
          const query = `stack.filename:"*/${filename}"`;
          const limit = 5;

          const organization_slug = this.props.organizationSlug || "sentry"; // TODO: remove this

          const apiUrl = `${API_BASE_URL}/organizations/${organization_slug}/events/?dataset=errors&field=issue&field=title&field=project&field=timestamp&field=trace&per_page=${limit}&query=${encodeURIComponent(query)}&referrer=sentry-mcp&sort=-timestamp&statsPeriod=1w`;

          // Make the API request
          const listResponse = await fetch(apiUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.props.accessToken}`,
              "Content-Type": "application/json",
            },
          });

          // Check if the request was successful
          if (!listResponse.ok) {
            const errorText: string = await listResponse.text();
            console.error("DEBUG: API request failed:", listResponse.status, errorText);
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to search for errors: ${listResponse.status} ${listResponse.statusText}\n${errorText}`,
                },
              ],
              isError: true,
            };
          }

          // Parse the response
          const listBody = await listResponse.json<{ data: unknown[] }>();
          const eventList: z.infer<typeof SentryDiscoverEventSchema>[] = listBody.data.map((i) =>
            SentryDiscoverEventSchema.parse(i),
          );

          // Format the output based on the view type and format
          let output = "";

          if (eventList.length === 0) {
            output = `# No errors found\nCould not find any errors affecting file \`${filename}\`.`;

            return {
              content: [{ type: "text", text: output }],
            };
          }

          output = `# Errors in \`${filename}\`\n\n`;

          for (const eventSummary of eventList) {
            output += `## ${eventSummary.issue}: ${eventSummary.title}\n`;
            output += `- **Issue ID**: ${eventSummary.issue}\n`;

            // CRINGE
            try {
              const eventResponse = await fetch(
                `${API_BASE_URL}/organizations/${organization_slug}/issues/${eventSummary.issue}/events/${eventSummary.id}/`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${this.props.accessToken}`,
                    "Content-Type": "application/json",
                  },
                },
              );
              const event = SentryEventSchema.parse(await eventResponse.json());
              output += formatEventOutput(event);
            } catch (err) {
              console.error("DEBUG: error querying details for event", eventSummary.id, err);
            }
          }

          output = `# Using this information\n\nYou can reference the ID in commit messages (e.g. \`Fixes ${eventList[0].issue}\`) to automatically close the issue when the commit is merged.`;

          return {
            content: [
              {
                type: "text",
                text: output,
              },
            ],
          };
        } catch (error: any) {
          console.error("DEBUG: Caught error:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error searching for file:\n${error.message}`,
              },
            ],
            isError: true,
          };
        }
      },
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
