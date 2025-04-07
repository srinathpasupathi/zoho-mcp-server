import { openai } from "@ai-sdk/openai";
import { experimental_createMCPClient, streamText } from "ai";
import { evalite } from "evalite";
import { Factuality } from "./utils";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";

const model = openai("gpt-4o");

const CONFIG = {
  organizationSlug: "sentry-mcp-evals",
  teamSlug: "sentry-mcp-evals",
  projectSlug: "test-suite",
};

evalite("workflow", {
  data: async () => {
    return [
      {
        input: `What organizations do I have access to in Sentry`,
        expected: CONFIG.organizationSlug,
      },
      {
        input: `What teams do I have access to in Sentry for '${CONFIG.organizationSlug}'`,
        expected: CONFIG.teamSlug,
      },
      {
        input: `What projects do I have access to in Sentry for '${CONFIG.organizationSlug}'`,
        expected: CONFIG.projectSlug,
      },
      {
        input: `Create a new team in Sentry for '${CONFIG.organizationSlug}' called 'the-goats' response with **only** the team slug and no other text.`,
        expected: "the-goats",
      },
      {
        input: `Create a new project in Sentry for '${CONFIG.organizationSlug}' called 'cloudflare-mcp' with the 'sentry-mcp-evals' team. Output **only** the project slug and the SENTRY_DSN in the format of:\n<PROJECT_SLUG>\n<SENTRY_DSN>`,
        expected:
          "cloudflare-mcp\nhttps://d20df0a1ab5031c7f3c7edca9c02814d@o4509106732793856.ingest.us.sentry.io/4509109104082945",
      },
    ];
  },
  task: async (input) => {
    const transport = new Experimental_StdioMCPTransport({
      command: "npm",
      args: ["run", "start:stdio", "--mocks"],
      env: {
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN!,
      },
    });
    const mcpClient = await experimental_createMCPClient({
      transport,
    });

    const tools = await mcpClient.tools();

    try {
      const result = streamText({
        model,
        tools,
        system:
          "You are an assistant responsible for evaluating the results of calling various tools. Given the user's query, use the tools available to you to answer the question.",
        prompt: input,
        maxRetries: 1,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
        },
        onError: (error) => {
          console.error(error);
        },
      });

      for await (const part of result.fullStream) {
        // console.log(part);
      }

      return await result.text;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await mcpClient.close();
    }
  },
  scorers: [Factuality],
});
