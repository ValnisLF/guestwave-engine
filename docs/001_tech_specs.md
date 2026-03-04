# Especificaciones Técnicas (Tech Specs) - Unified Monolith

## 🏗️ Arquitectura de Aplicación
Usamos Next.js 14 con App Router organizado por **Route Groups**:
- `app/(public)/*`: Rutas para el Huésped (SEO-friendly, SSR).
- `app/(admin)/*`: Panel de Gestión (Protegido por Middleware).
- `app/api/*`: Webhooks y tareas programadas (Stripe, iCal).

## 🛠️ Stack Tecnológico
- **Framework:** Next.js 16.1.6 (TypeScript).
- **Base de Datos & Auth:** Supabase (PostgreSQL + RLS).
- **Componentes:** Shadcn/UI + Tailwind CSS.
- **Pagos:** Stripe Checkout (Soporte para pago total o depósito %).
- **Emails:** Resend / SendGrid.
- **IA:** OpenAI SDK (GPT-4o) para RAG de turismo y extracción de datos de DNI (Vision).
- **Validación:** Zod (Compartido entre Client y Server).

## 🚀 Next.js 16.1.6 Specifics
- **Form Actions:** Uso de `useActionState` para formularios de reserva y admin (sustituye a `useFormState`).
- **PPR (Partial Prerendering):** Habilitado para que la Landing Page sea estática pero el calendario de disponibilidad sea dinámico (Isla de dinamismo).
- **Caching:** Uso de la nueva API de cache de Next 16 para los resultados de iCal y precios.

## 🔒 Estrategia de Seguridad
1. **Middleware:** Controla el acceso a `(admin)`. Si no hay sesión de Supabase Auth, redirige a `/login`.
2. **RLS (Row Level Security):** La base de datos solo permite que un `owner_id` vea sus propias `properties` y `bookings`.
3. **Guest Access:** Los huéspedes acceden a `/reserva/[id]` validando el `guest_token` (UUID) contra la base de datos, sin necesidad de login.

## 💾 Modelado de Datos (Esquema Principal)
- `properties`: (id, name, slug, description, amenities (jsonb), base_price, deposit_pct, ical_url_in).
- `season_rates`: (id, property_id, start_date, end_date, price_multiplier).
- `bookings`: (id, property_id, status (PENDING, CONFIRMED, CANCELLED), check_in, check_out, total_price, guest_email, guest_token (uuid)).
- `blocked_dates`: (id, property_id, start_date, end_date, source (ical/manual)).

## Reglas Críticas de Negocio
1. **Prevención de Overbooking:** Toda reserva confirmada debe insertar bloqueos en `blocked_dates` mediante una transacción de base de datos.
2. **Cálculo de Precios:** Siempre se calcula en el Servidor (Server Action), nunca se confía en el precio del cliente. La lógica reside en `lib/pricing.ts` para ser usada tanto en el Checkout como en el Admin.
3. **Sincronización:** El sistema debe consumir feeds iCal externos para bloquear fechas locales.
4. **Seguridad:** Rutas `/admin/*` protegidas por Middleware de Supabase Auth.
5. **Atomicidad:** El bloqueo de fechas se hace mediante Transacciones SQL tras el Webhook de Stripe.

## 🧪 Estrategia de Testing (TDD)
- **Unit Testing:** Vitest para lógica pura (cálculo de precios, validación de fechas, parseo iCal).
- **Component Testing:** React Testing Library para componentes críticos del Checkout.
- **E2E Testing:** Playwright para el flujo completo: "Reserva -> Pago Stripe (Mock) -> Confirmación".
- **Workflow:** Red-Green-Refactor. Ninguna lógica de negocio se implementa sin un test fallido previo.