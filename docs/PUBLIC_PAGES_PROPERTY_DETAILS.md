# Página Pública: La Propiedad (`/properties/[slug]/la-propiedad`)

## Descripción General

La página **"La Propiedad"** es una página de detalles exhaustivos sobre la propiedad. Presenta múltiples secciones con contenido dinámico, galería de imágenes filtrable y visualización alternada de texto e imágenes.

**Ruta:** `/properties/[slug]/la-propiedad`  
**Componente Root:** [app/(public)/properties/[slug]/la-propiedad/page.tsx](../app/(public)/properties/%5Bslug%5D/la-propiedad/page.tsx)  
**Datos de Origen:** `Property.pageContent.laPropiedad` (Zod validated)

---

## Estructura de Datos

```typescript
// Schema: PropertyPageContentSchema.laPropiedad
{
  hero: {
    image?: string;        // URL de imagen full-width
    title: string;         // Título principal (e.g., "La Propiedad")
  };
  intro: {
    title?: string;        // Etiqueta small caps (e.g., "Esencia & Alma")
    paragraph?: string;    // Descripción general
  };
  groundFloor: {
    title: string;         // e.g., "El Corazón de la Casa"
    paragraph?: string;    // Descripción detallada
    items?: string[];      // Lista de amenidades/características
    image?: string;        // Foto de la sección
  };
  firstFloor: {
    title: string;
    paragraph?: string;
    items?: string[];
    image?: string;
  };
  exterior: {
    title: string;
    paragraph?: string;
    items?: string[];
    image?: string;
  };
  gallery: MediaItemSchema[]; // { url, label?, alt? }
}
```

### MediaItemSchema (Galería)

```typescript
{
  url: string;           // URL de la imagen (validada con URL.canParse)
  label?: string;        // Tags separados por comas: "Baños, Master, Ducha"
  alt?: string;          // Descripción accesible
}
```

---

## Secciones de la Página

### 1. Hero Section

**Elemento:** `<section className="relative min-h-[50vh]">`

Renderiza:
- Imagen de fondo full-width si existe (`laPropiedad.hero.image`)
- Overlay oscuro gradual (`from-black/20 to-black/55`)
- Título grande centrado con animación `<Reveal>`
- Font: `font-[var(--font-display)]` (Playfair Display)

**Renderizado Condicional:** Siempre se renderiza (hero.title es requerido)

```tsx
<h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-semibold leading-tight text-white md:text-7xl">
  {laPropiedad.hero.title}
</h1>
```

### 2. Intro Section

**Elemento:** `<section className="mx-auto mt-20 w-full max-w-4xl px-6 text-center">`

Renderiza:
- Etiqueta small uppercase: `laPropiedad.intro.title`
- Heading h2: `laPropiedad.intro.paragraph`
- Animación: `<Reveal>`

**Renderizado Condicional:** Solo si `intro.title || intro.paragraph`

### 3. Planta Baja Section

**Componente:** `<FloorSection />`

Props:
```typescript
{
  title: laPropiedad.groundFloor.title,
  paragraph: laPropiedad.groundFloor.paragraph,
  image: laPropiedad.groundFloor.image,
  items: laPropiedad.groundFloor.items,
  backgroundColor: true,           // Agrega bg-[primary]/5
  iconType: "check",               // Usa check_circle icons
}
```

Layout:
- Desktop: Texto izquierda → Imagen derecha
- Fondo semi-transparente del color primario
- Animaciones escalonadas con `Reveal`

**Renderizado Condicional:** Solo si `groundFloor.title`

### 4. Primera Planta Section

**Componente:** `<FloorSection />`

Props:
```typescript
{
  title: laPropiedad.firstFloor.title,
  paragraph: laPropiedad.firstFloor.paragraph,
  image: laPropiedad.firstFloor.image,
  items: laPropiedad.firstFloor.items,
  isReversed: true,                // Imagen izquierda → Texto derecha
  iconType: "bed",                 // Usa bed/bathtub/air icons
}
```

Layout:
- Orden invertida (imagen a la izquierda)
- Fondo blanco/limpio
- Iconos varían por posición

**Renderizado Condicional:** Solo si `firstFloor.title`

### 5. Exteriores Section

**Componente:** `<FloorSection />`

Props:
```typescript
{
  title: laPropiedad.exterior.title,
  paragraph: laPropiedad.exterior.paragraph,
  image: laPropiedad.exterior.image,
  items: laPropiedad.exterior.items,
  backgroundColor: true,
  iconType: "pool",                // Usa pool/nature/deck icons
}
```

Layout: Similar a Planta Baja (texto izq, imagen derecha)

