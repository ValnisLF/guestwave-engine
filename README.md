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

## Backoffice Access

- Backoffice auth is local to this app (not Supabase dashboard users).
- First time setup: open `/admin/setup` to create the first system admin user.
- Daily access: `/admin/login`.
- Admin home `/admin` now includes quick actions to:
	- create properties
	- invite collaborators as `OWNER` or `MANAGER`

## Invite Email Setup (Resend)

To make invitation emails work, configure both:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must be a verified sender/domain in Resend)

If sending fails, the app still creates the invite and shows the manual invite link (`/admin/invite/<token>`) in the UI so you can share it directly.
