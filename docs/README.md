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
