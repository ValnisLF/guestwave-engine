import { DynamicPropertyPage } from '../_components/DynamicPropertyPage';

export default async function PropertyTarifasPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;

  return (
    <DynamicPropertyPage
      slug={resolvedParams.slug}
      pageKey="tarifas"
      defaults={{
        title: 'Tarifas',
        subtitle: 'Informacion de precios y condiciones de reserva',
        description:
          'Consulta los importes orientativos, politicas y detalles de pago para planificar tu estancia.',
      }}
    />
  );
}
