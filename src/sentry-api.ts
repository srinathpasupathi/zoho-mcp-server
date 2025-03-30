import { SentryDiscoverEventSchema, SentryEventSchema, SentryOrgSchema } from "./schema";

const API_BASE_URL = "https://sentry.io/api/0";

export class SentryApiService {
  private accessToken: string;
  private organizationSlug: string;

  constructor(accessToken: string, organizationSlug = "sentry") {
    this.accessToken = accessToken;
    this.organizationSlug = organizationSlug;
  }

  async getOrganizations(): Promise<ReturnType<typeof SentryOrgSchema.parse>[]> {
    const response = await fetch(`${API_BASE_URL}/organizations/`, {
      method: "GET",
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

    const orgsBody = await response.json<{ id: string; slug: string }[]>();
    return orgsBody.map((i) => SentryOrgSchema.parse(i));
  }

  async getLatestEvent(issueId: string): Promise<ReturnType<typeof SentryEventSchema.parse>> {
    const response = await fetch(
      `${API_BASE_URL}/organizations/${this.organizationSlug}/issues/${issueId}/events/latest/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    return SentryEventSchema.parse(await response.json());
  }

  async searchErrorsInFile(
    filename: string,
    sortBy: "last_seen" | "frequency" = "last_seen",
  ): Promise<ReturnType<typeof SentryDiscoverEventSchema.parse>[]> {
    const query = `stack.filename:"*${filename.replace(/"/g, '\\"')}"`;
    const limit = 10;

    const apiUrl = `${API_BASE_URL}/organizations/${this.organizationSlug}/events/?dataset=errors&field=issue&field=title&field=project&field=${sortBy === "last_seen" ? "last_seen" : "count"}%28%29&per_page=${limit}&query=${encodeURIComponent(query)}&referrer=sentry-mcp&sort=-${sortBy === "last_seen" ? "last_seen" : "count"}&statsPeriod=1w`;

    const response = await fetch(apiUrl, {
      method: "GET",
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

    const listBody = await response.json<{ data: unknown[] }>();
    return listBody.data.map((i) => SentryDiscoverEventSchema.parse(i));
  }
}
