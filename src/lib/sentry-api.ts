import { z } from "zod";
import { logError } from "./logging";

const API_BASE_URL = new URL(
  "/api/0",
  process.env.SENTRY_URL || "https://sentry.io",
);

export const SentryOrgSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export const SentryTeamSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export const SentryProjectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export const SentryClientKeySchema = z.object({
  id: z.string(),
  dsn: z.object({
    public: z.string(),
  }),
});

export const SentryIssueSchema = z.object({
  id: z.string(),
  shortId: z.string(),
  title: z.string(),
  lastSeen: z.string().datetime(),
  count: z.number(),
  permalink: z.string().url(),
});

// XXX: Sentry's schema generally speaking is "assume all user input is missing"
// so we need to handle effectively every field being optional or nullable.
const ExceptionInterface = z
  .object({
    mechanism: z
      .object({
        type: z.string().nullable(),
        handled: z.boolean().nullable(),
      })
      .partial(),
    type: z.string().nullable(),
    value: z.string().nullable(),
    stacktrace: z.object({
      frames: z.array(
        z
          .object({
            filename: z.string().nullable(),
            function: z.string().nullable(),
            lineNo: z.number().nullable(),
            colNo: z.number().nullable(),
            absPath: z.string().nullable(),
            module: z.string().nullable(),
            // lineno, source code
            context: z.array(z.tuple([z.number(), z.string()])),
          })
          .partial(),
      ),
    }),
  })
  .partial();

export const SentryErrorEntrySchema = z.object({
  // XXX: Sentry can return either of these. Not sure why we never normalized it.
  values: z.array(ExceptionInterface.optional()),
  value: ExceptionInterface.nullable().optional(),
});

export const SentryEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  dateCreated: z.string().datetime(),
  culprit: z.string().nullable(),
  entries: z.array(
    z.union([
      // TODO: there are other types
      z.object({
        type: z.literal("exception"),
        data: SentryErrorEntrySchema,
      }),
      z.object({
        type: z.string(),
        data: z.unknown(),
      }),
    ]),
  ),
});

// https://us.sentry.io/api/0/organizations/sentry/events/?dataset=errors&field=issue&field=title&field=project&field=timestamp&field=trace&per_page=5&query=event.type%3Aerror&referrer=sentry-mcp&sort=-timestamp&statsPeriod=1w
export const SentryDiscoverEventSchema = z.object({
  issue: z.string(),
  "issue.id": z.union([z.string(), z.number()]),
  project: z.string(),
  title: z.string(),
  "count()": z.number(),
  "last_seen()": z.string(),
});

/**
 * Extracts the Sentry issue ID and organization slug from a full URL
 *
 * @param url - A full Sentry issue URL
 * @returns Object containing the numeric issue ID and organization slug (if found)
 * @throws Error if the input is invalid
 */
export function extractIssueId(url: string): {
  issueId: string;
  organizationSlug: string;
} {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      "Invalid Sentry issue URL. Must start with http:// or https://",
    );
  }

  const parsedUrl = new URL(url);

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2 || !pathParts.includes("issues")) {
    throw new Error(
      "Invalid Sentry issue URL. Path must contain '/issues/{issue_id}'",
    );
  }

  const issueId = pathParts[pathParts.indexOf("issues") + 1];
  if (!issueId || !/^\d+$/.test(issueId)) {
    throw new Error("Invalid Sentry issue ID. Must be a numeric value.");
  }

  // Extract organization slug from either the path or subdomain
  let organizationSlug: string | undefined;
  if (pathParts.includes("organizations")) {
    organizationSlug = pathParts[pathParts.indexOf("organizations") + 1];
  } else if (pathParts.length > 1 && pathParts[0] !== "issues") {
    // If URL is like sentry.io/sentry/issues/123
    organizationSlug = pathParts[0];
  } else {
    // Check for subdomain
    const hostParts = parsedUrl.hostname.split(".");
    if (hostParts.length > 2 && hostParts[0] !== "www") {
      organizationSlug = hostParts[0];
    }
  }

  if (!organizationSlug) {
    throw new Error(
      "Invalid Sentry issue URL. Could not determine organization.",
    );
  }

  return { issueId, organizationSlug };
}

