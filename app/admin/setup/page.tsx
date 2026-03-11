import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { createAdminSession } from '@/lib/admin-session';
import { hashPassword } from '@/lib/password';

const FIELD_LABEL_CLASS = 'text-xs font-medium text-slate-700';

async function setupFirstAdminAction(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!email || !password) {
    redirect('/admin/setup?error=Email%20and%20password%20are%20required');
  }

  if (password.length < 8) {
    redirect('/admin/setup?error=Password%20must%20have%20at%20least%208%20characters');
  }

  if (password !== confirmPassword) {
    redirect('/admin/setup?error=Passwords%20do%20not%20match');
  }

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    redirect('/admin/login?error=Initial%20setup%20already%20completed');
  }

  const created = await (prisma as any).user.create({
    data: {
      email,
      role: 'ADMIN',
      passwordHash: hashPassword(password),
    },
    select: { id: true },
  });

  await createAdminSession(created.id);
  redirect('/admin');
}

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const params =
    searchParams && searchParams instanceof Promise ? await searchParams : searchParams;

  const hasUsers = (await prisma.user.count()) > 0;
  if (hasUsers) {
    redirect('/admin/login');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Initial owner setup</CardTitle>
        </CardHeader>
        <CardContent>
          {params?.error ? <Alert variant="destructive">{params.error}</Alert> : null}

          <p className="mb-4 text-sm text-slate-700">
            Create the first owner account for the backoffice. This account is independent from Supabase dashboard users.
          </p>

          <form action={setupFirstAdminAction} className="space-y-3">
            <div className="space-y-1">
              <Label className={FIELD_LABEL_CLASS} htmlFor="setup-email">Email</Label>
              <Input id="setup-email" name="email" type="email" placeholder="owner@example.com" required />
            </div>
            <div className="space-y-1">
              <Label className={FIELD_LABEL_CLASS} htmlFor="setup-password">Password</Label>
              <Input id="setup-password" name="password" type="password" placeholder="Create password" minLength={8} required />
            </div>
            <div className="space-y-1">
              <Label className={FIELD_LABEL_CLASS} htmlFor="setup-confirm-password">Confirm password</Label>
              <Input
                id="setup-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Create owner account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
