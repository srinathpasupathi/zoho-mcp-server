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

export const SentryErrorEntrySchema = z.object({
  values: z.array(
    z.object({
      mechanism: z.object({
        type: z.string(),
        handled: z.boolean(),
      }),
      type: z.string(),
      value: z.string(),
      stacktrace: z.object({
        frames: z.array(
          z.object({
            filename: z.string(),
            function: z.string(),
            lineno: z.number(),
            colno: z.number(),
            absPath: z.string(),
            module: z.string(),
            // lineno, source code
            context: z.array(z.tuple([z.number(), z.string()])),
          }),
        ),
      }),
    }),
  ),
});

export const SentryEventSchema = z.object({
  id: z.string(),
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
    ]),
  ),
});
