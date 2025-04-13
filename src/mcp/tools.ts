import type { ServerContext } from "../types";
import { z } from "zod";
import { SentryApiService, extractIssueId } from "../lib/sentry-api";
import {
  ParamIssueShortId,
  ParamOrganizationSlug,
  ParamPlatform,
  ParamProjectSlug,
  ParamQuery,
  ParamTeamSlug,
  ParamTransaction,
} from "./schema";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { formatEventOutput } from "./formatting";

const QUERY_SYNTAX = [
  "Search queries are constructed using a `key:value` pattern, with an optional raw search at the end. Each `key:value` pair is a `token` and the optional raw search is itself a single `token`. The `key:value` pair `tokens` are treated as issue or event properties. The optional raw search is treated as a single `token` and searches event titles/messages.",
  "",
  "For example:",
  "",
  "```",
  'is:resolved user.username:"Jane Doe" server:web-8 example error',
  "```",
  "",
  "In the example above, there are three keys (`is:`, `user.username:`, `server:`), but four tokens:",
  "",
  "- `is:resolved`",
  '- `user.username:"Jane Doe"`',
  "- `server:web-8`",
  "- `example error`",
  "",
  'The tokens `is:resolved` and `user.username:"Jane Doe"` are standard search tokens because both use reserved keywords. The token `server:web-8` is pointing to a custom tag sent by the Sentry SDK. See [Custom Tags](/concepts/search/searchable-properties/#custom-tags) for more information on how to set tags.',
  "",
  "The token `example error` is utilizing the optional raw search and is passed as part of the issue search query (which uses a CONTAINS match similar to SQL). When using the optional raw search, you can provide _one_ string, and the query uses that entire string.",
  "",
  "### Comparison Operators",
  "Sentry search supports the use of comparison operators:",
  "",
  "- greater than (`>`)",
  "- less than (`<`)",
  "- greater than or equal to (`>=`)",
  "- less than or equal to (`<=`)",
  "",
  "Typically, when you search using properties that are numbers or durations, you should use comparison operators rather than just a colon (`:`) to find exact matches, since an exact match isn't likely to exist.",
  "",
  "Here are some examples of valid comparison operator searches:",
  "",
  "- `event.timestamp:>2023-09-28T00:00:00-07:00`",
  "- `count_dead_clicks:<=10`",
  "- `transaction.duration:>5s`",
  "",
  "### Using `OR` and `AND`",
  "",
  "Use `OR` and `AND` between tokens, and use parentheses `()` to group conditions. `AND` can also be used between non-aggregates and aggregates. However, `OR` cannot.",
  "",
  "- Non-aggregates filter data based on specific tags or attributes. For example, `user.username:jane` is a non-aggregate field.",
  "- Aggregates filter data on numerical scales. For example, `count()` is an aggregate function and `count():>100` is an aggregate filter.",
  "",
  "Some examples of using the `OR` condition:",
  "",
  "```",
  "# a valid `OR` query",
  "browser:Chrome OR browser:Opera",
  "```",
  "",
  "# an invalid `OR` query",
  "user.username:janedoe OR count():>100",
  "```",
  "",
  'Also, the queries prioritize `AND` before `OR`. For example, "x `AND` y `OR` z" is the same as "(x `AND` y) `OR` z". Parentheses can be used to change the grouping. For example, "x `AND` (y `OR` z)".',
  "",
  "### Multiple Values on the Same Key",
  "",
  'You can search multiple values for the same key by putting the values in a list. For example, "x:[value1, value2]" will find the the same results as "x:value1 `OR` x:value2". When you do this, the search returns issues/events that match any search term.',
  "",
  "An example of searching on the same key with a list of values:",
  "",
  "```",
  "release:[12.0, 13.0]",
  "```",
  "",
  "You can't use wildcards with this type of search.",
  "",
  "### Exclusion",
  "",
  "By default, search terms use the `AND` operator; that is, they return the intersection of issues/events that match all search terms.",
  "",
  "To change this, you can use the negation operator `!` to _exclude_ a search parameter.",
  "",
  "```",
  "is:unresolved !user.email:example@customer.com",
  "```",
  "",
  "In the example above, the search query returns all Issues that are unresolved _and_ have not affected the user with the email address `example@customer.com`.",
  "",
  "### Wildcards",
  "",
  "Search supports the wildcard operator `*` as a placeholder for specific characters and strings.",
  "",
  "```",
  'browser:"Safari 11*"',
  "```",
  "",
  'In the example above, the search query will match on `browser` values like `"Safari 11.0.2"`, `"Safari 11.0.3"`, etc.',
  "",
  "You may also combine operators like so:",
  "",
  "```",
  '!message:"*Timeout"',
  "```",
  "",
  "In the above example, the search query returns results which do not have message values like `ConnectionTimeout`, `ReadTimeout`, etc.",
].join("\n");

