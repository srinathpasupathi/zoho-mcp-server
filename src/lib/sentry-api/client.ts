import type { z } from "zod";
import { logError } from "../logging";
import {
  SentryClientKeySchema,
  SentryEventSchema,
  type SentryEventsResponseSchema,
  SentryIssueSchema,
  SentryOrgSchema,
  SentryProjectSchema,
  SentrySearchErrorsEventSchema,
  SentrySearchSpansEventSchema,
  SentryTeamSchema,
} from "./schema";

export class SentryApiService {
  private accessToken: string | null;
  protected host: string;
  protected apiPrefix: string;

  constructor(
    accessToken: string | null = null,
    host = process.env.SENTRY_HOST,
  ) {
    this.accessToken = accessToken;
    this.host = host || "sentry.io";
    this.apiPrefix = new URL("/api/0", `https://${this.host}`).href;
  }

  private async request(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const url = `${this.apiPrefix}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    console.log(`[sentryApi] ${options.method || "GET"} ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
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
    return this.host !== "sentry.io"
      ? `https://${this.host}/organizations/${organizationSlug}/issues/${issueId}`
      : `https://${organizationSlug}.${this.host}/issues/${issueId}`;
  }

  getTraceUrl(organizationSlug: string, traceId: string): string {
    return this.host !== "sentry.io"
      ? `https://${this.host}/organizations/${organizationSlug}/explore/traces/trace/${traceId}`
      : `https://${organizationSlug}.${this.host}/explore/traces/trace/${traceId}`;
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

  async listIssues({
    organizationSlug,
    projectSlug,
    query,
    sortBy,
  }: {
    organizationSlug: string;
    projectSlug?: string;
    query?: string;
    sortBy?: "user" | "freq" | "date" | "new";
  }): Promise<z.infer<typeof SentryIssueSchema>[]> {
    const sentryQuery: string[] = [];
    if (query) {
      sentryQuery.push(query);
    }
    if (projectSlug) {
      sentryQuery.push(`project:${projectSlug}`);
    }

    const queryParams = new URLSearchParams();
    queryParams.set("per_page", "10");
    queryParams.set("referrer", "sentry-mcp");
    if (sortBy) queryParams.set("sort", sortBy);
    queryParams.set("statsPeriod", "1w");
    queryParams.set("query", sentryQuery.join(" "));

    queryParams.append("collapse", "stats");
    queryParams.append("collapse", "unhandled");

    const apiUrl = `/organizations/${organizationSlug}/issues/?${queryParams.toString()}`;

    const response = await this.request(apiUrl);

    const body = await response.json<unknown[]>();
    return body.map((i) => SentryIssueSchema.parse(i));
  }

  async getIssue({
    organizationSlug,
    issueId,
  }: {
    organizationSlug: string;
    issueId: string;
  }): Promise<z.infer<typeof SentryIssueSchema>> {
    const response = await this.request(
      `/organizations/${organizationSlug}/issues/${issueId}/`,
    );

    const body = await response.json();
    return SentryIssueSchema.parse(body);
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

  // TODO: Sentry is not yet exposing a reasonable API to fetch trace data
  // async getTrace({
  //   organizationSlug,
  //   traceId,
  // }: {
  //   organizationSlug: string;
  //   traceId: string;
  // }): Promise<z.infer<typeof SentryIssueSchema>> {
  //   const response = await this.request(
  //     `/organizations/${organizationSlug}/issues/${traceId}/`,
  //   );

  //   const body = await response.json();
  //   return SentryIssueSchema.parse(body);
  // }

  async searchErrors({
    organizationSlug,
    projectSlug,
    filename,
    transaction,
    query,
    sortBy = "last_seen",
  }: {
    organizationSlug: string;
    projectSlug?: string;
    filename?: string;
    transaction?: string;
    query?: string;
    sortBy?: "last_seen" | "count";
  }): Promise<z.infer<typeof SentrySearchErrorsEventSchema>[]> {
    const sentryQuery: string[] = [];
    if (filename) {
      sentryQuery.push(`stack.filename:"*${filename.replace(/"/g, '\\"')}"`);
    }
    if (transaction) {
      sentryQuery.push(`transaction:"${transaction.replace(/"/g, '\\"')}"`);
    }
    if (query) {
      sentryQuery.push(query);
    }
    if (projectSlug) {
      sentryQuery.push(`project:${projectSlug}`);
    }

    const queryParams = new URLSearchParams();
    queryParams.set("dataset", "errors");
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

    const listBody =
      await response.json<z.infer<typeof SentryEventsResponseSchema>>();
    return listBody.data.map((i) => SentrySearchErrorsEventSchema.parse(i));
  }

  async searchSpans({
    organizationSlug,
    projectSlug,
    transaction,
    query,
    sortBy = "timestamp",
  }: {
    organizationSlug: string;
    projectSlug?: string;
    transaction?: string;
    query?: string;
    sortBy?: "timestamp" | "duration";
  }): Promise<z.infer<typeof SentrySearchSpansEventSchema>[]> {
    const sentryQuery: string[] = ["is_transaction:true"];
    if (transaction) {
      sentryQuery.push(`transaction:"${transaction.replace(/"/g, '\\"')}"`);
    }
    if (query) {
      sentryQuery.push(query);
    }
    if (projectSlug) {
      sentryQuery.push(`project:${projectSlug}`);
    }

    const queryParams = new URLSearchParams();
    queryParams.set("dataset", "spans");
    queryParams.set("per_page", "10");
    queryParams.set("referrer", "sentry-mcp");
    queryParams.set(
      "sort",
      `-${sortBy === "timestamp" ? "timestamp" : "span.duration"}`,
    );
    queryParams.set("allowAggregateConditions", "0");
    queryParams.set("useRpc", "1");
    queryParams.append("field", "id");
    queryParams.append("field", "trace");
    queryParams.append("field", "span.op");
    queryParams.append("field", "span.description");
    queryParams.append("field", "span.duration");
    queryParams.append("field", "transaction");
    queryParams.append("field", "project");
    queryParams.append("field", "timestamp");
    queryParams.set("query", sentryQuery.join(" "));
    // if (projectSlug) queryParams.set("project", projectSlug);

    const apiUrl = `/organizations/${organizationSlug}/events/?${queryParams.toString()}`;

    const response = await this.request(apiUrl);

    const listBody =
      await response.json<z.infer<typeof SentryEventsResponseSchema>>();
    return listBody.data.map((i) => SentrySearchSpansEventSchema.parse(i));
  }
}
