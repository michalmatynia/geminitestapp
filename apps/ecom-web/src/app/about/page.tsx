import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'About — ARCANA',
  description: 'The story behind ARCANA — why we make what we make, and how.',
};

const MILESTONES = [
  { year: '2012', event: 'Founded in Lyon by Clara and Étienne Morin, with a single linen textile run of 200 pieces.' },
  { year: '2014', event: 'First leather collaboration with the Garonne tannery in Ribérac. The cognac tote sells out in three days.' },
  { year: '2016', event: 'Opened the Paris atelier on Rue du Temple. Began working with ceramicist Hélène Morin.' },
  { year: '2018', event: 'First international collection. Stocked in six countries. Still made by fewer than forty artisans.' },
  { year: '2021', event: 'Launched the Objects line. Furniture, vessels, lights — all repaired or replaced for life.' },
  { year: '2024', event: 'Committed to zero virgin plastic in all packaging. Switched to reclaimed kraft and linen cloth wrapping.' },
];

const ARTISANS = [
  {
    name: 'Hélène Morin',
    role: 'Ceramicist',
    location: 'Limoges, France',
    gradient: 'linear-gradient(145deg, #C4A882 0%, #8C7260 100%)',
    note: 'Makes every Arcana vessel alone, by hand, in a converted stable outside the city. Refuses to work with moulds.',
  },
  {
    name: 'Hendrik De Wolf',
    role: 'Master Weaver',
    location: 'Bruges, Belgium',
    gradient: 'linear-gradient(145deg, #2C4A3E 0%, #1A3028 100%)',
    note: 'One of three remaining draw-loom weavers in Belgium. Has been weaving linen for forty years. Will not rush.',
  },
  {
    name: 'Lars Bundgaard',
    role: 'Furniture Maker',
    location: 'Aarhus, Denmark',
    gradient: 'linear-gradient(145deg, #5C3D2A 0%, #3E2618 100%)',
    note: 'Builds furniture without glue or screws. Every joint is mechanical, every surface oiled. Will repair anything he makes, forever.',
  },
  {
    name: 'Catriona MacLeod',
    role: 'Textile Weaver',
    location: 'Isle of Lewis, Scotland',
    gradient: 'linear-gradient(145deg, #4A5A6A 0%, #2C3A48 100%)',
    note: 'Third-generation operator of the Shawbost Mill. Weaves undyed Shetland wool on a loom built in 1923.',
  },
];

const VALUES = [
  {
    number: '01',
    title: 'Made once, kept forever',
    body: 'We design everything to outlast a trend cycle. If you buy it from us, it should still be with you in twenty years.',
  },
  {
    number: '02',
    title: 'Named makers only',
    body: 'Every object on this site was made by a specific person in a specific place. We know them. We will introduce you.',
  },
  {
    number: '03',
    title: 'Repair over replace',
    body: 'We maintain a repair service for every object we have ever sold. Bring it back. We will fix it.',
  },
  {
    number: '04',
    title: 'Slow production',
    body: 'We do not respond to trends with new collections. We make things when they are ready. Sometimes that takes three years.',
  },
];

export default function AboutPage(): JSX.Element {
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
              ARCANA
            </span>
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="type-label mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Founded 2012 — Lyon, France
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
              Objects of Enduring Beauty
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
              We are a small luxury house making things that last.
              Everything we sell was made by a person whose name we know,
              in a place we have visited, using materials we can trace to their source.
            </p>
          </div>
        </div>

        {/* ── Origin story ──────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* Text */}
          <div className="px-8 md:px-16 py-16 md:py-24" style={{ borderRight: '1px solid var(--border)' }}>
            <div className="type-label mb-6" style={{ color: 'var(--accent)' }}>
              The beginning
            </div>
            <h2 className="type-display-md mb-8" style={{ color: 'var(--fg)' }}>
              A linen shirt and a question
            </h2>
            <div className="space-y-5">
              {[
                'Arcana began with a single question: why does everything fall apart? Clara Morin, then working as a textile designer in Lyon, bought a linen shirt from a market stall in Bruges in 2011. She is still wearing it.',
                'The shirt was not expensive. It was made by a weaver who had learned from his father, using techniques unchanged in three centuries. The price reflected craft, not brand. She began asking why this was so rare.',
                'With her husband Étienne — a leather goods maker with a workshop in the Périgord — she spent two years identifying the last remaining practitioners of the techniques they admired: linen weavers, vegetable tanners, stone carvers, ceramicists. The people who had not optimised for speed.',
                'In 2012, they made 200 linen shirts from the Bruges workshop. They sold them from a table at a Paris design fair. By the end of the weekend, they were gone. Arcana began.',
              ].map((para, i) => (
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
            <div className="type-label mb-4" style={{ color: 'var(--muted)' }}>By the numbers</div>
            {[
              { value: '38', label: 'Named artisans', sub: 'across 9 countries' },
              { value: '840+', label: 'Objects in the archive', sub: 'since 2012' },
              { value: '∞', label: 'Repair guarantee', sub: 'on everything we make' },
              { value: '0', label: 'Trend collections', sub: 'we do not do seasons' },
            ].map(({ value, label, sub }) => (
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
          <div className="type-label mb-12" style={{ color: 'var(--accent)' }}>History</div>
          <div className="grid md:grid-cols-3 gap-0">
            {MILESTONES.map(({ year, event }, i) => (
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
                <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>The makers</div>
                <h2 className="type-display-md" style={{ color: 'var(--fg)' }}>Artisans</h2>
              </div>
              <a href="/stories" className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all" style={{ color: 'var(--muted)' }}>
                Read their stories
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {ARTISANS.map((artisan) => (
                <div key={artisan.name} className="group">
                  {/* Portrait swatch */}
                  <div
                    className="relative mb-5 overflow-hidden"
                    style={{ aspectRatio: '3/4', background: artisan.gradient }}
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
          <div className="type-label mb-12" style={{ color: 'var(--accent)' }}>How we work</div>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-0">
            {VALUES.map(({ number, title, body }) => (
              <div
                key={number}
                className="py-10"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-6">
                  <span
                    className="type-label flex-shrink-0 mt-1"
                    style={{ color: 'var(--border)' }}
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
            &ldquo;Come slowly. Choose carefully. Buy the thing you will still want in fifteen years.&rdquo;
          </p>
          <div className="type-label mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
            — Clara Morin, Founder
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/"
              className="btn-primary"
              style={{ background: 'var(--bg)', color: 'var(--fg)' }}
            >
              Explore the collection
            </a>
            <a
              href="/stories"
              className="btn-ghost"
              style={{ color: 'var(--bg)', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              Read our stories
            </a>
          </div>
        </div>

      </main>
      <SiteFooter />
    </>
  );
}
