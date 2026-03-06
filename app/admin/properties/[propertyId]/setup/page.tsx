import { redirect } from 'next/navigation';

export default async function PropertySetupPage({
  params,
}: {
  params: Promise<{ propertyId: string }> | { propertyId: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  redirect(`/admin/properties/${resolvedParams.propertyId}/datos`);
}
