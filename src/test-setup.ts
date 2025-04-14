import { mswServer } from "./lib/sentry-msw";

mswServer.listen({
  onUnhandledRequest: (req, print) => {
    if (req.url.startsWith("https://api.openai.com/")) {
      return;
    }

    print.warning();
    throw new Error("Unhandled request");
  },
  // onUnhandledRequest: "error"
});
