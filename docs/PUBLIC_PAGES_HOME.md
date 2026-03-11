# Página Pública: Home (`/properties/[slug]`)

## Descripción General

La página **Home** es la landing page principal de cada propiedad. Presenta una propuesta de valor clara y completa a través de múltiples secciones: hero section, resumen, amenidades destacadas, disponibilidad, y carousel de lugares cercanos.

**Ruta:** `/properties/[slug]`  
**Componente Root:** [app/(public)/properties/[slug]/page.tsx](../app/(public)/properties/%5Bslug%5D/page.tsx)  
**Datos de Origen:** `Property.pageContent.homepage` (Zod validated)

---

## Estructura de Datos

```typescript
// Schema: PropertyPageContentSchema.homepage
{
  hero: {
    image?: string;           // URL de imagen full-width
    title: string;            // Título principal (e.g., "Bienvenido a El Ferjo")
    subtitle?: string;        // Subtítulo debajo del título
  };
  intro: {
    title?: string;           // Encabezado (e.g., "Una fusión de tradición")
    paragraph?: string;       // Párrafo descriptivo
  };
  amenities: {
    title: string;            // e.g., "Equipamiento y Confort"
    paragraph?: string;       // Descripción detallada
    items?: string[];         // Lista de amenidades (máx ~6 items)
    image?: string;           // Foto illustrativa
  };
  availability: {
    title?: string;           // e.g., "Ver Disponibilidad"
    paragraph?: string;       // Descripción/CTA
  };
  areaCarousel: Array<{       // 3-6 items recomendados
    url: string;              // Imagen del lugar
    title?: string;           // Nombre del lugar
    subtitle?: string;        // Descripción corta
  }>;
}
```

---

## Secciones de la Página

### 1. Hero Section

**Elemento:** `<section className="relative min-h-[88vh]">`

La sección más grande y prominente de la página.

Renderiza:
- Imagen de fondo full-width si existe (`homepage.hero.image`)
- Overlay gradual oscuro (`from-black/20 via-black/30 to-black/55`)
- Título grande centrado con animación `<Reveal>`
- Subtítulo opcional con delay en animación
- Font: `font-[var(--font-display)]` (Playfair Display)

**Renderizado Condicional:** Siempre se renderiza (hero.title es requerido)

```tsx
<h1 className="max-w-4xl font-[var(--font-display)] text-4xl font-semibold leading-tight text-white md:text-6xl">
  {homepage.hero.title}
</h1>
{homepage.hero.subtitle ? (
  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
    {homepage.hero.subtitle}
  </p>
) : null}
```

**Tamaño:** `min-h-[88vh]` (casi full viewport)  
**Elemento especial:** `<BookingBar />` se posiciona debajo con `-mt-16` para solapamiento visual

### 2. BookingBar Component

**Elemento:** [components/public/BookingBar.tsx](../components/public/BookingBar.tsx)

Componente flotante debajo del hero que permite:
- Seleccionar rango de fechas (check-in/check-out)
- Navegar a `/properties/[slug]/reservas` con query params

**Props Recibidos:**
```typescript
{
  slug: string; // Inyectado desde página padre
}
```

**Comportamiento:**
- Posicionado con `relative z-30 -mt-16` para solapamiento con hero
- Genera href dinámicamente: `/properties/${slug}/reservas?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
- Botón centrado, responsive
- No tiene duración visible (fija selección de fechas)

### 3. Intro Section

**Elemento:** `<section className="mx-auto mt-24 w-full max-w-4xl px-6 text-center">`

Breve descripción de la propuesta de valor.

Renderiza:
- Heading h2: `homepage.intro.title` (color primario)
- Párrafo: `homepage.intro.paragraph` (whitespace-pre-wrap)
- Animación: `<Reveal>`

**Renderizado Condicional:** Solo si `intro.title || intro.paragraph`

**Typography:**
```tsx
<h2 className="font-[var(--font-display)] text-3xl font-semibold leading-tight text-[color:var(--primary-color)] md:text-4xl">
  {homepage.intro.title}
</h2>
<p className="mx-auto mt-5 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-slate-700 md:text-lg">
  {homepage.intro.paragraph}