**Renderizado Condicional:** Solo si `exterior.title`

### 6. Smart Gallery Section

**Componente:** `<GalleryFilter />`

Features:
- Extrae automáticamente tags del campo `label` de cada imagen
- Genera botones de filtro dinámicos
- Masonry grid responsivo: 1col (mobile) → 2col (tablet) → 3col (desktop)
- Hover effects en imágenes
- Mensaje si no hay resultados para el filtro seleccionado

**Renderizado Condicional:** Solo si `gallery.length > 0`

---

## Componentes Internos

### FloorSection.tsx

**Ubicación:** [app/(public)/properties/[slug]/la-propiedad/_components/FloorSection.tsx](../app/(public)/properties/%5Bslug%5D/la-propiedad/_components/FloorSection.tsx)

Componente reutilizable para secciones alternadas de texto e imagen.

**Props:**
```typescript
interface FloorSectionProps {
  title: string;                   // Título de la sección
  paragraph?: string;              // Descripción
  image?: string;                  // Imagen (opcional)
  items?: string[];                // Lista de items
  isReversed?: boolean;            // Invertir orden imagen/texto (default: false)
  backgroundColor?: boolean;       // Agregar bg-primary/5 (default: false)
  iconType?: 'check' | 'bed' | 'pool'; // Tipo de icono (default: 'check')
}
```

**Lógica Interna:**
- Usa `getIconForItem(index, iconType)` para determinar icono por posición
- Items se renderizan sin índices en keys (usan el contenido del item)
- Animaciones con `<Reveal delay={...}>`
- Renderizado condicional de imagen si existe

**Flex Layout:**
```
Desktop (md:grid-cols-2):
┌──────────────────────────────────────┐
│ Texto/Items │ Imagen (si existe) │
│  (isReversed invierte orden)         │
└──────────────────────────────────────┘

Mobile:
┌──────────────────────────────────────┐
│ Imagen (si existe) │
│ Texto/Items        │
└──────────────────────────────────────┘
```

### GalleryFilter.tsx

**Ubicación:** [app/(public)/properties/[slug]/la-propiedad/_components/GalleryFilter.tsx](../app/(public)/properties/%5Bslug%5D/la-propiedad/_components/GalleryFilter.tsx)

Componente cliente que gestiona filtros y visualización de galería.

**Props:**
```typescript
interface GalleryFilterProps {
  items: GalleryItem[];
}

interface GalleryItem {
  url: string;
  label?: string;      // "Baños, Master, Ducha"
  alt?: string;
}
```

**Estado:**
```typescript
const [activeFilter, setActiveFilter] = useState<string>('Todo');
```

**Lógica:**
1. Extrae tags únicos de `label` (separados por comas)
2. Genera array de botones: ['Todo', ...tags]
3. Filtra items según activeFilter
4. Renderiza masonry grid

**Estilos de Botones:**
- Active: `bg-primary text-white`
- Inactive: `bg-primary/10 text-primary hover:bg-primary/20`

**Grid:**
```
Mobile: columns-1
Tablet: columns-2 gap-4
Desktop: columns-3 gap-4

Aspect ratios: variable (masonry)
Border radius: rounded-xl
Shadows: shadow-md shadow-black/5
```

---

## Navegación y Metadata

### Header Activo

El componente `PropertyPublicHeader` detecta automáticamente la ruta activa usando `usePathname()`:

```typescript
const navItems = [
  { href: '', label: 'Home' },
  { href: '/la-propiedad', label: 'La Propiedad' },  // ← Activa en esta página
  { href: '/turismo', label: 'Turismo' },
  { href: '/tarifas', label: 'Tarifas' },
  { href: '/contacto', label: 'Contacto' },
];
```

### Metadata Dinámico

```typescript
export async function generateMetadata({
  params,
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({ where: { slug } });
  return {
    title: `${property.name} · La Propiedad - GuestWave`,
    description: property.description || 'Discover this amazing property',
  };
}
```

---

## Estilos y Tema

### Variables CSS Inyectadas

En el layout padre ([app/(public)/properties/[slug]/layout.tsx](../app/(public)/properties/%5Bslug%5D/layout.tsx)):

```css
:root {
  --primary: #556B2F;              /* Olive (default) o desde theme */
  --cream: #FDFCF8;                /* Cream */
  --terracotta: #B25E41;           /* Accent */
  --font-display: ...;             /* Playfair Display */
  --font-body: ...;                /* Inter */
}
```

### Clases Tailwind

