import { DynamicPropertyPage } from '../_components/DynamicPropertyPage';

export default async function PropertyTurismoPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;

  return (
    <DynamicPropertyPage
      slug={resolvedParams.slug}
      pageKey="turismo"
      defaults={{
        title: 'Turismo',
        subtitle: 'Planes y experiencias cerca de la propiedad',
        description:
          'Explora actividades, gastronomia local y lugares imprescindibles para disfrutar al maximo tu viaje.',
      }}
    />
  );
}
