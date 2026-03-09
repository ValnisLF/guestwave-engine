import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { updatePropertySettings } from '@/app/admin/properties/_actions';
import { AppearanceSettingsForm } from './_components/AppearanceSettingsForm';

type AppearancePageProps = {
  params: Promise<{ propertyId: string }> | { propertyId: string };
};

export default async function PropertyAparienciaPage({ params }: AppearancePageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const propertyId = resolvedParams.propertyId;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      accentColor: true,
      fontFamily: true,
      homeHeroTitle: true,
      homeHeroSubtitle: true,
      homeDescription: true,
    },
  });

  if (!property) {
    redirect('/admin');
  }

  const propertySlug = property.slug;

  async function saveAppearanceSettings(
    _state: { success: boolean; error?: string },
    formData: FormData
  ) {
    'use server';

    const result = await updatePropertySettings({
      propertyId,
      primaryColor: String(formData.get('primaryColor') ?? ''),
      accentColor: String(formData.get('accentColor') ?? ''),
      fontFamily: String(formData.get('fontFamily') ?? ''),
      homeHeroTitle: String(formData.get('homeHeroTitle') ?? ''),
      homeHeroSubtitle: String(formData.get('homeHeroSubtitle') ?? ''),
      homeDescription: String(formData.get('homeDescription') ?? ''),
    });

    if (result.success) {
      revalidatePath(`/admin/properties/${propertyId}/apariencia`);
      revalidatePath(`/properties/${propertySlug}`);
      revalidatePath(`/properties/${propertySlug}/la-propiedad`);
      revalidatePath(`/properties/${propertySlug}/turismo`);
      revalidatePath(`/properties/${propertySlug}/tarifas`);
      revalidatePath(`/properties/${propertySlug}/contacto`);
      revalidatePath(`/properties/${propertySlug}/reservas`);
    }

    return {
      success: result.success,
      error: result.error,
    };
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Apariencia</h1>
        <p className="mt-1 text-sm text-slate-600">
          Personaliza diseño y contenidos principales de la Home para {property.name}.
        </p>
      </div>

      <AppearanceSettingsForm
        action={saveAppearanceSettings}
        initialValues={{
          propertyId: property.id,
          primaryColor: property.primaryColor ?? '#1E40AF',
          accentColor: property.accentColor ?? '#0F766E',
          fontFamily: property.fontFamily ?? 'Inter',
          homeHeroTitle: property.homeHeroTitle ?? '',
          homeHeroSubtitle: property.homeHeroSubtitle ?? '',
          homeDescription: property.homeDescription ?? '',
        }}
      />
    </section>
  );
}
