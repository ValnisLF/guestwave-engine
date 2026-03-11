'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProperty, createPropertyInvite } from '@/app/admin/properties/_actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

type PropertyOption = {
  id: string;
  name: string;
  slug: string;
};

const FIELD_LABEL_CLASS = 'text-xs font-medium text-slate-700';

export function AdminWorkspaceActions({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [creatingProperty, setCreatingProperty] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER'>('OWNER');
  const [invitePropertyId, setInvitePropertyId] = useState(properties[0]?.id ?? '');

  const onCreateProperty = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingProperty(true);
    setError(null);
    setSuccess(null);

    const result = await createProperty({
      name: name.trim(),
      slug: slug.trim(),
      basePrice: 120,
      cleaningFee: 0,
      minimumStay: 1,
      depositPercentage: 30,
      amenities: {},
      imageUrls: [],
    });

    setCreatingProperty(false);

    if (!result.success) {
      setError(result.error ?? 'Error creating property');
      return;
    }

    setName('');
    setSlug('');
    setSuccess('Property created successfully');
    router.refresh();
  };

  const onSendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingInvite(true);
    setError(null);
    setSuccess(null);

    const result = await createPropertyInvite({
      propertyId: invitePropertyId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    setSendingInvite(false);

    if (!result.success) {
      setError(result.error ?? 'Error sending invite');
      return;
    }

    const acceptUrl = result.data?.acceptUrl as string | undefined;
    const emailStatus = result.data?.emailStatus as string | undefined;

    setInviteEmail('');
    if (emailStatus === 'sent') {
      setSuccess('Invite sent by email successfully');
    } else if (acceptUrl) {
      setSuccess(`Invite created. Email could not be sent. Manual link: ${acceptUrl}`);
    } else {
      setSuccess('Invite created successfully');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create property</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <form onSubmit={onCreateProperty} className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label className={FIELD_LABEL_CLASS} htmlFor="create-property-name">Property name</Label>
              <Input
                id="create-property-name"
                placeholder="Property name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className={FIELD_LABEL_CLASS} htmlFor="create-property-slug">Property slug</Label>
              <Input
                id="create-property-slug"
                placeholder="property-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={creatingProperty} className="w-full">
              {creatingProperty ? 'Creating...' : 'Create property'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite collaborator</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <Alert>Create your first property to send OWNER invites.</Alert>
          ) : (
            <form onSubmit={onSendInvite} className="space-y-3">
              <div className="space-y-1">
                <Label className={FIELD_LABEL_CLASS} htmlFor="invite-property-id">Property</Label>
                <Select
                  id="invite-property-id"
                  value={invitePropertyId}
                  onChange={(e) => setInvitePropertyId(e.target.value)}
                  required
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} ({property.slug})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label className={FIELD_LABEL_CLASS} htmlFor="invite-collaborator-email">Collaborator email</Label>
                <Input
                  id="invite-collaborator-email"
                  type="email"
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className={FIELD_LABEL_CLASS} htmlFor="invite-role">Role</Label>
                <Select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'OWNER')}
                >
                  <option value="OWNER">OWNER</option>
                </Select>
              </div>

              <Button type="submit" disabled={sendingInvite} className="w-full">
                {sendingInvite ? 'Sending...' : 'Send invite'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
