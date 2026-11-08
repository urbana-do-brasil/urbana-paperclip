import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // These suites spawn the real CLI and inspect help/structured output; the
    // default 5s is too tight on loaded CI runners.
    testTimeout: 15_000,
  },
});
