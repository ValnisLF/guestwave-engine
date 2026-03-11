import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { updatePropertyContent } from '@/app/admin/properties/_actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  createEmptyPropertyPageContent,
  PropertyPageContentSchema,
  type PropertyPageContent,
} from '@/lib/schemas/property';
import { ObjectArrayEditor, StringArrayEditor } from './_components/ArrayFieldEditors';
import { ContenidosSaveActions } from './_components/ContenidosSaveActions';
import { ContenidosSubmitForm } from './_components/ContenidosSubmitForm';

type PageProps = {
  params: Promise<{ propertyId: string }> | { propertyId: string };
};

type SaveState = {
  success: boolean;
  error?: string;
};

type LabeledInputProps = React.ComponentProps<typeof Input> & {
  label?: string;
  wrapperClassName?: string;
};

type LabeledTextareaProps = React.ComponentProps<typeof Textarea> & {
  label?: string;
  wrapperClassName?: string;
};

const FIELD_LABEL_CLASS = 'text-xs font-medium text-slate-700';

function getFieldId(name: string) {
  return `field-${name.replaceAll('.', '-')}`;
}

function LabeledInput({ label, wrapperClassName = 'space-y-1', id, name, ...props }: Readonly<LabeledInputProps>) {
  const resolvedName = typeof name === 'string' ? name : '';
  const resolvedId = id ?? (resolvedName ? getFieldId(resolvedName) : undefined);

  return (
    <div className={wrapperClassName}>
      <Label className={FIELD_LABEL_CLASS} htmlFor={resolvedId}>{label ?? resolvedName}</Label>
      <Input id={resolvedId} name={name} {...props} />
    </div>
  );
}

function LabeledTextarea({
  label,
  wrapperClassName = 'space-y-1',
  id,
  name,
  ...props
}: Readonly<LabeledTextareaProps>) {
  const resolvedName = typeof name === 'string' ? name : '';
  const resolvedId = id ?? (resolvedName ? getFieldId(resolvedName) : undefined);

  return (
    <div className={wrapperClassName}>
      <Label className={FIELD_LABEL_CLASS} htmlFor={resolvedId}>{label ?? resolvedName}</Label>
      <Textarea id={resolvedId} name={name} {...props} />
    </div>
  );
}

function getValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function setByPath(target: unknown, path: string, value: unknown) {
  const parts = path.split('.');
  let current = target as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const next = current[key];
    if (typeof next !== 'object' || next === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastPart = parts.at(-1);
  if (!lastPart) return;
  current[lastPart] = value;
}

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseMaybeJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function sanitizePayload(content: PropertyPageContent): PropertyPageContent {
  const cleaned = structuredClone(content);

  const optionalStringPaths = [
    'theme.primaryColor',
    'theme.accentColor',
    'theme.creamColor',
    'header.logoUrl',
    'footer.logoUrl',
    'footer.shortText',
    'footer.instagramUrl',
    'footer.googleUrl',
    'footer.phone',
    'footer.email',
    'footer.address',
    'footer.coordinates',
    'homepage.hero.image',
    'homepage.hero.subtitle',
    'homepage.intro.title',
    'homepage.intro.paragraph',
    'homepage.amenities.paragraph',
    'homepage.amenities.image',
    'homepage.availability.title',
    'homepage.availability.paragraph',
    'laPropiedad.hero.image',
    'laPropiedad.intro.title',
    'laPropiedad.intro.paragraph',
    'laPropiedad.groundFloor.paragraph',
    'laPropiedad.groundFloor.image',
    'laPropiedad.firstFloor.paragraph',
    'laPropiedad.firstFloor.image',
    'laPropiedad.exterior.paragraph',
    'laPropiedad.exterior.image',
    'turismo.hero.image',
    'reservas.hero.image',
    'reservas.intro.title',
    'reservas.intro.paragraph',
    'reservas.instructions.title',
    'reservas.instructions.paragraph',
    'tarifas.hero.image',
    'tarifas.intro.title',
    'tarifas.intro.paragraph',
    'tarifas.pricingTable',
    'contacto.hero.image',
    'contacto.phone',
    'contacto.email',
    'contacto.address',
  ] as const;

  for (const path of optionalStringPaths) {
    const raw = getPathValue(cleaned, path);
    setByPath(cleaned, path, emptyToUndefined(raw));
  }

  cleaned.homepage.amenities.items = (cleaned.homepage.amenities.items ?? []).filter(Boolean);
  cleaned.laPropiedad.groundFloor.items = (cleaned.laPropiedad.groundFloor.items ?? []).filter(Boolean);
  cleaned.laPropiedad.firstFloor.items = (cleaned.laPropiedad.firstFloor.items ?? []).filter(Boolean);
  cleaned.laPropiedad.exterior.items = (cleaned.laPropiedad.exterior.items ?? []).filter(Boolean);
  cleaned.reservas.instructions.items = (cleaned.reservas.instructions.items ?? []).filter(Boolean);
  cleaned.tarifas.rules = (cleaned.tarifas.rules ?? []).filter(Boolean);
  cleaned.tarifas.policy = (cleaned.tarifas.policy ?? []).filter(Boolean);

  cleaned.homepage.areaCarousel = (cleaned.homepage.areaCarousel ?? [])
    .map((item) => ({
      url: emptyToUndefined(item.url) as string | undefined,
      title: emptyToUndefined(item.title) as string | undefined,
      subtitle: emptyToUndefined(item.subtitle) as string | undefined,
    }))
    .filter((item) => item.url)
    .map((item) => ({
      url: item.url as string,
      title: item.title,
      subtitle: item.subtitle,
    }));

  cleaned.laPropiedad.gallery = (cleaned.laPropiedad.gallery ?? [])
    .map((item) => ({
      url: emptyToUndefined(item.url) as string | undefined,
      label: emptyToUndefined(item.label) as string | undefined,
      alt: emptyToUndefined(item.alt) as string | undefined,
    }))
    .filter((item) => item.url)
    .map((item) => ({
      url: item.url as string,
      label: item.label,
      alt: item.alt,
    }));

  const cleanCards = (cards: PropertyPageContent['turismo']['queHacer']) =>
    cards
      .map((item) => ({
        image: emptyToUndefined(item.image) as string | undefined,
        title: (item.title ?? '').trim(),
        subtitle: emptyToUndefined(item.subtitle) as string | undefined,
        link: emptyToUndefined(item.link) as string | undefined,
      }))
      .filter((item) => item.image && item.title)
      .map((item) => ({
        image: item.image as string,
        title: item.title,
        subtitle: item.subtitle,
        link: item.link,
      }));

  cleaned.turismo.queHacer = cleanCards(cleaned.turismo.queHacer ?? []);
  cleaned.turismo.queVisitar = cleanCards(cleaned.turismo.queVisitar ?? []);
  cleaned.turismo.queComer = cleanCards(cleaned.turismo.queComer ?? []);
  cleaned.tarifas.offers = cleanCards(cleaned.tarifas.offers ?? []);

  return cleaned;
}

function getPathValue(target: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, target);
}

