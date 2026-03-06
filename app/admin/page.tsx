import Link from 'next/link';
import { redirect } from 'next/navigation';
import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getAuthenticatedAdminEmail,
  getAuthenticatedAdminIdentity,
  getAuthorizedPropertiesByEmail,
} from '@/lib/admin-auth';
import { AdminWorkspaceActions } from './_components/AdminWorkspaceActions';

export default async function AdminHomePage() {
  const email = await getAuthenticatedAdminEmail('component');
  const identity = await getAuthenticatedAdminIdentity();

  if (!email) {
    redirect('/admin/login');
  }

  const isSystemAdmin = identity?.role === 'ADMIN';

  const properties: Array<{ id: string; name: string; slug: string }> =
    (await getAuthorizedPropertiesByEmail(email)) as Array<{ id: string; name: string; slug: string }>;

  const propertyRows: React.ReactNode[] = [];
  for (const property of properties as Array<{ id: string; name: string; slug: string }>) {
    propertyRows.push(
      <div
        key={property.id}
        className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
      >
        <div>
          <div className="font-medium text-slate-900">{property.name}</div>
          <div className="text-xs text-slate-600">/{property.slug}</div>
        </div>
        <Link href={`/admin/properties/${property.id}/overview`}>
          <Button size="sm">Manage</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Admin Workspace</h1>

      {isSystemAdmin ? (
        <div className="mb-6">
          <AdminWorkspaceActions properties={properties} />
        </div>
      ) : null}

      {properties.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No properties assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">
              Your account does not have access to any properties yet. Ask an owner to invite you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Select a property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">{propertyRows}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
