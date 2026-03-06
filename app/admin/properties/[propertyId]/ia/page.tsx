import { redirect } from 'next/navigation';
import { getOwnerWorkspaceProperty } from '../_components/property-data';
import { OwnerPropertyWorkspace } from '../_components/OwnerPropertyWorkspace';

export default async function PropertyIAPage({
  params,
}: {
  params: Promise<{ propertyId: string }> | { propertyId: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const property = await getOwnerWorkspaceProperty(resolvedParams.propertyId);

  if (!property) {
    redirect('/admin');
  }

  return <OwnerPropertyWorkspace property={property} section="ia" />;
}