export const TOOL_DEFINITIONS = [
  {
    name: "list_organizations" as const,
    description: [
      "List all organizations that the user has access to in Sentry.",
      "",
      "Use this tool when you need to:",
      "- View all organizations in Sentry",
    ].join("\n"),
  },
  {
    name: "list_teams" as const,
    description: [
      "List all teams in an organization in Sentry.",
      "",
      "Use this tool when you need to:",
      "- View all teams in a Sentry organization",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
    },
  },
  {
    name: "list_projects" as const,
    description: [
      "Retrieve a list of projects in Sentry.",
      "",
      "Use this tool when you need to:",
      "- View all projects in a Sentry organization",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
    },
  },
  {
    name: "list_issues" as const,
    description: [
      "List all issues in Sentry.",
      "",
      "Use this tool when you need to:",
      "- View all issues in a Sentry organization",
      "",
      "If you're looking for more granular data beyond a summary of identified problems, you should use the `search_errors()` or `search_transactions()` tools instead.",
      "<examples>",
      "### Find the newest unresolved issues in the 'my-project' project",
      "",
      "```",
      "list_issues(organizationSlug='my-organization', projectSlug='my-project', query='is:unresolved', sortBy='last_seen')",
      "```",
      "",
      "### Find the most frequently occurring crashes in the 'my-project' project",
      "",
      "```",
      "list_issues(organizationSlug='my-organization', projectSlug='my-project', query='is:unresolved error.handled:false', sortBy='count')",
      "```",
      "",
      "### Find the oldest unresolved issues in the 'my-project' project",
      "",
      "```",
      "list_issues(organizationSlug='my-organization', projectSlug='my-project', query='is:unresolved', sortBy='first_seen')",
      "```",
      "</examples>",
      "",
      "<hints>",
      "If only one parameter is provided, and it could be either `organizationSlug` or `projectSlug`, its probably `organizationSlug`, but if you're really uncertain you should call `list_organizations()` first.",
      "</hints>",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      projectSlug: ParamProjectSlug.optional(),
      query: ParamQuery.optional(),
      sortBy: z
        .enum(["last_seen", "first_seen", "count", "userCount"])
        .describe(
          "Sort the results either by the last time they occurred, the first time they occurred, the count of occurrences, or the number of users affected.",
        )
        .optional(),
    },
  },
  {
    name: "get_issue_summary" as const,
    description: [
      "Retrieve a summary of an issue in Sentry.",
      "",
      "Use this tool when you need to:",
      "- View a summary of an issue in Sentry",
      "",
      "If the issue is an error, or you want additional information like the stacktrace, you should use `get_issue_details()` tool instead.",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      issueId: ParamIssueShortId.optional(),
      issueUrl: z.string().url().optional(),
    },
  },
  {
    name: "get_issue_details" as const,
    description: [
      "Retrieve issue details from Sentry for a specific Issue ID, including the stacktrace and error message if available. Either issueId or issueUrl MUST be provided.",
      "",
      "Use this tool when you need to:",
      "- Investigate a specific production error",
      "- Access detailed error information and stacktraces from Sentry",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      issueId: ParamIssueShortId.optional(),
      issueUrl: z
        .string()
        .url()
        .describe("The URL of the issue to retrieve details for.")
        .optional(),
    },
  },
  {
    name: "search_errors" as const,
    description: [
      "Query Sentry for errors using advanced search syntax.",
      "",
      "Use this tool when you need to:",
      "- Search for production errors in a specific file.",
      "- Analyze error patterns and frequencies.",
      "- Find recent or frequently occurring errors.",
      "",
      "<examples>",
      "### Find common errors within a file",
      "",
      "To find common errors within a file, you can use the `filename` parameter. This is a suffix based search, so only using the filename or the direct parent folder of the file. The parent folder is preferred when the filename is in a subfolder or a common filename. If you provide generic filenames like `index.js` you're going to end up finding errors that are might be from completely different projects.",
      "",
      "```",
      "search_errors(organizationSlug='my-organization', filename='index.js', sortBy='count')",
      "```",
      "",
      "### Find recent crashes from the 'peated' project",
      "",
      "```",
      "search_errors(organizationSlug='my-organization', query='is:unresolved error.handled:false', projectSlug='peated', sortBy='last_seen')",
      "```",
      "",
      "</examples>",
      "",
      "<query_syntax>",
      "Use the tool `help('query_syntax')` to get more information about the query syntax.",
      "",
      "There are some common query parameters that are useful for searching errors:",
      "",
      "- `is:unresolved` - Find unresolved errors",
      "- `error.handled:false` - Find errors that are not handled (otherwise known as uncaught exceptions or crashes)",
      "</query_syntax>",
      "",
      "<hints>",
      "If only one parameter is provided, and it could be either `organizationSlug` or `projectSlug`, its probably `organizationSlug`, but if you're really uncertain you should call `list_organizations()` first.",
      "</hints>",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      projectSlug: ParamProjectSlug.optional(),
      filename: z
        .string()
        .describe("The filename to search for errors in.")
        .optional(),
      transaction: ParamTransaction.optional(),
      query: ParamQuery.optional(),
      sortBy: z
        .enum(["last_seen", "count"])
        .optional()
        .default("last_seen")
        .describe(
          "Sort the results either by the last time they occurred or the count of occurrences.",
        ),
    },
  },
  {
    name: "search_transactions" as const,
    description: [
      "Query Sentry for transactions using advanced search syntax.",
      "",
      "Transactions are segments of traces that are associated with a specific route or endpoint.",
      "",
      "Use this tool when you need to:",
      "- Search for production transaction data to understand performance.",
      "- Analyze traces and latency patterns.",
      "- Find examples of recent requests to endpoints.",
      "",
      "<examples>",
      "### Find slow requests to a route",
      "",
      "...",
      "",
      "```",
      "search_transactions(organizationSlug='my-organization', transaction='/checkout', sortBy='latency')",
      "```",
      "",
      "</examples>",
      // "",
      // "<query_syntax>",
      // "Use the tool `help('query_syntax')` to get more information about the query syntax.",
      // "",
      // "There are some common query parameters that are useful for searching errors:",
      // "",
      // "- `is:unresolved` - Find unresolved errors",
      // "- `error.handled:false` - Find errors that are not handled (otherwise known as uncaught exceptions or crashes)",
      // "</query_syntax>",
      "",
      "<hints>",
      "If only one parameter is provided, and it could be either `organizationSlug` or `projectSlug`, its probably `organizationSlug`, but if you're really uncertain you might want to call `list_organizations()` first.",
      "</hints>",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      projectSlug: ParamProjectSlug.optional(),
      transaction: ParamTransaction.optional(),
      query: ParamQuery.optional(),
      sortBy: z
        .enum(["timestamp", "duration"])
        .optional()
        .default("timestamp")
        .describe(
          "Sort the results either by the timestamp of the request (most recent first) or the duration of the request (longest first).",
        ),
    },
  },
  {
    name: "create_team" as const,
    description: [
      "Create a new team in Sentry.",
      "",
      "Use this tool when you need to:",
      "- Create a new team in a Sentry organization",
      "",
      "<hints>",
      "- If any parameter is ambiguous, you should clarify with the user what they meant.",
      "</hints>",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      name: z.string().describe("The name of the team to create."),
    },
  },
  {
    name: "create_project" as const,
    description: [
      "Create a new project in Sentry, giving you access to a new SENTRY_DSN.",
      "",
      "Use this tool when you need to:",
      "- Create a new project in a Sentry organization",
      "",
      "<hints>",
      "- If any parameter is ambiguous, you should clarify with the user what they meant.",
      "</hints>",
    ].join("\n"),
    paramsSchema: {
      organizationSlug: ParamOrganizationSlug.optional(),
      teamSlug: ParamTeamSlug,
      name: z
        .string()
        .describe(
          "The name of the project to create. Typically this is commonly the name of the repository or service. It is only used as a visual label in Sentry.",
        ),
      platform: ParamPlatform.optional(),
    },
  },
  {
    name: "help" as const,
    description: [
      "Get information to help you better work with Sentry.",
      "",
      "Use this tool when you need to:",
      "- Understand the Sentry search syntax",
      "",
      "<examples>",
      "### Get help with the Sentry search syntax",
      "",
      "```",
      "help('query_syntax')",
      "```",
      "</examples>",
    ].join("\n"),
    paramsSchema: {
      subject: z
        .enum(["query_syntax"])
        .describe("The subject to get help with."),
    },
  },
];

