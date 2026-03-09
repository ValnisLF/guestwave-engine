import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { updatePropertyPageContentSection } from '@/app/admin/properties/_actions';
import { PageContentSectionsEditor } from './_components/PageContentSectionsEditor';

type SectionKey = 'homePage' | 'laPropiedad' | 'turismo' | 'reservas' | 'tarifas' | 'contacto';

const sectionFieldMap: Record<SectionKey, string[]> = {
  homePage: [
    'overlayHeroTitle',
    'overlayHeroSubtitle',
    'shortBioTitle',
    'shorBioText',
    'amenitiesTitle',
    'amenitiesText',
  ],
  laPropiedad: [
    'overlayHeroTitle',
    'overlayHeroSubtitle',
    'shortBioTitle',
    'shorBioText',
    'groundFloorTitle',
    'groundFloorText',
    'firstFloorTitle',
    'firstFloorText',
    'exteriorTitle',
    'exteriorText',
  ],
  turismo: [
    'overlayHeroTitle',
    'overlayHeroSubtitle',
    'shortBioTitle',
    'shorBioText',
    'queHacerTitle',
    'queVisitarTitle',
    'queComerTitle',
    'queHacerText',
    'queVisitarText',
    'queComerText',
  ],
  reservas: [
    'overlayHeroTitle',
    'overlayHeroSubtitle',
    'shortBioTitle',
    'shorBioText',
    'instructions',
  ],
  tarifas: [
    'overlayHeroTitle',
    'overlayHeroSubtitle',
    'shortBioTitle',
    'shorBioText',
    'temporadaAlta',
    'temporadaMedia',
    'temporadaBaja',
    'politicas',
  ],
  contacto: [
    'overlayHeroTitle',
    'overlayHeroSubtitle',
    'shortBioTitle',
    'shorBioText',
    'telefono',
    'email',
    'direccion',
  ],
};

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export default async function PropertyContenidosPage({
  params,
}: {
  params: Promise<{ propertyId: string }> | { propertyId: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const property = await prisma.property.findUnique({
    where: { id: resolvedParams.propertyId },
    select: {
      id: true,
      name: true,
      slug: true,
      pageContent: true,
    },
  });

  if (!property) {
    redirect('/admin');
  }

  const propertyId = property.id;
  const propertySlug = property.slug;

  const pageContentRoot = toRecord(property.pageContent);

  async function saveSection(
    _state: { success: boolean; error?: string; section?: string },
    formData: FormData
  ) {
    'use server';

    const rawSection = String(formData.get('section') ?? '') as SectionKey;
    const fields = sectionFieldMap[rawSection];

    if (!fields) {
      return {
        success: false,
        error: 'Seccion invalida',
      };
    }

    const sectionData: Record<string, string> = {};
    for (const field of fields) {
      sectionData[field] = String(formData.get(field) ?? '');
    }

    const result = await updatePropertyPageContentSection({
      propertyId,
      section: rawSection,
      sectionData,
    });

    if (result.success) {
      revalidatePath(`/admin/properties/${propertyId}/contenidos`);
      revalidatePath(`/properties/${propertySlug}`);
      revalidatePath(`/properties/${propertySlug}/la-propiedad`);
      revalidatePath(`/properties/${propertySlug}/turismo`);
      revalidatePath(`/properties/${propertySlug}/reservas`);
      revalidatePath(`/properties/${propertySlug}/tarifas`);
      revalidatePath(`/properties/${propertySlug}/contacto`);
    }

    return {
      success: result.success,
      error: result.error,
      section: rawSection,
    };
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Contenidos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Edita cada seccion de la web publica sin tocar JSON manualmente.
        </p>
      </div>

      <PageContentSectionsEditor
        action={saveSection}
        initialValues={{
          homePage: sectionFieldMap.homePage.reduce(
            (acc, field) => {
              const section = toRecord(pageContentRoot.homePage);
              acc[field] = getString(section[field]);
              return acc;
            },
            {} as Record<string, string>
          ),
          laPropiedad: sectionFieldMap.laPropiedad.reduce(
            (acc, field) => {
              const section = toRecord(pageContentRoot.laPropiedad);
              acc[field] = getString(section[field]);
              return acc;
            },
            {} as Record<string, string>
          ),
          turismo: sectionFieldMap.turismo.reduce(
            (acc, field) => {
              const section = toRecord(pageContentRoot.turismo);
              acc[field] = getString(section[field]);
              return acc;
            },
            {} as Record<string, string>
          ),
          reservas: sectionFieldMap.reservas.reduce(
            (acc, field) => {
              const section = toRecord(pageContentRoot.reservas);
              acc[field] = getString(section[field]);
              return acc;
            },
            {} as Record<string, string>
          ),
          tarifas: sectionFieldMap.tarifas.reduce(
            (acc, field) => {
              const section = toRecord(pageContentRoot.tarifas);
              acc[field] = getString(section[field]);
              return acc;
            },
            {} as Record<string, string>
          ),
          contacto: sectionFieldMap.contacto.reduce(
            (acc, field) => {
              const section = toRecord(pageContentRoot.contacto);
              acc[field] = getString(section[field]);
              return acc;
            },
            {} as Record<string, string>
          ),
        }}
      />
    </section>
  );
}
