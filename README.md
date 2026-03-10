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

## Content Management (pageContent)

- Official content editing flow is now `Backoffice -> /admin/properties/[propertyId]/contenidos`.
- Public pages read content by section from `Property.pageContent` (`homePage`, `laPropiedad`, `turismo`, `reservas`, `tarifas`, `contacto`).
- Legacy Home fields (`homeHeroTitle`, `homeHeroSubtitle`, `homeDescription`) were removed from the active backoffice flow and database schema.
- Design settings in `Backoffice -> /admin/properties/[propertyId]/apariencia` now apply on public property routes (`/properties/[slug]/*`) using `primaryColor`, `accentColor` and `fontFamily`.
- For new content features, extend `pageContent` schemas in `lib/schemas/property.ts` and keep read/write logic aligned between:
	- `app/admin/properties/[propertyId]/contenidos/page.tsx`
	- `app/(public)/properties/[slug]/_lib/page-content.ts`

### Media-Ready pageContent

- `pageContent` supports legacy text fields and media blocks (`sections[]`) per page section.
- Supported block types: `text`, `image`, `carousel` (compatibility aliases: `text_block`, `gallery`).
- Public renderer uses `app/(public)/properties/[slug]/_components/DynamicSection.tsx`.

### Photos Admin Flow

- Photos workspace: `Backoffice -> /admin/properties/[propertyId]/fotos`.
- Uploads are sent to Supabase Storage bucket `property-media` by default (override with `SUPABASE_STORAGE_BUCKET`).
- Each uploaded image can be:
	- copied as URL
	- assigned to a page/slot, which appends an `image` block into `pageContent[section].sections`.

### Internal Health Check (Env)

- Endpoint: `GET /api/internal/env-check`
- Purpose: validate image-upload related env vars without exposing secret values.
- Auth headers (one of):
	- `x-healthcheck-token: $HEALTHCHECK_TOKEN`
	- `x-ical-auto-sync-token: $ICAL_AUTO_SYNC_TOKEN`
	- `Authorization: Bearer $CRON_SECRET`
- In local dev (`NODE_ENV!=production`), endpoint is accessible without token.

Example:

```bash
curl -X GET http://localhost:3000/api/internal/env-check \
  -H "x-healthcheck-token: $HEALTHCHECK_TOKEN"
```

## Invite Email Setup (Resend)

To make invitation emails work, configure both:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must be a verified sender/domain in Resend)

If sending fails, the app still creates the invite and shows the manual invite link (`/admin/invite/<token>`) in the UI so you can share it directly.

## iCal Auto-Sync (Onboarding)

How auto-sync works in this project:

- **Production (Vercel):** cron is configured in `vercel.json` and calls `/api/internal/ical/auto-sync` every 5 minutes.
- **Local development:** no scheduler runs automatically. You must call the endpoint manually or run the local loop script.

Requirements per property:

- `Auto-sync` enabled in backoffice (`/admin/properties/[propertyId]/calendario`)
- Interval configured (minimum 5 minutes)
- At least one linked iCal calendar

Useful commands:

```bash
# One-shot trigger (local)
curl -X POST http://localhost:3000/api/internal/ical/auto-sync

# One-shot trigger with token header (if configured)
curl -X POST http://localhost:3000/api/internal/ical/auto-sync \
	-H "x-ical-auto-sync-token: $ICAL_AUTO_SYNC_TOKEN"

# Continuous local loop (every 5 minutes by default)
pnpm autosync:local
```

Customize local loop:

```bash
# Run every 60 seconds against local dev server
AUTO_SYNC_INTERVAL_SECONDS=60 pnpm autosync:local

# Use token-protected endpoint
ICAL_AUTO_SYNC_TOKEN="<your-token>" pnpm autosync:local
```

Calendar status semantics shown in UI:

- `Ultimo intento`: last cron/manual attempt heartbeat.
- `Ultimo exito`: last successful iCal synchronization.
