import type { Metadata } from 'next';
import type { JSX } from 'react';
import type { Editorial } from '@/data/lookbook';
import { getLookbookPageContent } from '@/lib/cms';
import { getAllLookbookEntries } from '@/lib/lookbookCms';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { getRequestLocale } from '@/lib/request-locale';
import { localizeHref, type EcomLocale } from '@/lib/locales';

export const revalidate = 3600;

function issueLabel(issue: string, locale: EcomLocale): string {
  return `${locale === 'pl' ? 'Wydanie' : 'Issue'} ${issue}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getLookbookPageContent(locale);
  const title = `${content.masthead.title} - STARGATER`;
  const description = content.masthead.description;
  return {
    title,
    description,
    openGraph: { type: 'website', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function EditorialCard({
  editorial,
  minHeight = '420px',
  viewLabel,
  locale,
}: {
  editorial: Editorial;
  minHeight?: string;
  viewLabel: string;
  locale: EcomLocale;
}): JSX.Element {
  return (
    <a
      href={localizeHref(`/products/${editorial.productSlug}`, locale)}
      className="group relative block overflow-hidden"
      style={{ minHeight, background: editorial.gradient }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
        }}
      />

      {/* Hover vignette */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }}
      />

      {/* Issue number */}
      <div className="absolute top-6 left-6 z-10">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: editorial.textColor,
            opacity: 0.5,
          }}
        >
          {issueLabel(editorial.issue, locale)}
        </span>
      </div>

      {/* Season badge */}
      <div className="absolute top-6 right-6 z-10">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: editorial.textColor,
            opacity: 0.4,
          }}
        >
          {editorial.season}
        </span>
      </div>

      {/* Content — slides up on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 p-7 z-10 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500"
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.3rem, 2.5vw, 2rem)',
            fontWeight: 300,
            color: editorial.textColor,
            lineHeight: 1.1,
            marginBottom: '0.4rem',
          }}
        >
          {editorial.title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.82rem',
            fontWeight: 300,
            color: editorial.textColor,
            opacity: 0.7,
            lineHeight: 1.6,
            marginBottom: '1rem',
          }}
        >
          {editorial.subtitle}
        </p>
        <div
          className="flex items-center gap-2 type-label"
          style={{ color: editorial.textColor, opacity: 0.9 }}
        >
          {viewLabel}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Title always visible on large hero */}
      <div className="absolute bottom-8 left-7 z-10 group-hover:opacity-0 transition-opacity duration-300">
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1rem, 1.5vw, 1.4rem)',
            fontWeight: 300,
            color: editorial.textColor,
            opacity: 0.6,
            lineHeight: 1.1,
          }}
        >
          {editorial.title}
        </h3>
      </div>
    </a>
  );
}

export default async function LookbookPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const [entries, content] = await Promise.all([
    getAllLookbookEntries(locale),
    getLookbookPageContent(locale),
  ]);
  const [hero] = entries;
  if (!hero) {
    return (
      <>
        <SiteNav />
        <main style={{ paddingTop: 'var(--nav-h)', background: '#0a0908', minHeight: '100vh' }}>
          <div className="px-8 md:px-16 py-20">
            <h1 className="type-display-lg" style={{ color: '#f5f0eb' }}>{content.emptyTitle}</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '1rem' }}>{content.emptyBody}</p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const second = entries[1] ?? hero;
  const third = entries[2] ?? hero;
  const fourth = entries[3] ?? hero;
  const fifth = entries[4] ?? hero;
  const sixth = entries[5] ?? hero;
  const seventh = entries[6] ?? hero;
  const eighth = entries[7] ?? hero;

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', background: '#0a0908', minHeight: '100vh' }}>

        {/* ── Masthead ───────────────────────────────────────────── */}
        <div className="px-8 md:px-16 py-16 md:py-20 relative overflow-hidden">
          {/* Outlined LOOKBOOK watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(4rem, 14vw, 14rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px rgba(255,255,255,0.04)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {content.masthead.watermark}
            </span>
          </div>

          <div className="relative z-10 max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div
                  className="type-label mb-3"
                  style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em' }}
                >
                  {content.masthead.eyebrow}
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                    fontWeight: 300,
                    color: '#f5f0eb',
                    lineHeight: 1.0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {content.masthead.title}
                </h1>
                <p
                  className="mt-4"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.7,
                    maxWidth: '380px',
                  }}
                >
                  {content.masthead.description}
                </p>
              </div>

              <div className="text-right">
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                    lineHeight: 2,
                  }}
                >
                  <div>{content.masthead.issueRange}</div>
                  <div>{content.masthead.dateRange}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Primary grid ───────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '3px',
          }}
        >
          {/* Hero large — cols 1-8, rows 1-2 */}
          <div style={{ gridColumn: '1 / 9', gridRow: '1 / 3' }}>
            <a
              href={localizeHref(`/products/${hero.productSlug}`, locale)}
              className="group relative block overflow-hidden h-full"
              style={{ minHeight: '640px', background: hero.gradient }}
            >
              <div
                className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                  backgroundSize: '150px',
                }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }}
              />
              <div className="absolute top-8 left-8 z-10">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: hero.textColor, opacity: 0.45 }}>
                  {issueLabel(hero.issue, locale)} · {content.featuredLabel}
                </span>
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14 z-10">
                <div
                  className="transition-all duration-500"
                  style={{ transform: 'translateY(0)' }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                      fontWeight: 300,
                      color: hero.textColor,
                      lineHeight: 1.0,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {hero.title}
                  </h2>
                  <p
                    className="opacity-0 group-hover:opacity-100 transition-all duration-500"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      fontWeight: 300,
                      color: hero.textColor,
                      opacity: 0,
                      lineHeight: 1.7,
                      maxWidth: '420px',
                      marginBottom: '1.5rem',
                      transitionDelay: '0.05s',
                    }}
                  >
                    {hero.subtitle}
                  </p>
                  <div
                    className="flex items-center gap-2 type-label opacity-0 group-hover:opacity-100 transition-all duration-500"
                    style={{ color: hero.textColor, transitionDelay: '0.1s' }}
                  >
                    {content.viewLabel}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Rotated season */}
              <div
                className="absolute right-8 top-1/2 -translate-y-1/2 rotate-90 hidden md:block"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: hero.textColor, opacity: 0.2 }}
              >
                {hero.season}
              </div>
            </a>
          </div>

          {/* Top-right small */}
          <div style={{ gridColumn: '9 / 13', gridRow: '1 / 2' }}>
            <EditorialCard editorial={second} minHeight="320px" viewLabel={content.viewLabel} locale={locale} />
          </div>

          {/* Bottom-right small */}
          <div style={{ gridColumn: '9 / 13', gridRow: '2 / 3' }}>
            <EditorialCard editorial={third} minHeight="320px" viewLabel={content.viewLabel} locale={locale} />
          </div>
        </div>

        {/* ── Full-width editorial strip ──────────────────────────── */}
        <div style={{ gap: '3px', marginTop: '3px' }}>
          <a
            href={localizeHref(`/products/${fourth.productSlug}`, locale)}
            className="group relative block overflow-hidden"
            style={{ minHeight: '380px', background: fourth.gradient }}
          >
            <div
              className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                backgroundSize: '150px',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-10 md:px-20 z-10">
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: fourth.textColor, opacity: 0.4 }}>
                  {issueLabel(fourth.issue, locale)}
                </span>
                <h2
                  className="mt-3"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
                    fontWeight: 300,
                    color: fourth.textColor,
                    lineHeight: 1.0,
                  }}
                >
                  {fourth.title}
                </h2>
              </div>
              <div className="hidden md:block text-right" style={{ maxWidth: '340px' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 300, color: fourth.textColor, opacity: 0.6, lineHeight: 1.75 }}>
                  {fourth.subtitle}
                </p>
                <div className="flex items-center justify-end gap-2 mt-4 type-label group-hover:gap-4 transition-all duration-300" style={{ color: fourth.textColor }}>
                  {content.viewLabel}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* ── Three-column row ────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: '3px', marginTop: '3px' }}
        >
          {[fifth, sixth, seventh].map((ed) => (
            <EditorialCard key={ed.id} editorial={ed} minHeight="500px" viewLabel={content.viewLabel} locale={locale} />
          ))}
        </div>

        {/* ── Final row: card + CTA ───────────────────────────────── */}
        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{ gap: '3px', marginTop: '3px' }}
        >
          <EditorialCard editorial={eighth} minHeight="380px" viewLabel={content.viewLabel} locale={locale} />

          {/* CTA panel */}
          <div
            className="relative flex flex-col items-center justify-center px-16 py-20 text-center"
            style={{ minHeight: '380px', background: '#141210', border: 'none' }}
          >
            {/* Outlined numeral */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              aria-hidden="true"
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22rem',
                  fontWeight: 300,
                  color: 'transparent',
                  WebkitTextStroke: '1px rgba(255,255,255,0.04)',
                  lineHeight: 1,
                }}
              >
                8
              </span>
            </div>

            <div className="relative z-10">
              <div
                className="type-label mb-6"
                style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}
              >
                {content.cta.issueLabel}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                  fontWeight: 300,
                  color: '#f5f0eb',
                  lineHeight: 1.1,
                  marginBottom: '1.25rem',
                }}
              >
                {content.cta.titleLine1}<br />{content.cta.titleLine2}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.8,
                  marginBottom: '2.5rem',
                  maxWidth: '280px',
                }}
              >
                {content.cta.body}
              </p>
              <a
                href={localizeHref(content.cta.href, locale)}
                className="inline-flex items-center gap-3 type-label px-8 py-4 transition-all duration-300 hover:gap-5"
                style={{ background: '#f5f0eb', color: '#0a0908' }}
              >
                {content.cta.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* ── Archive line ─────────────────────────────────────────── */}
        <div
          className="px-8 md:px-16 py-10 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            {content.archive.label}
          </span>
          <a
            href={localizeHref(content.archive.ctaHref, locale)}
            className="type-label flex items-center gap-2 transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {content.archive.ctaLabel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