- **Tipografía:** `font-[var(--font-display)]` para headings
- **Colores:**
  - Fondo: `bg-[color:var(--cream)]`
  - Texto primario: `text-[color:var(--primary-color)]`
  - Fondos secundarios: `bg-[color:var(--primary)]/5`
- **Espaciado:** `mt-20`, `py-12 md:py-24`
- **Bordes:** `rounded-xl` en imágenes (16px)
- **Sombras:** `shadow-xl` en imágenes, `shadow-md shadow-black/5` en cards

---

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│ Backoffice Admin                                         │
│ /admin/properties/[propertyId]/contenidos               │
│ (Contenidos > General > La Propiedad)                   │
└────────────────────┬────────────────────────────────────┘
                     │ Guardar JSON
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Prisma Database                                         │
│ Property.pageContent.laPropiedad                        │
└────────────────────┬────────────────────────────────────┘
                     │ Fetch + Parse
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Server Component                                        │
│ /properties/[slug]/la-propiedad/page.tsx                │
│ - Validación Zod                                        │
│ - Tema CSS inyectado                                    │
│ - Renderizado condicional de secciones                  │
└────────────────────┬────────────────────────────────────┘
                     │ Props
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Cliente (Navegador)                                     │
│ - FloorSection (Server + Reveal animations)             │
│ - GalleryFilter (Client: filtros interactivos)          │
│ - PropertyPublicHeader (Client: nav activa)             │
└─────────────────────────────────────────────────────────┘
```

---

## Validación TypeScript & ESLint

- ✅ Tipado fuerte: `PropertyPageContentSchema` + Zod
- ✅ Componentes tipo-seguros: `Readonly<Props>`
- ✅ Keys sin índices: items => `key={item}` (no `idx`)
- ✅ Ternarias planas: sin nidificación
- ✅ Complejidad cognitiva: < 15

---

## Ejemplo JSON de Contenido

```json
{
  "laPropiedad": {
    "hero": {
      "image": "https://example.com/hero.jpg",
      "title": "La Propiedad"
    },
    "intro": {
      "title": "Esencia & Alma",
      "paragraph": "Un refugio diseñado para reconectar..."
    },
    "groundFloor": {
      "title": "El Corazón de la Casa",
      "paragraph": "Nuestra cocina de diseño minimalista...",
      "items": [
        "Cocina gourmet totalmente equipada",
        "Salón con muros de piedra original",
        "Comedor para 8 comensales"
      ],
      "image": "https://example.com/kitchen.jpg"
    },
    "firstFloor": {
      "title": "Descanso Elevado",
      "paragraph": "Subiendo la escalera de madera...",
      "items": [
        "Dormitorios con vistas panorámicas",
        "Baños en suite con ducha de lluvia",
        "Vigas de castaño restauradas"
      ],
      "image": "https://example.com/bedroom.jpg"
    },
    "exterior": {
      "title": "Inmersión en el Paisaje",
      "paragraph": "Nuestra piscina infinita...",
      "items": [
        "Piscina de cloración salina",
        "Jardín privado de 2.000 m²",
        "Porche amueblado con barbacoa"
      ],
      "image": "https://example.com/pool.jpg"
    },
    "gallery": [
      {
        "url": "https://example.com/bathroom.jpg",
        "label": "Baños, Master Bathroom",
        "alt": "Modern bathroom with stone details"
      },
      {
        "url": "https://example.com/bedroom2.jpg",
        "label": "Dormitorios, Master Bedroom",
        "alt": "Cozy master bedroom interior"
      },
      {
        "url": "https://example.com/porch.jpg",
        "label": "Exteriores, Porche",
        "alt": "Outdoor wooden porch area"
      }
    ]
  }
}
```

---

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Sección no aparece | Campo `title` faltante o vacío | Verificar JSON en admin > contenidos |
| Filtros no funcionan | Tags malformados (no separados por comas) | Formato: `"Baños, Master, Ducha"` |
| Imágenes distorsionadas | Aspect ratio inconsistente | Usar masonry (float a izq/derecha natural) |
| Colores desactualizados | Cache stale | Usar `revalidatePath()` en update action |
| Header no muestra activa | Pathname mismatch | Verificar ruta exacta en navItems |

---

## Próximas Mejoras Opcionales

1. **Lightbox Modal:** Click en galería abre imagen full-screen
2. **Lazy Loading:** `loading="lazy"` en `<Image>` para scroll performance
3. **Breadcrumbs:** Navegación: Home > La Propiedad
4. **SEO Structured Data:** JSON-LD para image galleries
5. **Analytics:** Track filtros más usados (Google Analytics event)
6. **Social Share:** Botones compartir por WhatsApp/Instagram
