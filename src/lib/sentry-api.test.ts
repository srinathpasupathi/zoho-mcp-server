import { describe, it, expect } from "vitest";
import { extractIssueId } from "./sentry-api";

describe("extractIssueId", () => {
  it("should extract issue ID from a full Sentry URL", () => {
    expect(extractIssueId("https://sentry.sentry.io/issues/1234")).toBe("1234");
  });

  it("should extract issue ID from a Sentry URL with organization", () => {
    expect(extractIssueId("https://sentry.io/sentry/issues/123")).toBe("123");
  });

  it("should throw error for empty input", () => {
    expect(() => extractIssueId("")).toThrow("Missing issue_id_or_url argument");
  });

  it("should throw error for invalid URL path", () => {
    expect(() => extractIssueId("https://sentry.sentry.io/projects/123")).toThrow(
      "Invalid Sentry issue URL. Path must contain '/issues/{issue_id}'",
    );
  });

  it("should throw error for non-numeric issue ID in URL", () => {
    expect(() => extractIssueId("https://sentry.sentry.io/issues/abc")).toThrow(
      "Invalid Sentry issue ID. Must be a numeric value.",
    );
  });

  it("should throw error for non-numeric standalone ID", () => {
    expect(() => extractIssueId("abc")).toThrow(
      "Invalid Sentry issue ID. Must be a numeric value.",
    );
  });
});