</p>
```

### 4. Amenities Section

**Elemento:** `<section className="mx-auto mt-20 grid w-full max-w-7xl gap-10 px-6 md:grid-cols-2">`

Destaca equipimientos y características principales.

Layout Desktop:
```
┌─────────────────────────────────────┐
│ Texto/Amenities │ Imagen Cuadrada  │
│  (grid izq)     │ (aspect-square)  │
└─────────────────────────────────────┘
```

**Lado Izquierdo (Contenido):**
- Título: `amenities.title`
- Descripción: `amenities.paragraph`
- Grid 2-columnas de items:
  ```tsx
  <div className="grid gap-4 sm:grid-cols-2">
    {amenities.items.map((item) => (
      <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <span className="inline-flex ... text-xs font-bold">
          {getAmenityIconLabel(item)}  // "Wi-Fi", "Pool", "Parking", "BBQ", o primeras 2 letras
        </span>
        <span>{item}</span>
      </article>
    ))}
  </div>
  ```

**Lado Derecho (Imagen):**
- Aspect square con border y sombra
- Imagen o fallback gradient
- Border radius 3xl

**Renderizado Condicional:** Siempre se renderiza (amenities es requerido en schema)

### 5. Availability CTA Section

**Elemento:** `<section className="mx-auto mt-20 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center">`

Call-to-action para ver disponibilidad completa y reservar.

Renderiza:
- Título: `availability.title`
- Descripción: `availability.paragraph`
- Link/Button a `/properties/[slug]/reservas`
- Animación: `<Reveal>`

**Renderizado Condicional:** Solo si `availability.title || availability.paragraph`

```tsx
<Link
  href={`/properties/${slug}/reservas`}
  className="mt-6 inline-flex rounded-lg bg-[color:var(--primary-color)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
>
  Ver disponibilidad completa
</Link>
```

**Estilos:**
- Card blanca con border sutil y sombra
- Rounded 3xl
- Padding generoso

### 6. La Zona Carousel

**Elemento:** `<section className="mx-auto mt-20 w-full max-w-7xl px-6">`

Carousel de 3 lugares recomendados o puntos de interés cercanos.

**Header:**
```tsx
<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
  <h3 className="font-[var(--font-display)] text-3xl font-semibold text-[color:var(--primary-color)]">
    La Zona
  </h3>
  <Link href={`/properties/${slug}/turismo`} className="text-sm font-semibold hover:underline">
    Ver guía completa
  </Link>
</div>
```

**Grid de Items:**
```tsx
<div className="grid gap-6 md:grid-cols-3">
  {homepage.areaCarousel.map((item, idx) => (
    <Reveal delay={idx * 0.08}>
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-black/5">
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image src={item.url} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
        <div className="min-h-24 space-y-1 p-4">
          <h4 className="font-[var(--font-display)] font-semibold">{item.title}</h4>
          <p className="text-sm text-slate-600">{item.subtitle}</p>
        </div>
      </article>
    </Reveal>
  ))}
</div>
```

**Renderizado Condicional:** Solo si `areaCarousel.length > 0`

**Layout:**
- Mobile: 1 columna (stack vertical)
- Tablet: 2 columnas
- Desktop: 3 columnas
- Gap: 24px
- Aspect ratio imagen: 4/5 (vertical)
- Overlay gradual from black/60 (abajo) to transparent (arriba)

### 7. Footer CTA Links

**Elemento:** `<div className="mx-auto mt-16 flex w-full max-w-7xl flex-wrap gap-3 px-6">`

Dos botones al final para facilitar navegación:
- "Reservar ahora" → `/properties/[slug]/reservas`
- "Ver detalles" → `/properties/[slug]/la-propiedad`

```tsx
<Link
  href={`/properties/${slug}/reservas`}
  className="rounded-md bg-[color:var(--primary-color)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
>
  Reservar ahora
</Link>
<Link
  href={`/properties/${slug}/la-propiedad`}
  className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-[color:var(--primary-color)] hover:text-[color:var(--primary-color)]"
>
  Ver detalles
