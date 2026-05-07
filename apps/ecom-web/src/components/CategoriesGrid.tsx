import type { JSX } from 'react';

const CATEGORIES = [
  {
    id: 'womenswear',
    label: 'Womenswear',
    count: '284 pieces',
    gradient: 'linear-gradient(145deg, #E8DFCF 0%, #C4B09A 50%, #A89280 100%)',
    textColor: '#3A2E26',
    tag: 'New Season',
  },
  {
    id: 'menswear',
    label: 'Menswear',
    count: '196 pieces',
    gradient: 'linear-gradient(145deg, #1C1812 0%, #2E261E 50%, #3F3228 100%)',
    textColor: '#EDE8E0',
    tag: 'Restocked',
  },
  {
    id: 'objects',
    label: 'Objects',
    count: '142 pieces',
    gradient: 'linear-gradient(145deg, #C4BDB4 0%, #A09890 50%, #787068 100%)',
    textColor: '#1C1812',
    tag: 'Curated',
  },
  {
    id: 'atelier',
    label: 'Atelier',
    count: '38 pieces',
    gradient: 'linear-gradient(145deg, #8B5E3C 0%, #6B4328 50%, #4A2D18 100%)',
    textColor: '#F3EDE3',
    tag: 'Limited',
  },
];

export function CategoriesGrid(): JSX.Element {
  return (
    <section className="px-6 md:px-10 py-24 max-w-screen-2xl mx-auto">
      {/* Section header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
            Explore
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            Shop by Category
          </h2>
        </div>
        <a
          href="#"
          className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all duration-200"
          style={{ color: 'var(--muted)' }}
        >
          All collections
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Grid: 2 tall on left + 2 stacked on right */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map((cat, i) => (
          <a
            key={cat.id}
            href="#"
            className={`category-card block ${i < 2 ? 'row-span-1' : ''}`}
            style={{ aspectRatio: i === 0 || i === 3 ? '2/3' : '3/4' }}
          >
            {/* Background */}
            <div
              className="cat-bg absolute inset-0"
              style={{ background: cat.gradient }}
            />

            {/* Grain overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                backgroundSize: '150px',
                mixBlendMode: 'overlay',
              }}
            />

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-between" style={{ zIndex: 2 }}>
              {/* Tag */}
              <div>
                <span
                  className="type-label px-2.5 py-1 inline-block"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: cat.textColor,
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {cat.tag}
                </span>
              </div>

              {/* Label */}
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                    fontWeight: 300,
                    lineHeight: 1,
                    color: cat.textColor,
                    marginBottom: '0.25rem',
                  }}
                >
                  {cat.label}
                </h3>
                <p className="type-label" style={{ color: cat.textColor, opacity: 0.6 }}>
                  {cat.count}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
