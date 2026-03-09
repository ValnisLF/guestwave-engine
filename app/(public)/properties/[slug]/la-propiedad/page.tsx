import { DynamicPropertyPage } from '../_components/DynamicPropertyPage';

export default async function PropertyLaPropiedadPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;

  return (
    <DynamicPropertyPage
      slug={resolvedParams.slug}
      pageKey="laPropiedad"
      defaults={{
        title: 'La Propiedad',
        subtitle: 'Descubre cada espacio y detalle de tu estancia',
        description:
          'Esta propiedad combina comodidad, diseño y ubicación para ofrecer una experiencia excepcional.',
      }}
    />
  );
}
