import { describe, it, expect } from "vitest";
import { TOOL_HANDLERS } from "./tools";

describe("list_organizations", () => {
  it("serializes", async () => {
    const tool = TOOL_HANDLERS.list_organizations;
    const result = await tool({
      accessToken: "access-token",
      organizationSlug: null,
    });
    expect(result).toMatchInlineSnapshot(`
      "# Organizations

      - sentry-mcp-evals
      "
    `);
  });
});

describe("list_teams", () => {
  it("serializes", async () => {
    const tool = TOOL_HANDLERS.list_teams;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: "sentry-mcp-evals",
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# Teams in **sentry-mcp-evals**

      - sentry-mcp-evals
      "
    `);
  });
});

describe("list_projects", () => {
  it("serializes", async () => {
    const tool = TOOL_HANDLERS.list_projects;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: "sentry-mcp-evals",
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# Projects in **sentry-mcp-evals**

      - test-suite
      "
    `);
  });
});

describe("search_errors", () => {
  it("serializes", async () => {
    const tool = TOOL_HANDLERS.search_errors;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: "sentry-mcp-evals",
        projectSlug: undefined,
        filename: undefined,
        query: undefined,
        sortBy: "count",
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# Search Results


      ## REMOTE-MCP-41: Error: Tool list_organizations is already registered

      - **Issue ID**: REMOTE-MCP-41
      - **URL**: https://sentry-mcp-evals.sentry.io/issues/REMOTE-MCP-41
      - **Project**: test-suite
      - **Last Seen**: 2025-04-07T12:23:39+00:00
      - **Occurrences**: 2

      # Using this information

      - You can reference the Issue ID in commit messages (e.g. \`Fixes REMOTE-MCP-41\`) to automatically close the issue when the commit is merged.
      - You can get more details about this error by using the "get_error_details" tool.
      "
    `);
  });
});

describe("get_error_details", () => {
  it("serializes with issueId", async () => {
    const tool = TOOL_HANDLERS.get_error_details;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: "sentry-mcp-evals",
        issueId: "REMOTE-MCP-41",
        issueUrl: undefined,
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# REMOTE-MCP-41: Error: Tool list_organizations is already registered

      **Issue ID**:
      REMOTE-MCP-41
      **Culprit**:
      Object.fetch(index)
      **Occurred At**:
      2025-04-08T21:15:04.000Z

      **Error:**
      \`\`\`
      Error: Tool list_organizations is already registered
      \`\`\`

      **Stacktrace:**
      \`\`\`
      "index.js" at line 7809:27
      "index.js" at line 8029:24
      "index.js" at line 19631:28
      \`\`\`

      # Using this information

      - You can reference the IssueID in commit messages (e.g. \`Fixes REMOTE-MCP-41\`) to automatically close the issue when the commit is merged.
      - The stacktrace includes both first-party application code as well as third-party code, its important to triage to first-party code.
      "
    `);
  });

  it("serializes with issueUrl", async () => {
    const tool = TOOL_HANDLERS.get_error_details;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: undefined,
        issueId: undefined,
        issueUrl: "https://sentry-mcp-evals.sentry.io/issues/6507376925",
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# 6507376925: Error: Tool list_organizations is already registered

      **Issue ID**:
      6507376925
      **Culprit**:
      Object.fetch(index)
      **Occurred At**:
      2025-04-08T21:15:04.000Z

      **Error:**
      \`\`\`
      Error: Tool list_organizations is already registered
      \`\`\`

      **Stacktrace:**
      \`\`\`
      "index.js" at line 7809:27
      "index.js" at line 8029:24
      "index.js" at line 19631:28
      \`\`\`

      # Using this information

      - You can reference the IssueID in commit messages (e.g. \`Fixes 6507376925\`) to automatically close the issue when the commit is merged.
      - The stacktrace includes both first-party application code as well as third-party code, its important to triage to first-party code.
      "
    `);
  });
});

describe("create_team", () => {
  it("serializes", async () => {
    const tool = TOOL_HANDLERS.create_team;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: "sentry-mcp-evals",
        name: "the-goats",
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# New Team

      - **ID**: 4509109078196224
      - **Slug**: the-goats
      - **Name**: the-goats
      # Using this information

      - You should always inform the user of the Team Slug value.
      "
    `);
  });
});

describe("create_project", () => {
  it("serializes", async () => {
    const tool = TOOL_HANDLERS.create_project;
    const result = await tool(
      {
        accessToken: "access-token",
        organizationSlug: null,
      },
      {
        organizationSlug: "sentry-mcp-evals",
        teamSlug: "the-goats",
        name: "cloudflare-mcp",
        platform: "javascript",
      },
    );
    expect(result).toMatchInlineSnapshot(`
      "# New Project

      - **ID**: 4509109104082945
      - **Slug**: cloudflare-mcp
      - **Name**: cloudflare-mcp
      - **SENTRY_DSN**: https://d20df0a1ab5031c7f3c7edca9c02814d@o4509106732793856.ingest.us.sentry.io/4509109104082945

      # Using this information

      - You can reference the **SENTRY_DSN** value to initialize Sentry's SDKs.
      - You should always inform the user of the **SENTRY_DSN** and Project Slug values.
      "
    `);
  });
});
