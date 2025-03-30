import { z } from "zod";

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

export const SentryIssueSchema = z.object({
  id: z.string(),
  shortId: z.string(),
  title: z.string(),
  lastSeen: z.string().datetime(),
  count: z.number(),
  permalink: z.string().url(),
});

const ExceptionInterface = z.object({
  mechanism: z.object({
    type: z.string(),
    handled: z.boolean(),
  }),
  type: z.string(),
  value: z.string(),
  stacktrace: z.object({
    frames: z.array(
      z.object({
        filename: z.string().nullable(),
        function: z.string().nullable(),
        lineNo: z.number().nullable(),
        colNo: z.number().nullable(),
        absPath: z.string().nullable(),
        module: z.string().nullable(),
        // lineno, source code
        context: z.array(z.tuple([z.number(), z.string()])),
      }),
    ),
  }),
});

export const SentryErrorEntrySchema = z.object({
  values: z.array(ExceptionInterface.optional()),
  value: ExceptionInterface.optional(),
});

export const SentryEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  entries: z.array(
    z.union([
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
});
