import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1,
  environment: import.meta.env.NODE_ENV,
});
