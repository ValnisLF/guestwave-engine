# Configuración de Entornos – GuestWave Engine

## 📋 Estructura de Variables de Entorno

Este proyecto usa tres niveles de configuración:

### 1. `.env.example` (Plantilla – COMMITEAR)
- ✅ Se commitea en Git
- 📝 Documenta todas las variables necesarias
- 🔒 Usa valores placeholder/de ejemplo
- 👥 Ayuda a nuevos desarrolladores a entender qué configurar

### 2. `.env.local` (Desarrollo Local – NO COMMITEAR)
- ❌ Ignorado por Git (está en `.gitignore`)
- 🔐 Contiene credenciales reales de desarrollo/testing
- 💻 Usado cuando corres `npm run dev`
- ⚠️ **Nunca** hagas push de este archivo

### 3. Variables en Plataforma (Producción – NO LOCALES)
- ☁️ Configuradas en tu hosting (Vercel, Railway, etc.)
- 🔑 Usa variables de entorno seguras del proveedor
- 🚀 Se aplican automáticamente al desplegar
- 🔐 **Claves en vivo** (sk_live_*, pk_live_*)

---

## 🔧 Configuración Paso a Paso

### Step 1: Copiar plantilla
```bash
cp .env.example .env.local
```

### Step 2: Rellenar credenciales locales
Edita `.env.local` y completa con:
- **Supabase:** URL del proyecto y claves (proyecto de testing/desarrollo)
- **Stripe:** Claves de prueba (`pk_test_`, `sk_test_`)
- **Resend/SendGrid:** Token de API para desarrollo
- **OpenAI:** (Opcional para Slice 3)

Si quieres probar el flujo completo de reserva sin Stripe real desde frontend:
- Activa `MOCK_CHECKOUT="1"` en `.env.local`
- Configura `OWNER_NOTIFICATION_EMAIL` para recibir aviso de pago
- Mantén `RESEND_API_KEY` para envío real de email

### Step 3: Verifica que funciona
```bash
npm run dev
```
Si ves mensajes sobre variables faltantes, revisa `.env.local`.

---

## 🚀 Despliegue en Producción (Vercel/Railway)

### Variables que debes configurar en tu plataforma:

1. **Base de Datos (Producción)**
   ```
   DATABASE_URL = "postgresql://..." (base de datos de producción)
   ```

2. **Supabase (Proyecto de producción)**
   ```
   NEXT_PUBLIC_SUPABASE_URL = "https://prod-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY = "..." (claves de producción)
   SUPABASE_SERVICE_ROLE_KEY = "..."
   ```

3. **Stripe (Claves en vivo)**
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_..." (no pk_test_)
   STRIPE_SECRET_KEY = "sk_live_..." (no sk_test_)
   STRIPE_WEBHOOK_SECRET = "whsec_..." (webhook de producción)
   ```

4. **Email (Producción)**
   ```
   RESEND_API_KEY = "re_..." (producción)
   ```

5. **App URL**
   ```
   NEXT_PUBLIC_APP_URL = "https://guestwave.com" (tu dominio)
   NODE_ENV = "production"
   ```

### En Vercel:
1. Proyecto Settings > Environment Variables
2. Pega cada variable
3. Selecciona entornos (Production, Preview, Development)
4. Deploy automático aplica las variables

### En Railway/Render:
1. Dashboard > Environment > Variables
2. Carga desde `.env.example` o pega manualmente
3. Deploy automático aplica

---

## 🔐 Checklist de Seguridad

- ✅ `.env.local` está en `.gitignore`
- ✅ Nunca haces push de `.env.local`
- ✅ `.env.example` solo contiene placeholders
- ✅ Claves de producción solo en la plataforma (Vercel, Railway)
- ✅ Webhooks de Stripe configurados en ambos entornos
- ✅ `NEXT_PUBLIC_*` variables son seguras para exponer (usado por navegador)
- ✅ Claves secretas (`*_SECRET_KEY`, `*_API_KEY`) jamás en cliente

---

## 📚 Variables Disponibles en Client vs Server

### Accesibles en el Cliente (NEXT_PUBLIC_)
```typescript
// Componentes React Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // ✅ OK
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // ✅ OK
```

### Solo en Server (Server Actions, API Routes)
```typescript
// Server Actions
'use server'
const dbUrl = process.env.DATABASE_URL; // ✅ OK (solo server)
const stripeSecret = process.env.STRIPE_SECRET_KEY; // ✅ OK (solo server)
```

---

## 🆘 Troubleshooting

### Error: "DATABASE_URL is not defined"
→ Verifica que `.env.local` existe y `DATABASE_URL` está configurado

### Error: "Stripe key is missing"
→ Asegúrate que `STRIPE_SECRET_KEY` está en `.env.local` (server-side)
→ Y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está configurado

### Quiero probar checkout sin Stripe integrado
→ Activa `MOCK_CHECKOUT="1"` en `.env.local`
→ Reinicia `pnpm dev`
→ El checkout se simula, la reserva queda `CONFIRMED`, se bloquean fechas y se envía aviso al owner (si `RESEND_API_KEY` + `OWNER_NOTIFICATION_EMAIL` están configurados)

### Webhook de Stripe no funciona en local
→ Usa CLI local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
→ Copia el signing secret en `STRIPE_WEBHOOK_SECRET`

