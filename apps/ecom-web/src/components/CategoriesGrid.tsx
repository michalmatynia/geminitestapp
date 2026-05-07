import type { JSX } from 'react';

const CATEGORIES = [
  {
    id: 'objects',
    label: 'All Items',
    sublabel: 'Keychains · Pins · Charms',
    fallbackCount: 1800,
    gradient: 'linear-gradient(145deg, #0B0D21 0%, #0d1a30 50%, #122040 100%)',
    accent: 'var(--cyan-teal)',
    accentRgb: '171,217,208',
    tag: 'Full Catalog',
    href: '/products',
  },
  {
    id: 'womenswear',
    label: 'Anime',
    sublabel: 'Pins · Keychains · Jewellery',
    fallbackCount: 640,
    gradient: 'linear-gradient(145deg, #21141D 0%, #2e1028 50%, #400a38 100%)',
    accent: 'var(--peach-orange)',
    accentRgb: '244,185,142',
    tag: 'New Season',
    href: '/collections/womenswear',
  },
  {
    id: 'menswear',
    label: 'Gaming',
    sublabel: 'RPG · FPS · Strategy Drops',
    fallbackCount: 520,
    gradient: 'linear-gradient(145deg, #0a1500 0%, #142200 50%, #1e3300 100%)',
    accent: 'var(--soft-gold)',
    accentRgb: '250,229,163',
    tag: 'Hot Drops',
    href: '/collections/menswear',
  },
  {
    id: 'accessories',
    label: 'Film & TV',
    sublabel: 'Cinema · Series · Icons',
    fallbackCount: 380,
    gradient: 'linear-gradient(145deg, #0f0520 0%, #1a0a35 50%, #28105a 100%)',
    accent: 'var(--mint-white)',
    accentRgb: '224,248,234',
    tag: 'Collector',
    href: '/collections/accessories',
  },
];

export function CategoriesGrid({
  counts = {},
}: {
  counts?: Record<string, number>;
}): JSX.Element {
  const hasLiveCounts = Object.keys(counts).length > 0;

  return (
    <section className="px-6 md:px-10 py-24 max-w-screen-2xl mx-auto">
      {/* Section header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--cyan-teal)' }}>
            Browse by Universe
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            Choose Your World
          </h2>
        </div>
        <a
          href="/products"
          className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all duration-200"
          style={{ color: 'var(--muted-teal)' }}
        >
          All collections
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map((cat, i) => {
          const liveCount = counts[cat.id] ?? (cat.id === 'objects' ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined);
          const displayCount = liveCount != null
            ? `${liveCount.toLocaleString()} items`
            : `${cat.fallbackCount.toLocaleString()}+ items`;

          return (
            <a
              key={cat.id}
              href={cat.href}
              className="category-card block"
              style={{ aspectRatio: i === 0 || i === 3 ? '2/3' : '3/4' }}
            >
              {/* Background */}
              <div className="cat-bg absolute inset-0" style={{ background: cat.gradient }} />

              {/* Dot grid */}
              <div className="absolute inset-0 dot-grid opacity-30" />

              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
                }}
              />

              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 z-10 transition-opacity duration-300"
                style={{ borderTop: `1.5px solid rgba(${cat.accentRgb},0.5)`, borderLeft: `1.5px solid rgba(${cat.accentRgb},0.5)` }} />
              <div className="absolute bottom-4 right-4 w-6 h-6 z-10 transition-opacity duration-300"
                style={{ borderBottom: `1.5px solid rgba(${cat.accentRgb},0.5)`, borderRight: `1.5px solid rgba(${cat.accentRgb},0.5)` }} />

              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-between z-20">
                {/* Tag */}
                <div>
                  <span
                    className="type-label inline-block"
                    style={{
                      color: cat.accent,
                      background: `rgba(${cat.accentRgb},0.1)`,
                      border: `1px solid rgba(${cat.accentRgb},0.3)`,
                      padding: '0.2rem 0.55rem',
                    }}
                  >
                    {cat.tag}
                  </span>
                </div>

                {/* Label + sublabel + count */}
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.15rem, 2.2vw, 1.9rem)',
                      fontWeight: 800,
                      lineHeight: 1,
                      color: 'var(--cream-highlight)',
                      marginBottom: '0.35rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {cat.label}
                  </h3>
                  <p className="type-label mb-2" style={{ color: `rgba(${cat.accentRgb},0.65)`, letterSpacing: '0.1em' }}>
                    {cat.sublabel}
                  </p>
                  <p className="type-label" style={{ color: `rgba(${cat.accentRgb},0.4)` }}>
                    {displayCount}
                    {hasLiveCounts && liveCount != null && (
                      <span style={{ color: cat.accent, opacity: 0.6 }}> · live</span>
                    )}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
