import type { JSX } from 'react';

const MARQUEE_ITEMS = [
  'Objects of Enduring Beauty',
  '✦',
  'Slow Fashion',
  '✦',
  'Handcrafted',
  '✦',
  'Made to Last',
  '✦',
  'Arcana SS 2026',
  '✦',
  'Objects of Enduring Beauty',
  '✦',
  'Slow Fashion',
  '✦',
  'Handcrafted',
  '✦',
  'Made to Last',
  '✦',
  'Arcana SS 2026',
  '✦',
];

export function ManifestoBanner(): JSX.Element {
  return (
    <section className="relative overflow-hidden py-0">
      {/* Top rule */}
      <div className="divider" />

      {/* Marquee strip */}
      <div
        className="relative flex items-center py-5 overflow-hidden"
        style={{ background: 'var(--fg)', color: 'var(--bg)' }}
      >
        <div
          className="flex items-center gap-10 whitespace-nowrap animate-marquee"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 300, letterSpacing: '0.05em' }}
          aria-hidden="true"
        >
          {MARQUEE_ITEMS.map((item, i) => (
            <span
              key={i}
              style={{ color: item === '✦' ? 'var(--accent-light)' : 'var(--bg)' }}
            >
              {item}
            </span>
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div
          className="flex items-center gap-10 whitespace-nowrap animate-marquee absolute"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 300,
            letterSpacing: '0.05em',
            left: '100%',
          }}
          aria-hidden="true"
        >
          {MARQUEE_ITEMS.map((item, i) => (
            <span
              key={i}
              style={{ color: item === '✦' ? 'var(--accent-light)' : 'var(--bg)' }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Manifesto block */}
      <div
        className="px-8 md:px-24 py-24 md:py-36 grain relative"
        style={{
          background: 'linear-gradient(160deg, #18110A 0%, #2C2018 60%, #1A1612 100%)',
          color: '#EDE8E0',
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow */}
          <div className="type-label mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Our Approach
          </div>

          {/* Large manifesto quote */}
          <blockquote
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 4.5rem)',
              fontWeight: 300,
              lineHeight: 1.1,
              marginBottom: '2rem',
            }}
          >
            &ldquo;We make things you will{' '}
            <em style={{ color: 'var(--accent-light)', fontStyle: 'normal' }}>never want to replace</em>.&rdquo;
          </blockquote>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '480px',
              margin: '0 auto 3rem',
              lineHeight: 1.8,
            }}
          >
            Every object in the Arcana collection passes through the hands of a
            named artisan. We know where it comes from, and you will too.
          </p>

          {/* Divider with diamond */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px w-16" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ color: 'var(--accent)', fontSize: '0.6rem' }}>◆</span>
            <div className="h-px w-16" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          <button
            className="btn-ghost"
            style={{ color: '#EDE8E0', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            Read Our Story
          </button>
        </div>
      </div>

      <div className="divider" />
    </section>
  );
}
