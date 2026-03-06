import { redirect } from 'next/navigation';
import { getAuthenticatedAdminEmail, getAuthorizedPropertiesByEmail } from '@/lib/admin-auth';

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ propertyId?: string }> | { propertyId?: string };
}) {
  const email = await getAuthenticatedAdminEmail('component');
  if (!email) {
    redirect('/admin/login');
  }

  const params =
    searchParams && searchParams instanceof Promise ? await searchParams : searchParams;
  const selectedPropertyId = params?.propertyId;

  const authorizedProperties = await getAuthorizedPropertiesByEmail(email);

  if (selectedPropertyId) {
    const allowed = authorizedProperties.some((property) => property.id === selectedPropertyId);
    if (allowed) {
      redirect(`/admin/properties/${selectedPropertyId}/overview`);
    }
  }

  if (authorizedProperties.length > 0) {
    redirect(`/admin/properties/${authorizedProperties[0].id}/overview`);
  }

  redirect('/admin');
}
