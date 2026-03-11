import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { createAdminSession } from '@/lib/admin-session';
import { ensureAppUserByEmail } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/password';

const FIELD_LABEL_CLASS = 'text-xs font-medium text-slate-700';

async function acceptInviteAction(formData: FormData) {
  'use server';

  const token = String(formData.get('token') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!token || !email || !password) {
    redirect(`/admin/invite/${token}?error=Missing%20required%20fields`);
  }

  if (password.length < 8) {
    redirect(`/admin/invite/${token}?error=Password%20must%20have%20at%20least%208%20characters`);
  }

  if (password !== confirmPassword) {
    redirect(`/admin/invite/${token}?error=Passwords%20do%20not%20match`);
  }

  const invite = await (prisma as any).propertyInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    redirect(`/admin/invite/${token}?error=Invite%20not%20found`);
  }

  if (invite.acceptedAt) {
    redirect('/admin/login?error=Invite%20already%20used.%20Please%20sign%20in.');
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    redirect(`/admin/invite/${token}?error=Invite%20has%20expired`);
  }

  if (invite.email.toLowerCase() !== email) {
    redirect(`/admin/invite/${token}?error=Email%20does%20not%20match%20this%20invite`);
  }

  const appUser = await ensureAppUserByEmail(email);

  await (prisma as any).user.update({
    where: { id: appUser.id },
    data: {
      role: 'OWNER',
      passwordHash: hashPassword(password),
    },
  });

  await (prisma as any).propertyMembership.upsert({
    where: {
      userId_propertyId: {
        userId: appUser.id,
        propertyId: invite.propertyId,
      },
    },
    update: { role: invite.role },
    create: {
      userId: appUser.id,
      propertyId: invite.propertyId,
      role: invite.role,
    },
  });

  await (prisma as any).propertyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await createAdminSession(appUser.id);

  redirect(`/admin/properties?propertyId=${invite.propertyId}`);
}

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }> | { token: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const token = resolvedParams.token;

  const resolvedSearch =
    searchParams && searchParams instanceof Promise ? await searchParams : searchParams;

  const invite = await (prisma as any).propertyInvite.findUnique({
    where: { token },
    include: {
      property: {
        select: { name: true, slug: true },
      },
    },
  });

  if (!invite) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-6">
        <Alert variant="destructive">Invite not found.</Alert>
      </div>
    );
  }

  const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
  const isAccepted = Boolean(invite.acceptedAt);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Accept admin invite</CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedSearch?.error ? <Alert variant="destructive">{resolvedSearch.error}</Alert> : null}

          <p className="mb-4 mt-3 text-sm text-slate-700">
            You were invited to manage <strong>{invite.property.name}</strong>.
          </p>

          {isAccepted ? (
            <Alert variant="success">This invite was already accepted. Please sign in.</Alert>
          ) : isExpired ? (
            <Alert variant="destructive">This invite has expired. Ask the owner for a new invite.</Alert>
          ) : (
            <form action={acceptInviteAction} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-1">
                <Label className={FIELD_LABEL_CLASS} htmlFor="invite-email">Email</Label>
                <Input id="invite-email" name="email" type="email" defaultValue={invite.email} required />
              </div>
              <div className="space-y-1">
                <Label className={FIELD_LABEL_CLASS} htmlFor="invite-password">Password</Label>
                <Input id="invite-password" name="password" type="password" placeholder="Create password" minLength={8} required />
              </div>
              <div className="space-y-1">
                <Label className={FIELD_LABEL_CLASS} htmlFor="invite-confirm-password">Confirm password</Label>
                <Input
                  id="invite-confirm-password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Create access and continue
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
