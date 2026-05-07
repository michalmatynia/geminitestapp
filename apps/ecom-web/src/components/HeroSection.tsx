import type { JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeHeroContent } from '@/data/homeContent';

const STAT_COLORS = ['var(--soft-gold)', 'var(--cyan-teal)', 'var(--peach-orange)'];

interface HeroSectionProps {
  content?: HomeHeroContent;
}

export function HeroSection({ content = HOME_CONTENT_DEFAULTS.hero }: HeroSectionProps): JSX.Element {
  const bottomStripText = [...content.bottomStripItems, ...content.bottomStripItems].join(' \u00a0·\u00a0 ');

  return (
    <section
      className="relative min-h-screen flex items-stretch overflow-hidden"
      style={{ paddingTop: 'var(--nav-h)', background: 'var(--space-black)' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      {/* Ambient glow — top left */}
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(171,217,208,0.06) 0%, transparent 70%)' }}
      />

      {/* ── Left column ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center px-8 md:px-14 lg:px-16 xl:px-20 w-full lg:w-[55%] py-20 lg:py-28">

        {/* Status beacon */}
        <div className="flex items-center gap-3 mb-10 animate-slide-up delay-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'var(--cyan-teal)', boxShadow: '0 0 8px var(--cyan-teal)', animation: 'neonPulse 2s ease-in-out infinite' }}
          />
          <span className="type-label tracking-[0.22em]" style={{ color: 'var(--cyan-teal)' }}>
            {content.status}
          </span>
        </div>

        {/* Headline */}
        <div className="overflow-hidden mb-1 animate-slide-up delay-1">
          <h1
            className="type-display-xl"
            style={{
              color: 'var(--cream-highlight)',
              fontSize: 'clamp(3.1rem, 6.2vw, 5.8rem)',
              maxWidth: '100%',
            }}
          >
            {content.headlineLine1}
          </h1>
        </div>
        <div className="overflow-hidden mb-8 animate-slide-up delay-2">
          <h1
            className="type-display-xl"
            style={{
              color: 'transparent',
              fontSize: 'clamp(3.1rem, 6.2vw, 5.8rem)',
              maxWidth: '100%',
              WebkitTextStroke: '1.5px var(--cyan-teal)',
              textShadow: '0 0 60px rgba(171,217,208,0.25)',
            }}
          >
            {content.headlineLine2}
          </h1>
        </div>

        {/* Universe tags */}
        <div className="flex flex-wrap gap-2 mb-8 animate-slide-up delay-3">
          {content.tags.map((tag) => (
            <span key={tag} className="neon-tag-cyan">{tag}</span>
          ))}
        </div>

        {/* Description */}
        <p
          className="animate-slide-up delay-4 max-w-md mb-10 leading-relaxed"
          style={{ color: 'var(--muted-teal)', fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 400 }}
        >
          {content.description}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 animate-slide-up delay-5">
          <a href={content.primaryCtaHref} className="btn-primary">
            {content.primaryCtaLabel}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a href={content.secondaryCtaHref} className="btn-ghost">
            {content.secondaryCtaLabel}
          </a>
        </div>

        {/* Stats */}
        <div
          className="flex gap-10 mt-14 pt-8 animate-slide-up delay-6"
          style={{ borderTop: '1px solid rgba(171,217,208,0.15)' }}
        >
          {content.stats.map(({ value, label }, index) => {
            const color = STAT_COLORS[index % STAT_COLORS.length];
            return (
              <div key={`${label}-${index}`}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.5rem, 2.8vw, 2.5rem)',
                    fontWeight: 800,
                    color,
                    lineHeight: 1,
                    textShadow: `0 0 20px ${color}66`,
                  }}
                >
                  {value}
                </div>
                <div className="type-label mt-1.5" style={{ color: 'var(--muted-teal)' }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right column — holographic display ──────────────────────── */}
      <div
        className="hidden lg:block absolute right-0 top-0 bottom-0 w-[47%] animate-clip-reveal delay-2"
        style={{ background: 'var(--deep-navy)' }}
      >
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-40" />

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)',
            zIndex: 1,
          }}
        />

        {/* Corner brackets */}
        <div className="absolute top-8 left-8 w-10 h-10 z-10" style={{ borderTop: '2px solid var(--cyan-teal)', borderLeft: '2px solid var(--cyan-teal)', opacity: 0.7 }} />
        <div className="absolute top-8 right-8 w-10 h-10 z-10" style={{ borderTop: '2px solid var(--cyan-teal)', borderRight: '2px solid var(--cyan-teal)', opacity: 0.7 }} />
        <div className="absolute bottom-8 left-8 w-10 h-10 z-10" style={{ borderBottom: '2px solid var(--cyan-teal)', borderLeft: '2px solid var(--cyan-teal)', opacity: 0.7 }} />
        <div className="absolute bottom-8 right-8 w-10 h-10 z-10" style={{ borderBottom: '2px solid var(--cyan-teal)', borderRight: '2px solid var(--cyan-teal)', opacity: 0.7 }} />

        {/* Central display panel */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-16">
          <div
            className="w-full p-10 relative"
            style={{
              border: '1px solid rgba(171,217,208,0.2)',
              background: 'rgba(1,0,13,0.55)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 60px rgba(171,217,208,0.06), inset 0 0 40px rgba(171,217,208,0.03)',
              animation: 'neonBorderPulse 4s ease-in-out infinite',
            }}
          >
            {/* Header bar */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--coral-red)', boxShadow: '0 0 6px var(--coral-red)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--soft-gold)', boxShadow: '0 0 6px var(--soft-gold)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cyan-teal)', boxShadow: '0 0 6px var(--cyan-teal)' }} />
              <div className="flex-1 h-px mx-3" style={{ background: 'rgba(171,217,208,0.15)' }} />
              <span className="type-label" style={{ color: 'rgba(171,217,208,0.4)' }}>{content.panelStatus}</span>
            </div>

            {/* Collectible SVG art */}
            <div className="flex justify-center mb-8">
              <svg viewBox="0 0 200 200" className="w-44 h-44">
                {/* Outer hexagon */}
                <polygon
                  points="100,12 176,56 176,144 100,188 24,144 24,56"
                  fill="none"
                  stroke="rgba(171,217,208,0.35)"
                  strokeWidth="1"
                />
                {/* Inner hexagon */}
                <polygon
                  points="100,36 156,68 156,132 100,164 44,132 44,68"
                  fill="none"
                  stroke="rgba(171,217,208,0.2)"
                  strokeWidth="1"
                />
                {/* Center gem */}
                <polygon
                  points="100,60 130,88 130,118 100,140 70,118 70,88"
                  fill="rgba(171,217,208,0.06)"
                  stroke="rgba(171,217,208,0.6)"
                  strokeWidth="1.5"
                />
                {/* Inner facets */}
                <line x1="100" y1="60" x2="100" y2="100" stroke="rgba(171,217,208,0.3)" strokeWidth="0.8"/>
                <line x1="130" y1="88" x2="100" y2="100" stroke="rgba(171,217,208,0.3)" strokeWidth="0.8"/>
                <line x1="130" y1="118" x2="100" y2="100" stroke="rgba(171,217,208,0.3)" strokeWidth="0.8"/>
                <line x1="100" y1="140" x2="100" y2="100" stroke="rgba(171,217,208,0.3)" strokeWidth="0.8"/>
                <line x1="70" y1="118" x2="100" y2="100" stroke="rgba(171,217,208,0.3)" strokeWidth="0.8"/>
                <line x1="70" y1="88" x2="100" y2="100" stroke="rgba(171,217,208,0.3)" strokeWidth="0.8"/>
                {/* Corner nodes */}
                <circle cx="100" cy="12" r="3" fill="rgba(171,217,208,0.5)" />
                <circle cx="176" cy="56" r="3" fill="rgba(171,217,208,0.5)" />
                <circle cx="176" cy="144" r="3" fill="rgba(171,217,208,0.5)" />
                <circle cx="100" cy="188" r="3" fill="rgba(171,217,208,0.5)" />
                <circle cx="24" cy="144" r="3" fill="rgba(171,217,208,0.5)" />
                <circle cx="24" cy="56" r="3" fill="rgba(171,217,208,0.5)" />
                {/* Glow dot center */}
                <circle cx="100" cy="100" r="5" fill="rgba(171,217,208,0.8)" style={{ filter: 'drop-shadow(0 0 6px rgba(171,217,208,0.9))' }} />
              </svg>
            </div>

            {/* Product info */}
            <div className="text-center">
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--cream-highlight)',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                }}
              >
                {content.panelTitle}
              </div>
              <div className="type-label mb-3" style={{ color: 'var(--muted-teal)' }}>
                {content.panelSubtitle}
              </div>
              <div
                className="type-price"
                style={{ color: 'var(--soft-gold)', fontSize: '1.1rem', textShadow: '0 0 12px rgba(250,229,163,0.4)' }}
              >
                {content.panelPrice}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom scrolling text */}
        <div
          className="absolute bottom-5 left-0 right-0 overflow-hidden z-10"
          style={{ borderTop: '1px solid rgba(171,217,208,0.08)', paddingTop: '0.75rem' }}
        >
          <div
            className="animate-marquee whitespace-nowrap type-label"
            style={{ color: 'rgba(171,217,208,0.2)', letterSpacing: '0.3em' }}
          >
            {bottomStripText}
          </div>
        </div>
      </div>

      {/* Mobile bottom strip */}
      <div
        className="lg:hidden absolute bottom-0 left-0 right-0 h-2"
        style={{ background: 'linear-gradient(90deg, rgba(171,217,208,0), rgba(171,217,208,0.4), rgba(171,217,208,0))' }}
      />
    </section>
  );
}
