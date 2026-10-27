import { defineConfig } from "@playwright/test";
import path from "node:path";
const port = 3197;
export default defineConfig({
  testDir: ".", testMatch: "locale.spec.ts", workers: 1, timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${port}`, locale: "en-US", headless: true, screenshot: "only-on-failure" },
  outputDir: "/tmp/paperclip-locale-browser-results",
  reporter: "list",
  webServer: {
    cwd: path.resolve(import.meta.dirname, "../.."),
    command: `${process.platform === "linux" && process.getuid?.() === 0 ? "unshare --user --map-user=65534 --map-group=65534 " : ""}pnpm --filter @paperclipai/server exec tsx src/__tests__/fixtures/locale-browser-server.ts`,
    url: `http://127.0.0.1:${port}/api/health`, reuseExistingServer: false, timeout: 90_000,
    env: { PAPERCLIP_LOCALE_BROWSER_PORT: String(port) },
  },
});
