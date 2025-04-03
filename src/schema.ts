import { z } from "zod";

export const ParamOrganizationSlug = z
  .string()
  .describe("The organization's slug. This will default to the first org you have access to.");

export const ParamTeamSlug = z
  .string()
  .describe("The team's slug. This will default to the first team you have access to.");

export const ParamIssueShortId = z.string().describe("The Issue ID. e.g. `PROJECT-1Z43`");

export const ParamPlatform = z
  .string()
  .describe("The platform for the project (e.g., python, javascript, react, etc.)");

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(), // should be "bearer"
  expires_in: z.number(),
  expires_at: z.string().datetime(),
  user: z.object({
    email: z.string().email(),
    id: z.string(),
    name: z.string(),
  }),
  scope: z.string(),
});

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
  entries: z.array(
    z.union([
      // TODO: there are other types
      z.object({
        type: z.literal("exception"),
        data: SentryErrorEntrySchema,
      }),
      z.object({
        type: z.literal("breadcrumbs"),
        data: z.unknown(),
      }),
      z.object({
        type: z.literal("message"),
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
