import type { z } from "zod";
import type {
  SentryErrorEntrySchema,
  SentryEventSchema,
  SentryFrameInterface,
} from "../lib/sentry-api";

export function formatFrameHeader(
  frame: z.infer<typeof SentryFrameInterface>,
  platform: string | undefined | null,
) {
  if (platform?.startsWith("javascript")) {
    return `${[frame.filename, frame.lineNo, frame.colNo]
      .filter((i) => !!i)
      .join(":")}${frame.function ? ` (${frame.function})` : ""}`;
  }
  return `${frame.function ? `"${frame.function}"` : "unknown function"} in "${frame.filename || frame.module}"${
    frame.lineNo
      ? ` at line ${frame.lineNo}${frame.colNo !== null ? `:${frame.colNo}` : ""}`
      : ""
  }`;
}

export function formatEventOutput(event: z.infer<typeof SentryEventSchema>) {
  let output = "";
  for (const entry of event.entries) {
    if (entry.type === "exception") {
      const data = entry.data as z.infer<typeof SentryErrorEntrySchema>;
      const firstError = data.value ?? data.values[0];
      if (!firstError) {
        continue;
      }
      output += `**Error:**\n${"```"}\n${firstError.type}: ${
        firstError.value
      }\n${"```"}\n\n`;
      if (!firstError.stacktrace || !firstError.stacktrace.frames) {
        continue;
      }
      output += `**Stacktrace:**\n${"```"}\n${firstError.stacktrace.frames
        .map((frame) => {
          const context = frame.context?.length
            ? `${frame.context
                .filter(([lineno, _]) => lineno === frame.lineNo)
                .map(([_, code]) => `\n${code}`)
                .join("")}`
            : "";

          return `${formatFrameHeader(frame, event.platform)}${context}`;
        })
        .join("\n")}\n${"```"}\n\n`;
    }
  }
  return output;
}