export type ToolName = (typeof TOOL_DEFINITIONS)[number]["name"];

export type ToolDefinition<T extends ToolName> = Extract<
  (typeof TOOL_DEFINITIONS)[number],
  { name: T }
>;

type ZodifyRecord<T extends Record<string, any>> = {
  [K in keyof T]: z.infer<T[K]>;
};

export type ToolParams<T extends ToolName> = ToolDefinition<T> extends {
  paramsSchema: Record<string, any>;
}
  ? ZodifyRecord<ToolDefinition<T>["paramsSchema"]>
  : Record<string, never>;

export type ToolHandler<T extends ToolName> = (
  params: ToolParams<T>,
) => Promise<string>;

export type ToolHandlerExtended<T extends ToolName> = (
  context: ServerContext,
  params: ToolParams<T>,
  extra: RequestHandlerExtra,
) => Promise<string>;

export type ToolHandlers = {
  [K in ToolName]: ToolHandlerExtended<K>;
};

export const TOOL_HANDLERS = {
  list_organizations: async (context) => {
    const apiService = new SentryApiService(context.accessToken);
    const organizations = await apiService.listOrganizations();

    let output = "# Organizations\n\n";
    output += organizations.map((org) => `- ${org.slug}\n`).join("");

    return output;
  },
  list_teams: async (context, { organizationSlug }) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const teams = await apiService.listTeams(organizationSlug);

    let output = `# Teams in **${organizationSlug}**\n\n`;
    output += teams.map((team) => `- ${team.slug}\n`).join("");

    return output;
  },
  list_projects: async (context, { organizationSlug }) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const projects = await apiService.listProjects(organizationSlug);

    let output = `# Projects in **${organizationSlug}**\n\n`;
    output += projects.map((project) => `- ${project.slug}\n`).join("");

    return output;
  },
  list_issues: async (
    context,
    { organizationSlug, projectSlug, query, sortBy },
  ) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const sortByMap = {
      last_seen: "date" as const,
      first_seen: "new" as const,
      count: "freq" as const,
      userCount: "user" as const,
    };

    const issues = await apiService.listIssues({
      organizationSlug,
      projectSlug,
      query,
      sortBy: sortByMap[sortBy as keyof typeof sortByMap],
    });

    let output = `# Issues in **${organizationSlug}${projectSlug ? `/${projectSlug}` : ""}**\n\n`;
    output += issues
      .map((issue) =>
        [
          `## ${issue.shortId}`,
          "",
          `**Description**: ${issue.title}`,
          `**Culprit**: ${issue.culprit}`,
          `**First Seen**: ${new Date(issue.firstSeen).toISOString()}`,
          `**Last Seen**: ${new Date(issue.lastSeen).toISOString()}`,
          `**URL**: ${apiService.getIssueUrl(organizationSlug, issue.shortId)}`,
        ].join("\n"),
      )
      .join("\n");
    output += "\n\n";

    output += "# Using this information\n\n";
    output += `- You can reference the Issue ID in commit messages (e.g. \`Fixes <issueID>\`) to automatically close the issue when the commit is merged.\n`;
    output += `- You can get more details about a specific issue by using the tool: \`get_issue_details(${organizationSlug}, <issueID>)\`\n`;

    return output;
  },
  get_issue_summary: async (
    context,
    { issueId, issueUrl, organizationSlug },
  ) => {
    const apiService = new SentryApiService(context.accessToken);

    if (issueUrl) {
      const resolved = extractIssueId(issueUrl);
      if (!resolved) {
        throw new Error(
          "Invalid Sentry issue URL. Path should contain '/issues/{issue_id}'",
        );
      }
      organizationSlug = resolved.organizationSlug;
      issueId = resolved.issueId;
    } else if (!issueId) {
      throw new Error("Either issueId or issueUrl must be provided");
    }

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const issue = await apiService.getIssue({
      organizationSlug,
      issueId,
    });

    let output = `# ${issue.shortId}\n\n`;
    output += `**Description**: ${issue.title}\n`;
    output += `**Culprit**: ${issue.culprit}\n`;
    output += `**First Seen**: ${new Date(issue.firstSeen).toISOString()}\n`;
    output += `**Last Seen**: ${new Date(issue.lastSeen).toISOString()}\n`;
    output += `**Occurrences**: ${issue.count}\n`;
    output += `**Users Impacted**: ${issue.userCount}\n`;
    output += `**Status**: ${issue.status}\n`;
    output += `**Platform**: ${issue.platform}\n`;
    output += `**Project**: ${issue.project.name}\n`;
    output += `**URL**: ${apiService.getIssueUrl(
      organizationSlug,
      issue.shortId,
    )}\n`;

    return output;
  },
  get_issue_details: async (
    context,
    { issueId, issueUrl, organizationSlug },
  ) => {
    const apiService = new SentryApiService(context.accessToken);

    if (issueUrl) {
      const resolved = extractIssueId(issueUrl);
      if (!resolved) {
        throw new Error(
          "Invalid Sentry issue URL. Path should contain '/issues/{issue_id}'",
        );
      }
      organizationSlug = resolved.organizationSlug;
      issueId = resolved.issueId;
    } else if (!issueId) {
      throw new Error("Either issueId or issueUrl must be provided");
    }

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const [issue, event] = await Promise.all([
      apiService.getIssue({
        organizationSlug,
        issueId: issueId!,
      }),
      apiService.getLatestEventForIssue({
        organizationSlug,
        issueId: issueId!,
      }),
    ]);

    let output = `# ${issue.shortId}\n\n`;
    output += `**Description**: ${issue.title}\n`;
    output += `**Culprit**: ${issue.culprit}\n`;
    output += `**First Seen**: ${new Date(issue.firstSeen).toISOString()}\n`;
    output += `**Last Seen**: ${new Date(issue.lastSeen).toISOString()}\n`;
    output += `**URL**: ${apiService.getIssueUrl(
      organizationSlug,
      issue.shortId,
    )}\n`;

    output += "\n";

    output += "## Event Specifics\n\n";
    output += `**Occurred At**: ${new Date(event.dateCreated).toISOString()}\n`;
    if (event.message) {
      output += `**Message**:\n${event.message}\n`;
    }

    output += formatEventOutput(event);

    output += "# Using this information\n\n";
    output += `- You can reference the IssueID in commit messages (e.g. \`Fixes ${issueId}\`) to automatically close the issue when the commit is merged.\n`;
    output +=
      "- The stacktrace includes both first-party application code as well as third-party code, its important to triage to first-party code.\n";

    return output;
  },

  search_errors: async (
    context,
    { filename, transaction, query, sortBy, organizationSlug, projectSlug },
  ) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const eventList = await apiService.searchErrors({
      organizationSlug,
      projectSlug,
      filename,
      query,
      transaction,
      sortBy,
    });

    let output = `# Errors in **${organizationSlug}${projectSlug ? `/${projectSlug}` : ""}**\n\n`;
    if (query) output += `These errors match the query \`${query}\`\n`;
    if (filename)
      output += `These errors are limited to the file suffix \`${filename}\`\n`;
    output += "\n";

    if (eventList.length === 0) {
      output += `No results found\n\n`;
      output += `We searched within the ${organizationSlug} organization.\n\n`;
      output += `You may want to consult the \`help\` tool if you think your search syntax might be wrong.\n`;
      return output;
    }

    for (const eventSummary of eventList) {
      output += `## ${eventSummary.issue}\n\n`;
      output += `**Description**: ${eventSummary.title}\n`;
      output += `**Issue ID**: ${eventSummary.issue}\n`;
      output += `**URL**: ${apiService.getIssueUrl(
        organizationSlug,
        eventSummary.issue,
      )}\n`;
      output += `**Project**: ${eventSummary.project}\n`;
      output += `**Last Seen**: ${eventSummary["last_seen()"]}\n`;
      output += `**Occurrences**: ${eventSummary["count()"]}\n\n`;
    }

    output += "# Using this information\n\n";
    output += `- You can reference the Issue ID in commit messages (e.g. \`Fixes <issueID>\`) to automatically close the issue when the commit is merged.\n`;
    output += `- You can get more details about an error by using the tool: \`get_issue_details(${organizationSlug}, <issueID>)\`\n`;

    return output;
  },

  search_transactions: async (
    context,
    { transaction, query, sortBy, organizationSlug, projectSlug },
  ) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const eventList = await apiService.searchSpans({
      organizationSlug,
      projectSlug,
      transaction,
      query,
      sortBy,
    });

    let output = `# Transactions in **${organizationSlug}${projectSlug ? `/${projectSlug}` : ""}**\n\n`;
    if (query) output += `These spans match the query \`${query}\`\n`;
    if (transaction)
      output += `These spans are limited to the transaction \`${transaction}\`\n`;
    output += "\n";

    if (eventList.length === 0) {
      output += `No results found\n\n`;
      output += `We searched within the ${organizationSlug} organization.\n\n`;
      output += `You may want to consult the \`help\` tool if you think your search syntax might be wrong.\n`;
      return output;
    }

    for (const eventSummary of eventList) {
      output += `## ${eventSummary.transaction}\n\n`;
      output += `**Span ID**: ${eventSummary.id}\n`;
      output += `**Trace ID**: ${eventSummary.trace}\n`;
      output += `**Span Operation**: ${eventSummary["span.op"]}\n`;
      output += `**Span Description**: ${eventSummary["span.description"]}\n`;
      output += `**Duration**: ${eventSummary["span.duration"]}\n`;
      output += `**Timestamp**: ${eventSummary.timestamp}\n`;
      output += `**Project**: ${eventSummary.project}\n`;
      output += `**URL**: ${apiService.getTraceUrl(
        organizationSlug,
        eventSummary.trace,
      )}\n\n`;
    }

    // output += "# Using this information\n\n";
    // output += `- You can get more details about this error by using the "get_trace_details" tool.\n`;

    return output;
  },

  create_team: async (context, { organizationSlug, name }) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const team = await apiService.createTeam({
      organizationSlug,
      name,
    });

    let output = "# New Team\n\n";
    output += `**ID**: ${team.id}\n`;
    output += `**Slug**: ${team.slug}\n`;
    output += `**Name**: ${team.name}\n`;

    output += "# Using this information\n\n";
    output += `- You should always inform the user of the Team Slug value.\n`;
    return output;
  },

  create_project: async (
    context,
    { organizationSlug, teamSlug, name, platform },
  ) => {
    const apiService = new SentryApiService(context.accessToken);

    if (!organizationSlug && context.organizationSlug) {
      organizationSlug = context.organizationSlug;
    }

    if (!organizationSlug) {
      throw new Error("Organization slug is required");
    }

    const [project, clientKey] = await apiService.createProject({
      organizationSlug,
      teamSlug,
      name,
      platform,
    });

    let output = "# New Project\n\n";
    output += `**ID**: ${project.id}\n`;
    output += `**Slug**: ${project.slug}\n`;
    output += `**Name**: ${project.name}\n`;

    if (clientKey) {
      output += `**SENTRY_DSN**: ${clientKey?.dsn.public}\n\n`;
    } else {
      output += "**SENTRY_DSN**: There was an error fetching this value.\n\n";
    }

    output += "# Using this information\n\n";
    output += `- You can reference the **SENTRY_DSN** value to initialize Sentry's SDKs.\n`;
    output += `- You should always inform the user of the **SENTRY_DSN** and Project Slug values.\n`;

    return output;
  },

  help: async (context, { subject }) => {
    if (subject === "query_syntax") {
      return QUERY_SYNTAX;
    }

    return "Unknown subject";
  },
} satisfies ToolHandlers;
