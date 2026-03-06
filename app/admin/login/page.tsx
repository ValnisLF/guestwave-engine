import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { createAdminSession } from '@/lib/admin-session';
import { hasAnyAdminUser } from '@/lib/admin-auth';
import { verifyPassword } from '@/lib/password';

async function signInAction(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/admin/login?error=Email%20and%20password%20are%20required');
  }

  const user = await (prisma as any).user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect('/admin/login?error=Invalid%20email%20or%20password');
  }

  await createAdminSession(user.id);

  redirect('/admin');
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const params =
    searchParams && searchParams instanceof Promise ? await searchParams : searchParams;

  const hasUsers = await hasAnyAdminUser();
  if (!hasUsers) {
    redirect('/admin/setup');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          {params?.error ? <Alert variant="destructive">{params.error}</Alert> : null}

          <form action={signInAction} className="mt-4 space-y-3">
            <Input name="email" type="email" placeholder="you@example.com" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
