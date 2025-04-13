import { describeEval } from "vitest-evals";
import { Factuality, FIXTURES, TaskRunner } from "./utils";

describeEval("list-teams", {
  data: async () => {
    return [
      {
        input: `What teams do I have access to in Sentry for '${FIXTURES.organizationSlug}'`,
        expected: FIXTURES.teamSlug,
      },
    ];
  },
  task: TaskRunner(),
  scorers: [Factuality()],
  threshold: 0.6,
  timeout: 30000,
});
