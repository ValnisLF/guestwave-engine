# Contexto de Producto: Plataforma de Gestión de Alquiler Vacacional Directo

## Objetivo del Proyecto
Crear un MVP para gestionar el alquiler directo de viviendas vacacionales familiares (escalable a 2+), eliminando la dependencia de OTAs (Airbnb/Booking) y automatizando tareas operativas (Check-in, Limpieza, Precios).

## Perfil del Usuario
- **Huésped:** Familias y grupos de amigos (10 pax). Buscan confianza y facilidad de pago. **NO necesitan registro (Guest Checkout).**
- **Administrador:** Dueños de la propiedad. Necesitan control de overbooking y automatización legal.

## North Star Metric (NSM)
- Noches reservadas directamente (Direct Booked Nights).

## Flujo de Identidad (Sin Fricción)
1. El huésped reserva con Email.
2. Tras el pago, recibe un **Booking Token (UUID)** único.
3. El acceso a la gestión de su estancia (DNI, Cancelación) se hace vía URL firmada: `/reserva/[id]?token=[uuid]`.