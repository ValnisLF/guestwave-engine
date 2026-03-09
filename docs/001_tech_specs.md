# Especificaciones Técnicas (Tech Specs) - Unified Monolith

## 🏗️ Arquitectura de Aplicación
Usamos Next.js 14 con App Router organizado por **Route Groups**:
- `app/(public)/*`: Rutas para el Huésped (SEO-friendly, SSR).
- `app/(admin)/*`: Panel de Gestión (Protegido por Middleware).
- `app/api/*`: Webhooks y tareas programadas (Stripe, iCal).

## 🛠️ Stack Tecnológico
- **Framework:** Next.js 16.1.6 (TypeScript).
- **Base de Datos:** PostgreSQL (Supabase como hosting de DB).
- **Auth Backoffice:** Auth local de aplicación (email/password hasheado + sesión por cookie en DB).
- **Componentes:** Shadcn/UI + Tailwind CSS.
- **Pagos:** Stripe Checkout (Soporte para pago total o depósito %).
- **Emails:** Nodemailer (SMTP Dinámico).
- **IA:** OpenAI SDK (GPT-4o) para RAG de turismo y extracción de datos de DNI (Vision).
- **Validación:** Zod (Compartido entre Client y Server).
- **ORM:** Prisma 6.x (PostgreSQL) (Compatible con Node.js 21).
- **Protocolo:** Uso de `library` o `binary` según estabilidad en Node 21.
- **Workflow:** Prisma Client optimizado para el motor de Rust de la v6.
- **TDD Integration:** Uso de un Schema de validación con Zod integrado mediante `zod-prisma-types` para asegurar que los datos del frontend coinciden con la DB.
- **Features:** Uso de TypedSQL para consultas de disponibilidad y Middleware nativo para control de sesión del Backoffice.

### Estado de Migración UI
- El proyecto está migrando los componentes legacy a `shadcn/ui`.
- Convención para nuevas pantallas: usar componentes desde `components/ui/*`.
- Utilidad común de clases: `@/lib/utils` con helper `cn(...)`.

## 🚀 Next.js 16.1.6 Specifics
- **Form Actions:** Uso de `useActionState` para formularios de reserva y admin (sustituye a `useFormState`).
- **PPR (Partial Prerendering):** Habilitado para que la Landing Page sea estática pero el calendario de disponibilidad sea dinámico (Isla de dinamismo).
- **Caching:** Uso de la nueva API de cache de Next 16 para los resultados de iCal y precios.

## 🔒 Estrategia de Seguridad
1. **Middleware:** Controla el acceso a `/admin/*` usando cookie de sesión local (`gw_admin_session`) y redirige a `/admin/login` si no hay sesión.
2. **Roles de usuario:**
	- `ADMIN`: crea propiedades (alta simple name/slug) e invita usuarios `OWNER` por email.
	- `OWNER`: gestiona las propiedades que tiene asociadas mediante membresías.
3. **Guest Access:** Los huéspedes acceden a `/reserva/[id]` validando el `guest_token` (UUID) contra la base de datos, sin necesidad de login.
4. **Password hashing**: bcrypt con un coste de 12.
5. 

## 💾 Modelado de Datos (Esquema Principal)
- `properties`: (id, name, slug, description, amenities (jsonb), base_price, deposit_pct, ical_url_in, primary_color, accent_color, font_family, page_content(jsonb)).
- `season_rates`: (id, property_id, start_date, end_date, price_multiplier).
- `bookings`: (id, property_id, status (PENDING, CONFIRMED, CANCELLED), check_in, check_out, total_price, guest_email, guest_token (uuid)).
- `blocked_dates`: (id, property_id, start_date, end_date, source (ical/manual)).

### Personalización de Property (Branding + CMS Ligero)
- **Estilos:** `primaryColor`, `accentColor`, `fontFamily`.
- **Contenido dinámico:** `pageContent` (`Json`) para almacenar contenido estructurado editable de páginas públicas (Turismo, La Propiedad y Tarifas).

## Reglas Críticas de Negocio
1. **Prevención de Overbooking:** Toda reserva confirmada debe insertar bloqueos en `blocked_dates` mediante una transacción de base de datos.
2. **Cálculo de Precios:** Siempre se calcula en el Servidor (Server Action), nunca se confía en el precio del cliente. La lógica reside en `lib/pricing.ts` para ser usada tanto en el Checkout como en el Admin.
3. **Sincronización:** El sistema debe consumir feeds iCal externos para bloquear fechas locales.
4. **Seguridad:** Rutas `/admin/*` protegidas por Middleware y autorización por rol/membresía.
5. **Atomicidad:** El bloqueo de fechas se hace mediante Transacciones SQL tras el Webhook de Stripe.

## 🧪 Estrategia de Testing (TDD)
- **Unit Testing:** Vitest para lógica pura (cálculo de precios, validación de fechas, parseo iCal).
- **Component Testing:** React Testing Library para componentes críticos del Checkout.
- **E2E Testing:** Playwright para el flujo completo: "Reserva -> Pago Stripe (Mock) -> Confirmación".
- **Workflow:** Red-Green-Refactor. Ninguna lógica de negocio se implementa sin un test fallido previo.

## Envio de emails
- **Email Engine:** Nodemailer (SMTP Dinámico).
- **Security:** Las contraseñas SMTP se almacenan encriptadas en Supabase (usando pgcrypto o una librería de cifrado en el server).
- **Fallback:** Si no hay SMTP configurado, el sistema usa una cuenta por defecto del sistema.