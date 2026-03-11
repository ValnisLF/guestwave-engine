import Link from 'next/link';

type PropertyPublicFooterProps = {
  slug: string;
  title?: string;
  logoUrl?: string;
  shortText?: string;
  instagramUrl?: string;
  googleUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export function PropertyPublicFooter({
  slug,
  title,
  logoUrl,
  shortText,
  instagramUrl,
  googleUrl,
  phone,
  email,
  address,
}: Readonly<PropertyPublicFooterProps>) {
  return (
    <footer className="mt-20 bg-[#1f2517] px-6 py-16 text-slate-300">
      <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-3">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white">
            {logoUrl ? (
              <img src={logoUrl} alt={title || 'Logo'} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">EG</span>
            )}
            <span className="text-xl font-semibold">{title || 'GuestWave'}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {shortText || 'Alquiler vacacional en un entorno natural, disenado para desconectar y disfrutar.'}
          </p>
          <div className="flex gap-3">
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-3 py-2 text-xs text-white">
                Instagram
              </a>
            ) : null}
            {googleUrl ? (
              <a href={googleUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-3 py-2 text-xs text-white">
                Google
              </a>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Navegacion</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href={`/properties/${slug}`}>Home</Link></li>
            <li><Link href={`/properties/${slug}/la-propiedad`}>La Propiedad</Link></li>
            <li><Link href={`/properties/${slug}/turismo`}>Turismo</Link></li>
            <li><Link href={`/properties/${slug}/tarifas`}>Tarifas</Link></li>
            <li><Link href={`/properties/${slug}/contacto`}>Contacto</Link></li>
          </ul>
        </div>

        <div className="space-y-4 text-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Contacto</h4>
          {address ? <p>{address}</p> : null}
          {phone ? <p>{phone}</p> : null}
          {email ? <p>{email}</p> : null}
        </div>
      </div>
      <div className="mx-auto mt-10 w-full max-w-7xl border-t border-white/10 pt-6 text-xs text-slate-500">
        {new Date().getFullYear()} {title || 'GuestWave'}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
