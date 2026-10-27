# Browser verification of the initial language journey

```sh
pnpm --filter @paperclipai/ui build
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test --config tests/localization-browser/playwright.config.ts
```

The test serves the production UI build on loopback. Authentication uses real
Better Auth cookies/accounts and actor middleware; preference reads, saves,
private auditing and migrations use real application code and a fresh temporary
PostgreSQL database. It never connects to an existing Paperclip instance, starts
agents, calls a model, or deploys the application. Temporary state is cleaned up
when the fixture stops.

Unrelated APIs (projects, skills, attention, orchestration and other sidebar
data) use empty fixture responses. Organizations and memberships are seeded in
the temporary DB. This qualifies the initial preference journey and production
components, not the full product's business behavior or all feature flags.

Coverage: English browser with Portuguese default, signed-out selection kept
separate from accounts, selection before organization membership, preserved
profile draft, confirmed changes, reload, two organizations, a second browser
for the same account, a second account on the original browser, and a narrow
viewport with dark mode. Component tests additionally cover failures, retries,
stale responses, storage failures and cross-tab identity isolation.

When running as root on Linux, the config launches the disposable PostgreSQL
fixture in a user namespace as UID/GID 65534. This requires `unshare`; it avoids
creating system users or weakening permissions on the workspace. Non-root
Linux runners launch it directly. Chromium and its shared-library dependencies
must be installed on the test host. Port 3197 is reserved for this fixture;
an existing server is never reused. Results are written under
`/tmp/paperclip-locale-browser-results`.
