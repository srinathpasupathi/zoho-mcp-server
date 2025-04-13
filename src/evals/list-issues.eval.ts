import { describeEval } from "vitest-evals";
import { Factuality, FIXTURES, TaskRunner } from "./utils";

describeEval("list-issues", {
  data: async () => {
    return [
      {
        input:
          "Can you you give me a list of common production errors messages, with their stacktrace and a url for more information?",
        expected: [
          "## REMOTE-MCP-41",
          "- **Error**: Tool list_organizations is already registered",
          "- **Issue ID**: REMOTE-MCP-41",
          "- **Stacktrace**:",
          "```",
          "index.js at line 7809:27",
          '"index.js" at line 8029:24',
          '"index.js" at line 19631:28',
          "```",
          `- **URL**: https://${FIXTURES.organizationSlug}.sentry.io/issues/REMOTE-MCP-41`,
        ].join("\n"),
      },
    ];
  },
  task: TaskRunner(),
  scorers: [Factuality()],
  threshold: 0.6,
  timeout: 30000,
});
