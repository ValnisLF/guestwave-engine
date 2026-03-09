# Arquitectura del repositorio

Este repositorio sigue la convención `Screaming Architecture` y la `Scope Rule` descrita en `AGENTS.md`.

Estructura relevante:

- `app/` — Rutas de Next.js (App Router). Las páginas importan contenedores desde `src/features`.
- `src/features/` — Lógica por feature (dominio). Ej: `pricing`, `bookings`, `properties`.
- `src/shared/` — Componentes, hooks y utilidades compartidas entre 2+ features.
- `src/infrastructure/` — Wrappers para servicios externos (Supabase, Stripe, iCal).
- `prisma/` — Esquema Prisma y migreations.
- `tests/` — E2E / Playwright y suites globales.

Setup rápido:

1. Copia la plantilla de variables de entorno:
```bash
cp .env.example .env.local
```
2. Instala dependencias:
```bash
pnpm install
```
3. Ejecuta tests unitarios:
```bash
pnpm test
```

Convenciones importantes:

- Los contenedores de feature deben exportar un componente principal cuyo nombre coincide con el feature.
- Las utilidades compartidas se colocan en `src/shared` únicamente si son usadas por 2+ features.
- Los tests unitarios se colocan junto a la feature (`src/features/X/X.test.ts`).

UI convention:

- The project UI component library standard is `shadcn/ui` (with Tailwind CSS).
- For new UI features, prefer `shadcn/ui` components over custom primitives when possible.

## Content And Theme Source Of Truth

- Official content editing flow: `Backoffice -> /admin/properties/[propertyId]/contenidos`.
- Public pages consume section-based content from `Property.pageContent`:
	- `homePage`, `laPropiedad`, `turismo`, `reservas`, `tarifas`, `contacto`.
- Design settings live in `Backoffice -> /admin/properties/[propertyId]/apariencia` and affect `/properties/[slug]/*` using:
	- `primaryColor`, `accentColor`, `fontFamily`.
- Legacy Home fields (`homeHeroTitle`, `homeHeroSubtitle`, `homeDescription`) are deprecated and removed from active write paths.

## Primeros 10 minutos

Checklist rapido para un desarrollador nuevo:

1. Preparar entorno local
```bash
cp .env.example .env.local
pnpm install
pnpm db:push
```

2. Arrancar app
```bash
pnpm dev
```

3. Crear primer usuario admin local
- Abre `http://localhost:3000/admin/setup`
- Crea el primer usuario ADMIN (email + password)

4. Crear propiedad y entrar al workspace
- Abre `http://localhost:3000/admin`
- Crea una propiedad
- Entra a `Manage` y abre la seccion `Calendario`

5. Vincular al menos un calendario iCal
- En `Calendario`, agrega nombre + URL `.ics`
- Pulsa `Sync` para una primera sincronizacion manual

6. Activar Auto-sync de la propiedad
- En `Calendario`, bloque `Auto-sync`
- Define intervalo (minimo 5 min)
- Pulsa `Activar`

7. Simular cron en local
```bash
pnpm autosync:local
```

8. Validar estado en UI
- `Ultimo intento`: confirma que el disparo de auto-sync se esta ejecutando
- `Ultimo exito`: confirma que la sincronizacion iCal termina correctamente

9. (Opcional) Probar endpoint manualmente
```bash
curl -X POST http://localhost:3000/api/internal/ical/auto-sync
```

10. Ejecutar suite rapida de verificacion
```bash
pnpm test
```