</Link>
```

---

## Componentes Reutilizables

### BookingBar.tsx

**Ubicación:** [components/public/BookingBar.tsx](../components/public/BookingBar.tsx)

Componente cliente para seleccionar rango de fechas y navegar a reservas.

**Props:**
```typescript
{
  slug: string; // Inyectado desde página principal
}
```

**Estado Interno:**
```typescript
const [checkIn, setCheckIn] = useState<string>('');
const [checkOut, setCheckOut] = useState<string>('');
```

**Comportamiento:**
- Inicialmente vacío
- Query params desde URL (e.g., `?checkIn=2026-03-20&checkOut=2026-03-25`)
- Link dinámico a reservas con query string

**Estilos:**
- Positioned con `relative z-30 -mt-16` para solapamiento
- Centrado horizontalmente
- Responsive: full-width mobile, constrained desktop
- Colored con primary color

### Reveal.tsx

**Ubicación:** [components/public/Reveal.tsx](../components/public/Reveal.tsx)

Wrapper que anima elementos al entrar en viewport.

**Props:**
```typescript
{
  children: React.ReactNode;
  delay?: number; // segundos antes de animation start
}
```

**Animación:** Fade-in + slide-up al scroll into view

---

## Navegación y Metadata

### Header Activo

El componente `PropertyPublicHeader` detecta automáticamente la ruta activa:

```typescript
const navItems = [
  { href: '', label: 'Home' },              // ← Activa en /properties/[slug]
  { href: '/la-propiedad', label: 'La Propiedad' },
  { href: '/turismo', label: 'Turismo' },
  { href: '/tarifas', label: 'Tarifas' },
  { href: '/contacto', label: 'Contacto' },
];
```

### Metadata (Server-Side)

No se implementa `generateMetadata` en la página home (se busca en layout padre si aplica).

---

## Estilos y Tema

### Variables CSS Inyectadas

En el layout padre ([app/(public)/properties/[slug]/layout.tsx](../app/(public)/properties/%5Bslug%5D/layout.tsx)):

```css
:root {
  --primary: #556B2F;              /* Olive (default) */
  --cream: #FDFCF8;                /* Fondo principal */
  --terracotta: #B25E41;           /* Accent para botones */
  --font-display: 'Playfair Display'; /* Headings */
  --font-body: 'Inter';            /* Párrafos */
}
```

### Clases Tailwind Principales

- **Tipografía:** `font-[var(--font-display)]` en headings
- **Colores:**
  - Fondo: `bg-[color:var(--cream)]`
  - Headings: `text-[color:var(--primary-color)]`
  - Botones primarios: `bg-[color:var(--primary-color)]`
- **Espaciado:** `mt-20`, `mt-24`, `px-6`, `py-10`
- **Bordes:** `rounded-2xl`, `rounded-3xl`, `rounded-lg`
- **Sombras:** `shadow-xl`, `shadow-md shadow-black/5`
- **Responsive:** `md:grid-cols-2`, `md:grid-cols-3`, `md:text-4xl`

### Paleta (Rustic-Modern Minimalism)

- **Primary (Olive Green):** #556B2F
- **Secondary (Terracotta):** #B25E41
- **Cream/Background:** #FDFCF8
- **Text:** Slate-900, Slate-700, Slate-600

---

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│ Backoffice Admin                                         │
│ /admin/properties/[propertyId]/contenidos               │
│ (Contenidos > General > Home)                            │
└────────────────────┬────────────────────────────────────┘
                     │ Guardar JSON
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Prisma Database                                         │
│ Property.pageContent.homepage                           │
└────────────────────┬────────────────────────────────────┘
                     │ Fetch + Parse
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Server Component (page.tsx)                             │
│ - Validación Zod                                        │
│ - Tema CSS inyectado                                    │
│ - Renderizado condicional de secciones                  │
│ - getAmenityIconLabel() helper                          │
└────────────────────┬────────────────────────────────────┘
                     │ Props
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Cliente (Navegador)                                     │
│ - BookingBar (Client: selección de fechas)              │
│ - Reveal (Client: animaciones en scroll)                │
│ - PropertyPublicHeader (Client: nav activa)             │
└─────────────────────────────────────────────────────────┘
```

---

## Helper Functions

### getAmenityIconLabel()

