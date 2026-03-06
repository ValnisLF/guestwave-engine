# guestwave-engine
Compact holiday rental manager

## UI Components

- UI component standard: `shadcn/ui`.
- Styling system: Tailwind CSS.
- Current status: migration to `shadcn/ui` is in progress; new UI work should use shadcn components by default.
- Shadcn config file: `components.json`.

### Add New UI Components (shadcn)

```bash
pnpm dlx shadcn@latest add button input textarea card alert
```

The project already includes `@/lib/utils` (`cn`) and base primitives under `components/ui/*`.

## E2E (Playwright)

- Install browser once: `pnpm test:e2e:install`
- Run E2E suite: `pnpm test:e2e`
- Open Playwright UI runner: `pnpm test:e2e:ui`

Notes:
- E2E tests require a working `DATABASE_URL`.
- Tests start the app automatically via `pnpm dev`.