export default async function PropertyContenidosPage({ params }: Readonly<PageProps>) {
  const resolvedParams = params instanceof Promise ? await params : params;

  const property = await prisma.property.findUnique({
    where: { id: resolvedParams.propertyId },
    select: { id: true, name: true, slug: true, pageContent: true },
  });

  if (!property) {
    redirect('/admin');
  }

  const safeProperty = property;

  const initialResult = PropertyPageContentSchema.safeParse(property.pageContent);
  const initial = initialResult.success ? initialResult.data : createEmptyPropertyPageContent();

  async function saveContent(_state: SaveState, formData: FormData): Promise<SaveState> {
    'use server';

    try {
      const draft = structuredClone(initial);

      for (const [path, formValue] of formData.entries()) {
        if (typeof formValue !== 'string') continue;
        setByPath(draft, path, parseMaybeJson(formValue));
      }

      const payload = PropertyPageContentSchema.parse(sanitizePayload(draft));

      const result = await updatePropertyContent({
        propertyId: safeProperty.id,
        pageContent: payload,
      });

      if (result.success) {
        revalidatePath(`/admin/properties/${safeProperty.id}/contenidos`);
        revalidatePath(`/properties/${safeProperty.slug}`, 'layout');
        revalidatePath(`/properties/${safeProperty.slug}`);
        revalidatePath(`/properties/${safeProperty.slug}/la-propiedad`);
        revalidatePath(`/properties/${safeProperty.slug}/turismo`);
        revalidatePath(`/properties/${safeProperty.slug}/reservas`);
        revalidatePath(`/properties/${safeProperty.slug}/tarifas`);
        revalidatePath(`/properties/${safeProperty.slug}/contacto`);
        return { success: true };
      }

      return { success: false, error: result.error ?? 'No se pudo guardar el contenido' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error validando el formulario',
      };
    }
  }

  return (
    <ContenidosSubmitForm action={saveContent}>
      <Card>
        <CardHeader>
          <CardTitle>Contenidos (estructura fija) - {safeProperty.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="homepage">Homepage</TabsTrigger>
                <TabsTrigger value="laPropiedad">La Propiedad</TabsTrigger>
                <TabsTrigger value="turismo">Turismo</TabsTrigger>
                <TabsTrigger value="reservas">Reservas</TabsTrigger>
                <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
                <TabsTrigger value="contacto">Contacto</TabsTrigger>
              </TabsList>

            <TabsContent value="general" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="theme-primary">theme.primaryColor</Label>
                    <Input id="theme-primary" name="theme.primaryColor" defaultValue={initial.theme?.primaryColor ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="theme-accent">theme.accentColor</Label>
                    <Input id="theme-accent" name="theme.accentColor" defaultValue={initial.theme?.accentColor ?? ''} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="theme-cream">theme.creamColor</Label>
                    <Input id="theme-cream" name="theme.creamColor" defaultValue={initial.theme?.creamColor ?? ''} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="header-logo">header.logoUrl</Label>
                    <Input id="header-logo" name="header.logoUrl" defaultValue={initial.header.logoUrl ?? ''} />
                  </div>

                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-logo">footer.logoUrl</Label>
                    <Input id="footer-logo" name="footer.logoUrl" defaultValue={initial.footer.logoUrl ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-short">footer.shortText</Label>
                    <Input id="footer-short" name="footer.shortText" defaultValue={initial.footer.shortText ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-instagram">footer.instagramUrl</Label>
                    <Input id="footer-instagram" name="footer.instagramUrl" defaultValue={initial.footer.instagramUrl ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-google">footer.googleUrl</Label>
                    <Input id="footer-google" name="footer.googleUrl" defaultValue={initial.footer.googleUrl ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-phone">footer.phone</Label>
                    <Input id="footer-phone" name="footer.phone" defaultValue={initial.footer.phone ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-email">footer.email</Label>
                    <Input id="footer-email" name="footer.email" defaultValue={initial.footer.email ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-address">footer.address</Label>
                    <Input id="footer-address" name="footer.address" defaultValue={initial.footer.address ?? ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_LABEL_CLASS} htmlFor="footer-coordinates">footer.coordinates</Label>
                    <Input id="footer-coordinates" name="footer.coordinates" defaultValue={initial.footer.coordinates ?? ''} />
                  </div>
                </div>

              <ContenidosSaveActions />
            </TabsContent>

              <TabsContent value="homepage" className="space-y-3">
                <LabeledInput name="homepage.hero.image" defaultValue={initial.homepage.hero.image} placeholder="homepage.hero.image" />
                <LabeledInput name="homepage.hero.title" defaultValue={initial.homepage.hero.title} placeholder="homepage.hero.title" />
                <LabeledInput name="homepage.hero.subtitle" defaultValue={initial.homepage.hero.subtitle ?? ''} placeholder="homepage.hero.subtitle" />
                <LabeledInput name="homepage.intro.title" defaultValue={initial.homepage.intro.title ?? ''} placeholder="homepage.intro.title" />
                <LabeledTextarea name="homepage.intro.paragraph" defaultValue={initial.homepage.intro.paragraph ?? ''} placeholder="homepage.intro.paragraph" rows={3} />
                <LabeledInput name="homepage.amenities.title" defaultValue={initial.homepage.amenities.title} placeholder="homepage.amenities.title" />
                <LabeledTextarea name="homepage.amenities.paragraph" defaultValue={initial.homepage.amenities.paragraph ?? ''} placeholder="homepage.amenities.paragraph" rows={3} />
                <StringArrayEditor name="homepage.amenities.items" label="homepage.amenities.items" initialValue={initial.homepage.amenities.items ?? []} />
                <LabeledInput name="homepage.amenities.image" defaultValue={initial.homepage.amenities.image ?? ''} placeholder="homepage.amenities.image" />
                <LabeledInput name="homepage.availability.title" defaultValue={initial.homepage.availability.title ?? ''} placeholder="homepage.availability.title" />
                <LabeledTextarea name="homepage.availability.paragraph" defaultValue={initial.homepage.availability.paragraph ?? ''} placeholder="homepage.availability.paragraph" rows={2} />
                <ObjectArrayEditor name="homepage.areaCarousel" label="homepage.areaCarousel" initialValue={initial.homepage.areaCarousel} fields={[{ key: 'url', label: 'url' }, { key: 'title', label: 'title' }, { key: 'subtitle', label: 'subtitle' }]} />
                <ContenidosSaveActions />
              </TabsContent>

              <TabsContent value="laPropiedad" className="space-y-3">
                <LabeledInput name="laPropiedad.hero.image" defaultValue={initial.laPropiedad.hero.image} placeholder="laPropiedad.hero.image" />
                <LabeledInput name="laPropiedad.hero.title" defaultValue={initial.laPropiedad.hero.title} placeholder="laPropiedad.hero.title" />
                <LabeledInput name="laPropiedad.intro.title" defaultValue={initial.laPropiedad.intro.title ?? ''} placeholder="laPropiedad.intro.title" />
                <LabeledTextarea name="laPropiedad.intro.paragraph" defaultValue={initial.laPropiedad.intro.paragraph ?? ''} placeholder="laPropiedad.intro.paragraph" rows={3} />
                <LabeledInput name="laPropiedad.groundFloor.title" defaultValue={initial.laPropiedad.groundFloor.title} placeholder="laPropiedad.groundFloor.title" />
                <LabeledTextarea name="laPropiedad.groundFloor.paragraph" defaultValue={initial.laPropiedad.groundFloor.paragraph ?? ''} placeholder="laPropiedad.groundFloor.paragraph" rows={2} />
                <StringArrayEditor name="laPropiedad.groundFloor.items" label="laPropiedad.groundFloor.items" initialValue={initial.laPropiedad.groundFloor.items ?? []} />
                <LabeledInput name="laPropiedad.groundFloor.image" defaultValue={initial.laPropiedad.groundFloor.image ?? ''} placeholder="laPropiedad.groundFloor.image" />
                <LabeledInput name="laPropiedad.firstFloor.title" defaultValue={initial.laPropiedad.firstFloor.title} placeholder="laPropiedad.firstFloor.title" />
                <LabeledTextarea name="laPropiedad.firstFloor.paragraph" defaultValue={initial.laPropiedad.firstFloor.paragraph ?? ''} placeholder="laPropiedad.firstFloor.paragraph" rows={2} />
                <StringArrayEditor name="laPropiedad.firstFloor.items" label="laPropiedad.firstFloor.items" initialValue={initial.laPropiedad.firstFloor.items ?? []} />
                <LabeledInput name="laPropiedad.firstFloor.image" defaultValue={initial.laPropiedad.firstFloor.image ?? ''} placeholder="laPropiedad.firstFloor.image" />
                <LabeledInput name="laPropiedad.exterior.title" defaultValue={initial.laPropiedad.exterior.title} placeholder="laPropiedad.exterior.title" />
                <LabeledTextarea name="laPropiedad.exterior.paragraph" defaultValue={initial.laPropiedad.exterior.paragraph ?? ''} placeholder="laPropiedad.exterior.paragraph" rows={2} />
                <StringArrayEditor name="laPropiedad.exterior.items" label="laPropiedad.exterior.items" initialValue={initial.laPropiedad.exterior.items ?? []} />
                <LabeledInput name="laPropiedad.exterior.image" defaultValue={initial.laPropiedad.exterior.image ?? ''} placeholder="laPropiedad.exterior.image" />
                <ObjectArrayEditor name="laPropiedad.gallery" label="laPropiedad.gallery" initialValue={initial.laPropiedad.gallery} fields={[{ key: 'url', label: 'url' }, { key: 'label', label: 'label' }, { key: 'alt', label: 'alt' }]} />
                <ContenidosSaveActions />
              </TabsContent>

              <TabsContent value="turismo" className="space-y-3">
                <LabeledInput name="turismo.hero.image" defaultValue={initial.turismo.hero.image} placeholder="turismo.hero.image" />
                <LabeledInput name="turismo.hero.title" defaultValue={initial.turismo.hero.title} placeholder="turismo.hero.title" />
                <ObjectArrayEditor name="turismo.queHacer" label="turismo.queHacer" initialValue={initial.turismo.queHacer} fields={[{ key: 'image', label: 'image' }, { key: 'title', label: 'title' }, { key: 'subtitle', label: 'subtitle' }, { key: 'link', label: 'link' }]} />
                <ObjectArrayEditor name="turismo.queVisitar" label="turismo.queVisitar" initialValue={initial.turismo.queVisitar} fields={[{ key: 'image', label: 'image' }, { key: 'title', label: 'title' }, { key: 'subtitle', label: 'subtitle' }, { key: 'link', label: 'link' }]} />
                <ObjectArrayEditor name="turismo.queComer" label="turismo.queComer" initialValue={initial.turismo.queComer} fields={[{ key: 'image', label: 'image' }, { key: 'title', label: 'title' }, { key: 'subtitle', label: 'subtitle' }, { key: 'link', label: 'link' }]} />
                <ContenidosSaveActions />
              </TabsContent>

              <TabsContent value="reservas" className="space-y-3">
                <LabeledInput name="reservas.hero.image" defaultValue={initial.reservas.hero.image} placeholder="reservas.hero.image" />
                <LabeledInput name="reservas.hero.title" defaultValue={initial.reservas.hero.title} placeholder="reservas.hero.title" />
                <LabeledInput name="reservas.intro.title" defaultValue={initial.reservas.intro.title ?? ''} placeholder="reservas.intro.title" />
                <LabeledTextarea name="reservas.intro.paragraph" defaultValue={initial.reservas.intro.paragraph ?? ''} placeholder="reservas.intro.paragraph" rows={3} />
                <LabeledInput name="reservas.instructions.title" defaultValue={initial.reservas.instructions.title ?? ''} placeholder="reservas.instructions.title" />
                <LabeledTextarea name="reservas.instructions.paragraph" defaultValue={initial.reservas.instructions.paragraph ?? ''} placeholder="reservas.instructions.paragraph" rows={3} />
                <StringArrayEditor name="reservas.instructions.items" label="reservas.instructions.items" initialValue={initial.reservas.instructions.items ?? []} />
                <ContenidosSaveActions />
              </TabsContent>

              <TabsContent value="tarifas" className="space-y-3">
                <LabeledInput name="tarifas.hero.image" defaultValue={initial.tarifas.hero.image} placeholder="tarifas.hero.image" />
                <LabeledInput name="tarifas.hero.title" defaultValue={initial.tarifas.hero.title} placeholder="tarifas.hero.title" />
                <LabeledInput name="tarifas.intro.title" defaultValue={initial.tarifas.intro.title ?? ''} placeholder="tarifas.intro.title" />
                <LabeledTextarea name="tarifas.intro.paragraph" defaultValue={initial.tarifas.intro.paragraph ?? ''} placeholder="tarifas.intro.paragraph" rows={3} />
                <LabeledTextarea name="tarifas.pricingTable" defaultValue={typeof initial.tarifas.pricingTable === 'string' ? initial.tarifas.pricingTable : ''} placeholder="tarifas.pricingTable" rows={2} />
                <ObjectArrayEditor name="tarifas.offers" label="tarifas.offers" initialValue={initial.tarifas.offers} fields={[{ key: 'image', label: 'image' }, { key: 'title', label: 'title' }, { key: 'subtitle', label: 'subtitle' }, { key: 'link', label: 'link' }]} />
                <StringArrayEditor name="tarifas.rules" label="tarifas.rules" initialValue={initial.tarifas.rules ?? []} />
                <StringArrayEditor name="tarifas.policy" label="tarifas.policy" initialValue={initial.tarifas.policy ?? []} />
                <ContenidosSaveActions />
              </TabsContent>

              <TabsContent value="contacto" className="space-y-3">
                <LabeledInput name="contacto.hero.image" defaultValue={initial.contacto.hero.image} placeholder="contacto.hero.image" />
                <LabeledInput name="contacto.hero.title" defaultValue={initial.contacto.hero.title} placeholder="contacto.hero.title" />
                <LabeledInput name="contacto.intro.title" defaultValue={initial.contacto.intro.title} placeholder="contacto.intro.title" />
                <LabeledTextarea name="contacto.intro.paragraph" defaultValue={initial.contacto.intro.paragraph} placeholder="contacto.intro.paragraph" rows={3} />
                <LabeledInput name="contacto.phone" defaultValue={initial.contacto.phone ?? ''} placeholder="contacto.phone" />
                <LabeledInput name="contacto.email" defaultValue={initial.contacto.email ?? ''} placeholder="contacto.email" />
                <LabeledInput name="contacto.address" defaultValue={initial.contacto.address ?? ''} placeholder="contacto.address" />
                <ContenidosSaveActions />
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </ContenidosSubmitForm>
  );
}
