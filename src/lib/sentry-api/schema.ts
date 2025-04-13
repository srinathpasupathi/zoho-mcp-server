import { z } from "zod";

export const SentryOrgSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
  name: z.string(),
});

export const SentryTeamSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
  name: z.string(),
});

export const SentryProjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
  name: z.string(),
});

export const SentryClientKeySchema = z.object({
  id: z.union([z.string(), z.number()]),
  dsn: z.object({
    public: z.string(),
  }),
});

export const SentryReleaseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  version: z.string(),
  shortVersion: z.string(),
  dateCreated: z.string().datetime(),
  dateReleased: z.string().datetime().nullable(),
  firstEvent: z.string().datetime().nullable(),
  lastEvent: z.string().datetime().nullable(),
  newGroups: z.number(),
  lastCommit: z
    .object({
      id: z.union([z.string(), z.number()]),
      message: z.string(),
      dateCreated: z.string().datetime(),
      author: z.object({
        name: z.string(),
        email: z.string(),
      }),
    })
    .nullable(),
  lastDeploy: z
    .object({
      id: z.union([z.string(), z.number()]),
      environment: z.string(),
      dateStarted: z.string().datetime().nullable(),
      dateFinished: z.string().datetime().nullable(),
    })
    .nullable(),
  projects: z.array(SentryProjectSchema),
});

export const SentryIssueSchema = z.object({
  id: z.union([z.string(), z.number()]),
  shortId: z.string(),
  title: z.string(),
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  count: z.union([z.string(), z.number()]),
  userCount: z.union([z.string(), z.number()]),
  permalink: z.string().url(),
  project: SentryProjectSchema,
  platform: z.string(),
  status: z.string(),
  culprit: z.string(),
  type: z.union([z.literal("error"), z.string()]),
});

export const SentryFrameInterface = z
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
  .partial();

// XXX: Sentry's schema generally speaking is "assume all user input is missing"
// so we need to handle effectively every field being optional or nullable.
export const SentryExceptionInterface = z
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
      frames: z.array(SentryFrameInterface),
    }),
  })
  .partial();

export const SentryErrorEntrySchema = z.object({
  // XXX: Sentry can return either of these. Not sure why we never normalized it.
  values: z.array(SentryExceptionInterface.optional()),
  value: SentryExceptionInterface.nullable().optional(),
});

export const SentryEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  dateCreated: z.string().datetime(),
  culprit: z.string().nullable(),
  platform: z.string().nullable(),
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

export const SentryEventsResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    fields: z.record(z.string(), z.string()),
    units: z.record(z.string(), z.string().nullable()),
  }),
});

// https://us.sentry.io/api/0/organizations/sentry/events/?dataset=errors&field=issue&field=title&field=project&field=timestamp&field=trace&per_page=5&query=event.type%3Aerror&referrer=sentry-mcp&sort=-timestamp&statsPeriod=1w
export const SentrySearchErrorsEventSchema = z.object({
  issue: z.string(),
  "issue.id": z.union([z.string(), z.number()]),
  project: z.string(),
  title: z.string(),
  "count()": z.number(),
  "last_seen()": z.string(),
});

export const SentrySearchSpansEventSchema = z.object({
  id: z.string(),
  trace: z.string(),
  "span.op": z.string(),
  "span.description": z.string(),
  "span.duration": z.number(),
  transaction: z.string(),
  project: z.string(),
  timestamp: z.string(),
});