export class SentryApiService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    console.log(`[sentryApi] ${options.method || "GET"} ${API_BASE_URL}${url}`);
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    return response;
  }

  getIssueUrl(organizationSlug: string, issueId: string): string {
    return process.env.SENTRY_URL
      ? `${process.env.SENTRY_URL}/organizations/${organizationSlug}/issues/${issueId}`
      : `https://${organizationSlug}.sentry.io"}/issues/${issueId}`;
  }

  async listOrganizations(): Promise<z.infer<typeof SentryOrgSchema>[]> {
    const response = await this.request("/organizations/");

    const orgsBody = await response.json<{ id: string; slug: string }[]>();
    return orgsBody.map((i) => SentryOrgSchema.parse(i));
  }

  async listTeams(
    organizationSlug: string,
  ): Promise<z.infer<typeof SentryTeamSchema>[]> {
    const response = await this.request(
      `/organizations/${organizationSlug}/teams/`,
    );

    const teamsBody = await response.json<{ id: string; slug: string }[]>();
    return teamsBody.map((i) => SentryTeamSchema.parse(i));
  }

  async createTeam({
    organizationSlug,
    name,
  }: {
    organizationSlug: string;
    name: string;
  }): Promise<z.infer<typeof SentryTeamSchema>> {
    const response = await this.request(
      `/organizations/${organizationSlug}/teams/`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
    );

    return SentryTeamSchema.parse(await response.json());
  }

  async listProjects(
    organizationSlug: string,
  ): Promise<z.infer<typeof SentryProjectSchema>[]> {
    const response = await this.request(
      `/organizations/${organizationSlug}/projects/`,
    );

    const projectsBody = await response.json<{ id: string; slug: string }[]>();
    return projectsBody.map((i) => SentryProjectSchema.parse(i));
  }

  async createProject({
    organizationSlug,
    teamSlug,
    name,
    platform,
  }: {
    organizationSlug: string;
    teamSlug: string;
    name: string;
    platform?: string;
  }): Promise<
    [
      z.infer<typeof SentryProjectSchema>,
      z.infer<typeof SentryClientKeySchema> | null,
    ]
  > {
    const response = await this.request(
      `/teams/${organizationSlug}/${teamSlug}/projects/`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          platform,
        }),
      },
    );
    const project = SentryProjectSchema.parse(await response.json());

    try {
      const keysResponse = await this.request(
        `/projects/${organizationSlug}/${project.slug}/keys/`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "Default",
          }),
        },
      );
      const clientKey = SentryClientKeySchema.parse(await keysResponse.json());
      return [project, clientKey];
    } catch (err) {
      logError(err);
    }
    return [project, null];
  }

  async getLatestEventForIssue({
    organizationSlug,
    issueId,
  }: {
    organizationSlug: string;
    issueId: string;
  }): Promise<z.infer<typeof SentryEventSchema>> {
    const response = await this.request(
      `/organizations/${organizationSlug}/issues/${issueId}/events/latest/`,
    );

    const body = await response.json();
    return SentryEventSchema.parse(body);
  }

  async searchEvents({
    dataset,
    organizationSlug,
    projectSlug,
    filename,
    query,
    sortBy = "last_seen",
  }: {
    dataset: "errors" | "transactions";
    organizationSlug: string;
    projectSlug?: string;
    filename?: string;
    query?: string;
    sortBy?: "last_seen" | "count";
  }): Promise<z.infer<typeof SentryDiscoverEventSchema>[]> {
    const sentryQuery: string[] = [];
    if (filename) {
      sentryQuery.push(`stack.filename:"*${filename.replace(/"/g, '\\"')}"`);
    }
    if (query) {
      sentryQuery.push(query);
    }
    if (projectSlug) {
      sentryQuery.push(`project:${projectSlug}`);
    }

    const queryParams = new URLSearchParams();
    queryParams.set("dataset", dataset);
    queryParams.set("per_page", "10");
    queryParams.set("referrer", "sentry-mcp");
    queryParams.set(
      "sort",
      `-${sortBy === "last_seen" ? "last_seen" : "count"}`,
    );
    queryParams.set("statsPeriod", "1w");
    queryParams.append("field", "issue");
    queryParams.append("field", "title");
    queryParams.append("field", "project");
    queryParams.append("field", "last_seen()");
    queryParams.append("field", "count()");
    queryParams.set("query", sentryQuery.join(" "));
    // if (projectSlug) queryParams.set("project", projectSlug);

    const apiUrl = `/organizations/${organizationSlug}/events/?${queryParams.toString()}`;

    const response = await this.request(apiUrl);

    const listBody = await response.json<{ data: unknown[] }>();
    return listBody.data.map((i) => SentryDiscoverEventSchema.parse(i));
  }
}
