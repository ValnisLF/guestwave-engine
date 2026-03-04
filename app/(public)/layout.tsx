import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GuestWave - Premium Property Rentals',
  description: 'Find and book beautiful properties for your next vacation',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-blue-600">
              GuestWave
            </a>
            <nav className="hidden md:flex space-x-8">
              <a href="/properties" className="text-slate-600 hover:text-slate-900 transition-colors">
                Properties
              </a>
              <a href="/about" className="text-slate-600 hover:text-slate-900 transition-colors">
                About
              </a>
              <a href="/contact" className="text-slate-600 hover:text-slate-900 transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-slate-900">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600 text-sm">
            © 2026 GuestWave. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
