import { describe, it, expect } from "vitest";
import { extractIssueId, SentryApiService } from "./sentry-api";

describe("extractIssueId", () => {
  it("should extract issue ID from a full Sentry URL", () => {
    expect(
      extractIssueId("https://sentry.sentry.io/issues/1234"),
    ).toMatchInlineSnapshot(`
      {
        "issueId": "1234",
        "organizationSlug": "sentry",
      }
    `);
  });

  it("should extract issue ID from a Sentry URL with organization in path", () => {
    expect(
      extractIssueId("https://sentry.io/sentry/issues/123"),
    ).toMatchInlineSnapshot(`
      {
        "issueId": "123",
        "organizationSlug": "sentry",
      }
    `);
  });

  it("should extract issue ID and org slug from URL with organizations path", () => {
    expect(
      extractIssueId("https://sentry.io/organizations/my-org/issues/123"),
    ).toMatchInlineSnapshot(`
      {
        "issueId": "123",
        "organizationSlug": "my-org",
      }
    `);
  });

  it("should extract issue ID and org slug from subdomain URL", () => {
    expect(extractIssueId("https://my-team.sentry.io/issues/123")).toEqual({
      issueId: "123",
      organizationSlug: "my-team",
    });
  });

  it("should extract issue ID and org slug from self-hosted Sentry with subdomain", () => {
    expect(
      extractIssueId("https://sentry.mycompany.com/issues/123"),
    ).toMatchInlineSnapshot(`
      {
        "issueId": "123",
        "organizationSlug": "sentry",
      }
    `);
  });

  it("should extract issue ID and org slug from self-hosted Sentry with organization path", () => {
    expect(
      extractIssueId("https://mycompany.com/my-team/issues/123"),
    ).toMatchInlineSnapshot(`
      {
        "issueId": "123",
        "organizationSlug": "my-team",
      }
    `);
  });

  it("should throw error for empty input", () => {
    expect(() => extractIssueId("")).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid Sentry issue URL. Must start with http:// or https://]`,
    );
  });

  it("should throw error for invalid URL path", () => {
    expect(() =>
      extractIssueId("https://sentry.sentry.io/projects/123"),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid Sentry issue URL. Path must contain '/issues/{issue_id}']`,
    );
  });

  it("should throw error for non-numeric issue ID in URL", () => {
    expect(() =>
      extractIssueId("https://sentry.sentry.io/issues/abc"),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid Sentry issue ID. Must be a numeric value.]`,
    );
  });

  it("should throw error for non-numeric standalone ID", () => {
    expect(() => extractIssueId("abc")).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid Sentry issue URL. Must start with http:// or https://]`,
    );
  });
});

describe("SentryApiService", () => {
  describe("getIssueUrl", () => {
    it("should work with sentry.io", () => {
      const apiService = new SentryApiService(null, "sentry.io");
      const result = apiService.getIssueUrl("sentry-mcp", "123456");
      expect(result).toMatchInlineSnapshot(
        `"https://sentry-mcp.sentry.io/issues/123456"`,
      );
    });
    it("should work with self-hosted", () => {
      const apiService = new SentryApiService(null, "sentry.example.com");
      const result = apiService.getIssueUrl("sentry-mcp", "123456");
      expect(result).toMatchInlineSnapshot(
        `"https://sentry.example.com/organizations/sentry-mcp/issues/123456"`,
      );
    });
  });

  describe("listOrganizations", () => {
    it("serializes", async () => {
      const apiService = new SentryApiService("access-token", "sentry.io");
      const result = await apiService.listOrganizations();
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "id": "4509106740723712",
            "name": "sentry-mcp-evals",
            "slug": "sentry-mcp-evals",
          },
        ]
      `);
    });
  });

  describe("listTeams", () => {
    it("serializes", async () => {
      const apiService = new SentryApiService("access-token", "sentry.io");
      const result = await apiService.listTeams("sentry-mcp-evals");
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "id": "4509106740854784",
            "name": "sentry-mcp-evals",
            "slug": "sentry-mcp-evals",
          },
        ]
      `);
    });
  });

  describe("listProjects", () => {
    it("serializes", async () => {
      const apiService = new SentryApiService("access-token", "sentry.io");
      const result = await apiService.listProjects("sentry-mcp-evals");
      expect(result).toMatchInlineSnapshot(`
        [
          {
            "id": "4509106749636608",
            "name": "test-suite",
            "slug": "test-suite",
          },
        ]
      `);
    });
  });
});
