import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const restHandlers = [
  http.get("https://sentry.io/api/0/organizations/", () => {
    return HttpResponse.json([
      {
        id: "4509106740723712",
        slug: "sentry-mcp-evals",
        name: "sentry-mcp-evals",
      },
    ]);
  }),
  http.get(
    "https://sentry.io/api/0/organizations/sentry-mcp-evals/teams/",
    () => {
      return HttpResponse.json([
        {
          id: "4509106740854784",
          slug: "sentry-mcp-evals",
          name: "sentry-mcp-evals",
          dateCreated: "2025-04-06T14:11:23.961739Z",
          isMember: true,
          teamRole: "admin",
          flags: { "idp:provisioned": false },
          access: [
            "team:read",
            "alerts:read",
            "event:write",
            "team:write",
            "team:admin",
            "event:read",
            "org:read",
            "member:read",
            "project:admin",
            "project:write",
            "org:integrations",
            "project:releases",
            "alerts:write",
            "event:admin",
            "project:read",
          ],
          hasAccess: true,
          isPending: false,
          memberCount: 1,
          avatar: { avatarType: "letter_avatar", avatarUuid: null },
          externalTeams: [],
          projects: [],
        },
      ]);
    },
  ),
  http.get(
    "https://sentry.io/api/0/organizations/sentry-mcp-evals/projects/",
    () => {
      return HttpResponse.json([
        {
          team: {
            id: "4509106733776896",
            slug: "sentry-mcp-evals",
            name: "sentry-mcp-evals",
          },
          teams: [
            {
              id: "4509106733776896",
              slug: "sentry-mcp-evals",
              name: "sentry-mcp-evals",
            },
          ],
          id: "4509106749636608",
          name: "test-suite",
          slug: "test-suite",
          isBookmarked: false,
          isMember: true,
          access: [
            "event:admin",
            "alerts:read",
            "project:write",
            "org:integrations",
            "alerts:write",
            "member:read",
            "team:write",
            "project:read",
            "event:read",
            "event:write",
            "project:admin",
            "org:read",
            "team:admin",
            "project:releases",
            "team:read",
          ],
          hasAccess: true,
          dateCreated: "2025-04-06T14:13:37.825970Z",
          environments: [],
          eventProcessing: { symbolicationDegraded: false },
          features: [
            "discard-groups",
            "alert-filters",
            "similarity-embeddings",
            "similarity-indexing",
            "similarity-view",
          ],
          firstEvent: null,
          firstTransactionEvent: false,
          hasSessions: false,
          hasProfiles: false,
          hasReplays: false,
          hasFeedbacks: false,
          hasNewFeedbacks: false,
          hasMonitors: false,
          hasMinifiedStackTrace: false,
          hasInsightsHttp: false,
          hasInsightsDb: false,
          hasInsightsAssets: false,
          hasInsightsAppStart: false,
          hasInsightsScreenLoad: false,
          hasInsightsVitals: false,
          hasInsightsCaches: false,
          hasInsightsQueues: false,
          hasInsightsLlmMonitoring: false,
          platform: "node",
          platforms: [],
          latestRelease: null,
          hasUserReports: false,
          hasFlags: false,
          latestDeploys: null,
        },
      ]);
    },
  ),
];

export const mswServer = setupServer(...restHandlers);
