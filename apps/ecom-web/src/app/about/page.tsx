import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { getAboutContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';
import { localizeHref } from '@/lib/locales';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getAboutContent(locale);
  return {
    title: `${content.hero.title} - ARCANA`,
    description: content.hero.body,
  };
}

const ARTISAN_GRADIENTS = [
  'linear-gradient(145deg, #C4A882 0%, #8C7260 100%)',
  'linear-gradient(145deg, #2C4A3E 0%, #1A3028 100%)',
  'linear-gradient(145deg, #5C3D2A 0%, #3E2618 100%)',
  'linear-gradient(145deg, #4A5A6A 0%, #2C3A48 100%)',
];

export default async function AboutPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getAboutContent(locale);

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div
          className="relative min-h-[80vh] flex items-end px-8 md:px-20 py-16 md:py-24 overflow-hidden grain"
          style={{ background: 'linear-gradient(160deg, #18110A 0%, #2C2018 60%, #1A1612 100%)' }}
        >
          {/* Giant background text */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(8rem, 22vw, 26rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px rgba(255,255,255,0.06)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                userSelect: 'none',
              }}
            >
              {content.hero.watermark}
            </span>
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="type-label mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {content.hero.eyebrow}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                fontWeight: 300,
                lineHeight: 1.02,
                color: '#EDE8E0',
                marginBottom: '1.5rem',
              }}
            >
              {content.hero.title}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.05rem',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.85,
              }}
            >
              {content.hero.body}
            </p>
          </div>
        </div>

        {/* ── Origin story ──────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* Text */}
          <div className="px-8 md:px-16 py-16 md:py-24" style={{ borderRight: '1px solid var(--border)' }}>
            <div className="type-label mb-6" style={{ color: 'var(--accent)' }}>
              {content.origin.eyebrow}
            </div>
            <h2 className="type-display-md mb-8" style={{ color: 'var(--fg)' }}>
              {content.origin.title}
            </h2>
            <div className="space-y-5">
              {content.origin.paragraphs.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 1.85,
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Stats column */}
          <div className="px-8 md:px-16 py-16 md:py-24 flex flex-col justify-between gap-12" style={{ background: 'var(--surface)' }}>
            <div className="type-label mb-4" style={{ color: 'var(--muted)' }}>{content.statsEyebrow}</div>
            {content.stats.map(({ value, label, sub }) => (
              <div key={label} className="flex items-start gap-6" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    lineHeight: 1,
                    minWidth: '4rem',
                  }}
                >
                  {value}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 400, color: 'var(--fg)', marginBottom: '0.2rem' }}>
                    {label}
                  </div>
                  <div className="type-label" style={{ color: 'var(--muted)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Timeline ──────────────────────────────────────────────── */}
        <div className="px-8 md:px-16 py-20 max-w-screen-2xl mx-auto">
          <div className="type-label mb-12" style={{ color: 'var(--accent)' }}>{content.historyEyebrow}</div>
          <div className="grid md:grid-cols-3 gap-0">
            {content.milestones.map(({ year, event }, i) => (
              <div
                key={year}
                className="py-8 pr-8"
                style={{
                  borderTop: '1px solid var(--border)',
                  borderLeft: i % 3 !== 0 ? '1px solid var(--border)' : 'none',
                  paddingLeft: i % 3 !== 0 ? '2rem' : 0,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.5rem',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    lineHeight: 1,
                    marginBottom: '1rem',
                  }}
                >
                  {year}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 1.75,
                  }}
                >
                  {event}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Artisans ──────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="px-8 md:px-16 py-16 max-w-screen-2xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>{content.artisansEyebrow}</div>
                <h2 className="type-display-md" style={{ color: 'var(--fg)' }}>{content.artisansTitle}</h2>
              </div>
              <a href={localizeHref(content.artisansCtaHref, locale)} className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all" style={{ color: 'var(--muted)' }}>
                {content.artisansCtaLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {content.artisans.map((artisan, index) => (
                <div key={artisan.name} className="group">
                  {/* Portrait swatch */}
                  <div
                    className="relative mb-5 overflow-hidden"
                    style={{ aspectRatio: '3/4', background: ARTISAN_GRADIENTS[index % ARTISAN_GRADIENTS.length] }}
                  >
                    {/* Initials overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '3.5rem',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.15)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {artisan.name.split(' ').map((n) => n[0]).join('')}
                    </div>

                    {/* Info on hover */}
                    <div
                      className="absolute bottom-0 left-0 right-0 p-5 translate-y-full opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100"
                      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8rem',
                          fontWeight: 300,
                          color: 'rgba(255,255,255,0.8)',
                          lineHeight: 1.6,
                        }}
                      >
                        {artisan.note}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.15rem',
                      fontWeight: 300,
                      color: 'var(--fg)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {artisan.name}
                  </div>
                  <div className="type-label" style={{ color: 'var(--accent)' }}>{artisan.role}</div>
                  <div className="type-label mt-0.5" style={{ color: 'var(--muted)' }}>{artisan.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Values ────────────────────────────────────────────────── */}
        <div className="px-8 md:px-16 py-20 max-w-screen-2xl mx-auto">
          <div className="type-label mb-12" style={{ color: 'var(--accent)' }}>{content.valuesEyebrow}</div>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-0">
            {content.values.map(({ number, title, body }) => (
              <div
                key={number}
                className="py-10"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-6">
                  <span
                    className="type-label flex-shrink-0 mt-1"
                    style={{ color: 'rgba(var(--accent-rgb),0.4)' }}
                  >
                    {number}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.5rem',
                        fontWeight: 300,
                        color: 'var(--fg)',
                        marginBottom: '0.75rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {title}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem',
                        fontWeight: 300,
                        color: 'var(--muted)',
                        lineHeight: 1.8,
                      }}
                    >
                      {body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Closing CTA ───────────────────────────────────────────── */}
        <div
          className="px-8 md:px-20 py-24 text-center grain relative overflow-hidden"
          style={{ background: 'var(--fg)', color: 'var(--bg)' }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 3.5rem)',
              fontWeight: 300,
              lineHeight: 1.15,
              color: 'var(--bg)',
              maxWidth: '720px',
              margin: '0 auto 2.5rem',
            }}
          >
            &ldquo;{content.closing.quote}&rdquo;
          </p>
          <div className="type-label mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {content.closing.attribution}
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href={localizeHref(content.closing.primaryCtaHref, locale)}
              className="btn-primary"
              style={{ background: 'var(--bg)', color: 'var(--fg)' }}
            >
              {content.closing.primaryCtaLabel}
            </a>
            <a
              href={localizeHref(content.closing.secondaryCtaHref, locale)}
              className="btn-ghost"
              style={{ color: 'var(--bg)', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              {content.closing.secondaryCtaLabel}
            </a>
          </div>
        </div>

      </main>
      <SiteFooter />
    </>
  );
}
