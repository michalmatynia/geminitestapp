import type { JSX } from 'react';

const STORIES = [
  {
    id: 1,
    category: 'Craft',
    title: 'The Last Weavers of Bruges',
    excerpt: 'Inside the workshop where 600-year-old loom techniques meet contemporary design.',
    gradient: 'linear-gradient(145deg, #2C4A3E 0%, #1A3028 100%)',
    textColor: '#E8F0EC',
  },
  {
    id: 2,
    category: 'Material',
    title: 'On the Origin of Cognac Leather',
    excerpt: 'Why the finest leather in the world still comes from a town of 22,000 people.',
    gradient: 'linear-gradient(145deg, #6B4328 0%, #4A2D18 100%)',
    textColor: '#F0E4D8',
  },
  {
    id: 3,
    category: 'Object',
    title: 'A Table Stays in the Family',
    excerpt: 'The design philosophy of making furniture that outlasts its maker.',
    gradient: 'linear-gradient(145deg, #3A3530 0%, #252220 100%)',
    textColor: '#EDE8E0',
  },
];

export function EditorialStrip(): JSX.Element {
  return (
    <section className="px-6 md:px-10 py-24 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
            Stories
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            From The Field
          </h2>
        </div>
        <a
          href="#"
          className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all duration-200"
          style={{ color: 'var(--muted)' }}
        >
          All stories
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Stories grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {STORIES.map((story) => (
          <a key={story.id} href="#" className="group block relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
            {/* Background */}
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ background: story.gradient }}
            />

            {/* Grain */}
            <div
              className="absolute inset-0 opacity-25 mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                backgroundSize: '150px',
              }}
            />

            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end" style={{ zIndex: 2 }}>
              <div className="type-label mb-4" style={{ color: story.textColor, opacity: 0.6 }}>
                {story.category}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.2rem, 2vw, 1.75rem)',
                  fontWeight: 300,
                  lineHeight: 1.15,
                  color: story.textColor,
                  marginBottom: '0.75rem',
                }}
              >
                {story.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: 300,
                  color: story.textColor,
                  opacity: 0.65,
                  lineHeight: 1.65,
                  marginBottom: '1.5rem',
                }}
              >
                {story.excerpt}
              </p>
              <div
                className="flex items-center gap-2 type-label transition-gap duration-200 group-hover:gap-3"
                style={{ color: story.textColor, opacity: 0.7 }}
              >
                Read
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
