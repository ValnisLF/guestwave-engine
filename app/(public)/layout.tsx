import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GuestWave - Premium Property Rentals',
  description: 'Find and book beautiful properties for your next vacation',
};

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{`body{--primary:#2563EB;--accent:#0F766E;--primary-color:var(--primary);--accent-color:var(--accent);}`}</style>
      <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="w-full text-slate-900">
        {children}
      </main>
      </div>
    </>
  );
}
