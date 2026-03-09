import { DynamicPropertyPage } from '../_components/DynamicPropertyPage';

export default async function PropertyContactoPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;

  return (
    <DynamicPropertyPage
      slug={resolvedParams.slug}
      pageKey="contacto"
      defaults={{
        title: 'Contacto',
        subtitle: 'Estamos aqui para ayudarte antes y durante tu reserva',
        description:
          'Si tienes dudas sobre la propiedad, disponibilidad o servicios, ponte en contacto y te responderemos rapidamente.',
      }}
    />
  );
}