```typescript
function getAmenityIconLabel(item: string): string {
  const normalized = item.toLowerCase();
  if (normalized.includes('wifi')) return 'Wi-Fi';
  if (normalized.includes('piscina')) return 'Piscina';
  if (normalized.includes('parking')) return 'Parking';
  if (normalized.includes('bbq') || normalized.includes('barbacoa')) return 'BBQ';
  return item.slice(0, 2).toUpperCase(); // Default: primeras 2 letras
}
```

Usado en grid de amenities para mostrar etiqueta legible en cada item.

---

## Validación TypeScript & ESLint

- ✅ Tipado fuerte: `PropertyPageContentSchema` + Zod
- ✅ Componentes tipo-seguros: `Readonly<Props>`
- ✅ Keys válidas: sin índices en maps
- ✅ Condicionales lineales: sin ternarias anidadas
- ✅ Complejidad cognitiva: < 20

---

## Ejemplo JSON de Contenido

```json
{
  "homepage": {
    "hero": {
      "image": "https://example.com/hero-landscape.jpg",
      "title": "Bienvenido a El Ferjo",
      "subtitle": "Tu refugio en el corazón de Asturias"
    },
    "intro": {
      "title": "Una fusión de tradición y modernidad",
      "paragraph": "Rehabilitamos una casona familiar respetando...\ny comodidades contemporáneas."
    },
    "amenities": {
      "title": "Equipamiento y Confort",
      "paragraph": "Todo lo que necesitas para una estancia memorable...",
      "items": [
        "WiFi de alta velocidad",
        "Piscina de cloración salina",
        "Parking privado",
        "Aire acondicionado",
        "Cocina gourmet",
        "Smart TV 4K"
      ],
      "image": "https://example.com/amenities.jpg"
    },
    "availability": {
      "title": "Consulta disponibilidad",
      "paragraph": "Revisa nuestro calendario y reserva tu próxima escapada."
    },
    "areaCarousel": [
      {
        "url": "https://example.com/picos.jpg",
        "title": "Picos de Europa",
        "subtitle": "Senderismo y vistas panorámicas a 15 min"
      },
      {
        "url": "https://example.com/playa.jpg",
        "title": "Playas de Asturias",
        "subtitle": "Costa virgen y pueblos pesqueros a 30 min"
      },
      {
        "url": "https://example.com/pueblos.jpg",
        "title": "Pueblos Blancos",
        "subtitle": "Arquitectura tradicional y gastronomía local"
      }
    ]
  }
}
```

---

## Performance Considerations

1. **Image Optimization:**
   - `priority` en hero image
   - `unoptimized={true}` para URLs externas (Google Drive, etc.)
   - `fill` + `object-cover` para aspect ratio consistency

2. **Animations:**
   - `<Reveal>` usa Intersection Observer (lazy trigger)
   - `delay` prop staggers animations (max 0.8s)

3. **Responsive:**
   - Mobile-first Tailwind utilities
   - `md:` breakpoint para desktop layout
   - Grid layouts flex to stack on small screens

---

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Hero image no aparece | URL inválida o externa | Verificar acceso de imagen públicamente |
| BookingBar desaparece | Z-index bajo | Verificar `z-30` + parent `relative` |
| Amenities en 1 columna | Grid no responsive | Asegurase de viewport meta tag |
| Colores desactualizados | Cache stale | Verificar CSS variables en layout |
| Text se solapa con hero | Overlay muy transparente | Aumentar opacidad de `bg-black/*` |
| Carousel items muy grandes | Aspect ratio roto | Verificar `aspect-[4/5]` en areaCarousel |

---

## Próximas Mejoras Opcionales

1. **Video Hero:** Reemplazar imagen con video autoreproducido silenciado
2. **Testimonios:** Sección adicional de reviews de huéspedes anteriores
3. **Virtual Tour:** Integrar tour 360° con Matterport o similar
4. **Pricing Preview:** Mostrar tarifa base en hero o amenities
5. **Dynamic Images:** Lazy load images debajo del fold
6. **Social Proof:** Badges de verificación (Airbnb, Booking, etc.)
7. **Newsletter:** Form de suscripción en footer
8. **Accessibility:** Mejorar contraste de texto en hero overlay
