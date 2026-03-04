# User Story Mapping

## 👥 User Personas
1. **Guest (H):** Busca rapidez, confianza y cero fricción.
2. **Property Owner (O):** Dueño de la casa. Busca control, ahorro de tiempo y evitar overbookings.
3. **Product Manager (PM):** Tú. Buscas validar el modelo de negocio con datos reales.
4. **System Admin (SA):** Perfil técnico para mantenimiento y despliegue inicial.

---

## 🚀 SLICE 1: THE CORE ENGINE (Días 1-12)
*Objetivo: Permitir que alguien vea la casa, calcule el precio real y pague.*

### Epic: Inventory & Pricing
- **[O]** Alta de propiedad: detalles, reglas, fotos y amenities (checklist).
- **[O]** Configuración de reglas: estancias mínimas y limpieza por propiedad.
- **[O]** Gestión de tarifas: Precio base + Variación por Temporada (Alta/Media/Baja).
- **[O]** Selector de pagos: Alternar entre Pago 100% o Depósito % según temporada.
- **[H]** Visualización: Fotos High-quality, amenities y descripción de la vivienda.
- **[H]** Motor de Precios: Ver cálculo instantáneo (noche + limpieza + tasa) sin registro.

### Epic: Booking & Sincronización
- **[H]** Disponibilidad real: Ver días libres (bloqueados por DB local + iCal externo).
- **[H]** Checkout sin fricción: Pago seguro con Tarjeta (Stripe) sin crear contraseña.
- **[O]** Notificación: Recibir aviso de pago y bloqueo automático de fechas en el sistema.
- **[SA]** Sync iCal (Entrada): Airbnb/Booking bloquean el calendario de la web automáticamente.

---

## 🛠️ SLICE 2: OPERATIONS & ADMIN (Días 13-22)
*Objetivo: Gestionar lo que ocurre después del pago y evitar tareas manuales.*

### Epic: Dashboard & Communication
- **[SA]** Login seguro de administrador/familiar (Invite-only).
- **[O]** Calendario unificado: Ver reservas propias y las de OTAs en una sola vista.
- **[O]** Gestión manual: Modificar o cancelar/reembolsar reserva a petición del cliente.
- **[H]** Confirmación: Recepción de email con resumen y código de reserva (SendGrid).
- **[O]** Finance: Listado de todos los pagos recibidos y conciliación simple.

### Epic: Content & SEO
- **[O]** Editor de contenido: Modificar textos de turismo y Meta-tags (SEO) fácilmente.
- **[H]** Información local: Leer sobre turismo en la zona para planificar el viaje.

---

## 🤖 SLICE 3: AI & GROWTH METRICS (Días 23-30)
*Objetivo: El factor diferencial para el Máster y la validación de negocio.*

### Epic: AI Integration
- **[H]** AI Chatbot: Preguntar sobre la casa (Wi-Fi, equipamiento) y entorno 24/7.
- **[O]** AI Content Creator: Botón para generar/optimizar textos turísticos para SEO.
- **[O]** AI Log: Ver si los huéspedes interactúan con el bot para mejorar la info.

### Epic: PM Analytics
- **[PM]** Funnel Analytics: Ver en qué paso del checkout abandonan los usuarios.
- **[PM]** North Star Counter: Visualizador de "Noches Directas" y "Ahorro en Comisiones".
- **[PM]** Heatmap de visitas: Saber cuántas visitas se traducen en dinero real.

---

## ⏩ NEXT VERSIONS (Post-MVP)
- **Legal:** Gestión de DNIs automatizada y envío a la policía.
- **Guest Experience:** Login de huésped para gestionar reserva, Apple/Google Pay, Bizum.
- **Automation:** Notificación a limpieza vía WhatsApp, sincronización iCal de Salida (Web -> Airbnb).
- **Marketing:** Sistema de cupones, reviews de huéspedes y asistente de retención con IA.