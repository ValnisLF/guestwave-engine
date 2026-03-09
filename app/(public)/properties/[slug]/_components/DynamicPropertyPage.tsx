import { notFound } from 'next/navigation';
import { getPropertyDynamicPageData, type PropertyDynamicPageKey } from '../_lib/page-content';

type DynamicPropertyPageProps = {
  slug: string;
  pageKey: PropertyDynamicPageKey;
  defaults: {
    title: string;
    subtitle: string;
    description: string;
  };
};

export async function DynamicPropertyPage({ slug, pageKey, defaults }: DynamicPropertyPageProps) {
  const pageData = await getPropertyDynamicPageData(slug, pageKey, defaults);

  if (!pageData) {
    notFound();
  }

  return (
    <section className="py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{pageData.propertyName}</p>
          <h1 className="text-4xl font-bold text-slate-900">{pageData.title}</h1>
          <p className="text-lg text-slate-600">{pageData.subtitle}</p>
        </header>

        {pageData.heroImageUrl ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <img
              src={pageData.heroImageUrl}
              alt={pageData.title}
              className="h-[360px] w-full object-cover"
            />
          </div>
        ) : null}

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{pageData.description}</p>
        </article>

        {pageData.sections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pageData.sections.map((section, index) => (
              <article key={`${section.title ?? 'section'}-${index}`} className="rounded-xl border border-slate-200 bg-white p-5">
                {section.title ? (
                  <h2 className="mb-2 text-xl font-semibold text-primary">{section.title}</h2>
                ) : null}
                <p className="whitespace-pre-wrap text-slate-700">{section.text}</p>
                {section.imageUrl ? (
                  <img
                    src={section.imageUrl}
                    alt={section.title ?? `Seccion ${index + 1}`}
                    className="mt-4 h-48 w-full rounded-md object-cover"
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {pageData.gallery.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {pageData.gallery.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-md border border-slate-200">
                <img src={imageUrl} alt={`${pageData.title} ${index + 1}`} className="h-28 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
