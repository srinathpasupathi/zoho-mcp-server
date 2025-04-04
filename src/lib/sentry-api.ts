import type { z } from "zod";
import {
  SentryClientKeySchema,
  SentryDiscoverEventSchema,
  SentryEventSchema,
  SentryOrgSchema,
  SentryProjectSchema,
  SentryTeamSchema,
} from "../schema";
import { logError } from "./logging";

const API_BASE_URL = "https://sentry.io/api/0";

export class SentryApiService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(url: string, options: RequestInit = {}): Promise<Response> {
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

  async listOrganizations(): Promise<z.infer<typeof SentryOrgSchema>[]> {
    const response = await this.request("/organizations/");

    const orgsBody = await response.json<{ id: string; slug: string }[]>();
    return orgsBody.map((i) => SentryOrgSchema.parse(i));
  }

  async listTeams(organizationSlug: string): Promise<z.infer<typeof SentryTeamSchema>[]> {
    const response = await this.request(`/organizations/${organizationSlug}/teams/`);

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
    const response = await this.request(`/organizations/${organizationSlug}/teams/`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    return SentryTeamSchema.parse(await response.json());
  }

  async listProjects(organizationSlug: string): Promise<z.infer<typeof SentryProjectSchema>[]> {
    const response = await this.request(`/organizations/${organizationSlug}/projects/`);

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
  }): Promise<[z.infer<typeof SentryProjectSchema>, z.infer<typeof SentryClientKeySchema> | null]> {
    const response = await this.request(`/teams/${organizationSlug}/${teamSlug}/projects/`, {
      method: "POST",
      body: JSON.stringify({
        name,
        platform,
      }),
    });
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

    return SentryEventSchema.parse(await response.json());
  }

  async searchErrors({
    organizationSlug,
    filename,
    projectSlug,
    sortBy = "last_seen",
  }: {
    organizationSlug: string;
    filename?: string;
    projectSlug?: string;
    sortBy?: "last_seen" | "count";
  }): Promise<z.infer<typeof SentryDiscoverEventSchema>[]> {
    const query = new URLSearchParams([
      ["dataset", "errors"],
      ["per_page", "10"],
      // TODO: https://github.com/getsentry/sentry-mcp/issues/19
      ["project", projectSlug ?? ""],
      ["query", filename ? `stack.filename:"*${filename.replace(/"/g, '\\"')}"` : ""],
      ["referrer", "sentry-mcp"],
      ["sort", `-${sortBy === "last_seen" ? "last_seen" : "count"}`],
      ["statsPeriod", "1w"],
      ...["issue", "title", "project", "last_seen()", "count()"].map<[string, string]>((n) => [
        "field",
        n,
      ]),
    ]);

    const apiUrl = `/organizations/${organizationSlug}/events/?${query.toString()}`;

    const response = await this.request(apiUrl);

    const listBody = await response.json<{ data: unknown[] }>();
    return listBody.data.map((i) => SentryDiscoverEventSchema.parse(i));
  }
}
