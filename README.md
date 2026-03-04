# guestwave-engine
Compact holiday rental manager

## E2E (Playwright)

- Install browser once: `pnpm test:e2e:install`
- Run E2E suite: `pnpm test:e2e`
- Open Playwright UI runner: `pnpm test:e2e:ui`

Notes:
- E2E tests require a working `DATABASE_URL`.
- Tests start the app automatically via `pnpm dev`.
