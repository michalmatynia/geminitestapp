import type { JSX } from 'react';

const MARQUEE_ITEMS = [
  'Official Merch',
  '◆',
  'Anime Keychains',
  '◆',
  'Gaming Pins',
  '◆',
  'Film Collectibles',
  '◆',
  'Limited Drops',
  '◆',
  'Rare Finds',
  '◆',
];

export function ManifestoBanner(): JSX.Element {
  return (
    <section className="relative overflow-hidden py-0">
      <div className="divider" />

      {/* Marquee strip */}
      <div
        className="relative h-12 overflow-hidden"
        style={{
          background: 'rgba(171,217,208,0.07)',
          borderBottom: '1px solid rgba(171,217,208,0.12)',
          contain: 'paint',
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
            maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
          }}
        >
          <div
            className="flex h-full w-max min-w-max items-center whitespace-nowrap animate-marquee will-change-transform"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
            aria-hidden="true"
          >
            {[0, 1].map((group) => (
              <div
                key={group}
                className="flex shrink-0 items-center gap-8 pr-8"
              >
                {MARQUEE_ITEMS.map((item, i) => (
                  <span
                    key={`${group}-${i}`}
                    className="shrink-0"
                    style={{ color: item === '◆' ? 'var(--soft-gold)' : 'var(--cyan-teal)' }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">
          Official Merch, Anime Keychains, Gaming Pins, Film Collectibles, Limited Drops, Rare Finds
        </span>
      </div>

      {/* Manifesto block */}
      <div
        className="relative grain overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0B0D21 0%, #21141D 50%, #01000D 100%)' }}
      >
        {/* Grid bg */}
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(171,217,208,0.06) 0%, transparent 70%)' }}
        />

        <div className="px-8 md:px-24 py-24 md:py-36 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="type-label mb-8" style={{ color: 'rgba(171,217,208,0.45)' }}>
              The Collector&apos;s Creed
            </div>

            <blockquote
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4.5vw, 4rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                color: 'var(--cream-highlight)',
                marginBottom: '2rem',
              }}
            >
              &ldquo;Every universe deserves{' '}
              <em style={{ color: 'var(--cyan-teal)', fontStyle: 'normal', textShadow: '0 0 30px rgba(171,217,208,0.4)' }}>
                a piece you can hold
              </em>
              .&rdquo;
            </blockquote>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 400,
                color: 'var(--muted-teal)',
                maxWidth: '460px',
                margin: '0 auto 3rem',
                lineHeight: 1.8,
              }}
            >
              We source and curate officially licensed collectibles from the anime, gaming and film worlds — so every piece in your collection carries real meaning.
            </p>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="h-px w-16" style={{ background: 'rgba(171,217,208,0.2)' }} />
              <span style={{ color: 'var(--soft-gold)', fontSize: '0.7rem', textShadow: '0 0 8px rgba(250,229,163,0.5)' }}>◆</span>
              <div className="h-px w-16" style={{ background: 'rgba(171,217,208,0.2)' }} />
            </div>

            <a href="/products" className="btn-primary" style={{ display: 'inline-flex' }}>
              Explore The Cache
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="divider" />
    </section>
  );
}
