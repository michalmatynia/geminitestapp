import type { JSX } from 'react';

export function HeroSection(): JSX.Element {
  return (
    <section
      className="relative min-h-screen flex items-stretch overflow-hidden"
      style={{ paddingTop: 'var(--nav-h)' }}
    >
      {/* ── Left column: editorial copy ─────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center px-8 md:px-16 lg:px-24 w-full lg:w-[58%] py-20 lg:py-32">
        {/* Season label */}
        <div className="flex items-center gap-4 mb-12 animate-slide-up delay-0">
          <div className="h-px w-8 line-grow" style={{ background: 'var(--accent)' }} />
          <span className="type-label" style={{ color: 'var(--accent)' }}>
            New Collection — SS 2026
          </span>
        </div>

        {/* Headline — 3 staggered lines */}
        <h1 className="type-display-xl mb-2 overflow-hidden">
          <span className="block animate-slide-up delay-1" style={{ color: 'var(--fg)' }}>
            The
          </span>
        </h1>
        <h1 className="type-display-xl mb-2 overflow-hidden">
          <span
            className="block animate-slide-up delay-2"
            style={{
              color: 'transparent',
              WebkitTextStroke: '1.5px var(--fg)',
            }}
          >
            Architecture
          </span>
        </h1>
        <h1 className="type-display-xl mb-12 overflow-hidden">
          <span className="block animate-slide-up delay-3" style={{ color: 'var(--fg)' }}>
            of Desire
          </span>
        </h1>

        {/* Description */}
        <p
          className="animate-slide-up delay-4 max-w-sm leading-relaxed mb-10"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 300 }}
        >
          Handcrafted objects for the considered life. Each piece is a conversation
          between material and maker — built to accumulate meaning over time.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 animate-slide-up delay-5">
          <button className="btn-primary">
            Discover The Edit
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="btn-ghost">
            View Lookbook
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-12 mt-16 pt-10 animate-slide-up delay-6" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { value: '840+', label: 'Objects' },
            { value: '38', label: 'Artisans' },
            { value: '12', label: 'Countries' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="type-display-md mb-0.5" style={{ color: 'var(--fg)' }}>{value}</div>
              <div className="type-label" style={{ color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right column: hero visual ────────────────────────────────── */}
      <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[48%] animate-clip-reveal delay-2">
        {/* Main image swatch — editorial gradient composition */}
        <div
          className="relative w-full h-full grain"
          style={{
            background: 'linear-gradient(160deg, #C4B4A0 0%, #9E8A78 30%, #7A6556 60%, #3D2E25 100%)',
          }}
        >
          {/* Decorative rotated label */}
          <div
            className="absolute left-8 bottom-32 rotate-[-90deg] origin-bottom-left"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <span className="type-label tracking-[0.3em]">ARCANA / SS2026 / NO.001</span>
          </div>

          {/* Price badge */}
          <div
            className="absolute top-12 right-10 px-5 py-3 animate-scale-reveal delay-7"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <div className="type-label mb-0.5" style={{ color: 'var(--muted)' }}>From</div>
            <div className="type-price text-lg font-bold" style={{ color: 'var(--fg)' }}>€ 320</div>
          </div>

          {/* Product silhouette — geometric CSS art */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
            {/* Vessel form */}
            <svg
              viewBox="0 0 280 420"
              className="w-48 md:w-64 opacity-20"
              style={{ filter: 'blur(0.5px)' }}
            >
              <ellipse cx="140" cy="380" rx="80" ry="12" fill="rgba(255,255,255,0.4)" />
              <path
                d="M100 370 Q80 280 90 180 Q95 100 140 40 Q185 100 190 180 Q200 280 180 370 Z"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.5"
              />
              <ellipse cx="140" cy="40" rx="28" ry="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              {/* Handle lines */}
              <path d="M90 200 Q60 200 60 240 Q60 280 90 280" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Bottom product name strip */}
          <div
            className="absolute bottom-0 left-0 right-0 px-10 py-6 flex justify-between items-end"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
          >
            <div>
              <div className="type-label text-white/60 mb-1">Object No. 001</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', fontWeight: 300 }}>
                Amphora Vessel
              </div>
            </div>
            <span className="type-price text-white/80">€ 680</span>
          </div>
        </div>
      </div>

      {/* Mobile hero image strip */}
      <div
        className="lg:hidden absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: 'linear-gradient(160deg, #C4B4A0 0%, #7A6556 100%)',
          opacity: 0.35,
        }}
      />
    </section>
  );
}
