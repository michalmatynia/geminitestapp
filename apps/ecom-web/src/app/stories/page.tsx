import type { Metadata } from 'next';
import type { JSX } from 'react';
import { STORIES } from '@/data/stories';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Stories — ARCANA',
  description: 'Field reports, maker profiles, and essays on the objects we make and why they matter.',
};

export default function StoriesPage(): JSX.Element {
  const [featured, ...rest] = STORIES;

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Page header */}
        <div
          className="px-8 md:px-16 py-16 md:py-20"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="type-label mb-4" style={{ color: 'var(--accent)' }}>
            From the field
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h1 className="type-display-lg" style={{ color: 'var(--fg)' }}>
              Stories
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: 300,
                color: 'var(--muted)',
                maxWidth: '360px',
                lineHeight: 1.75,
              }}
            >
              Reports from the workshops, quarries, mills, and fields where our objects are made.
            </p>
          </div>
        </div>

        {/* Featured story */}
        <a
          href={`/stories/${featured.slug}`}
          className="group block relative overflow-hidden"
          style={{ minHeight: '70vh' }}
        >
          <div
            className="absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
            style={{ background: featured.gradient }}
          />
          {/* Grain */}
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
              backgroundSize: '150px',
            }}
          />
          <div className="absolute inset-0 p-10 md:p-16 flex flex-col justify-end" style={{ zIndex: 2 }}>
            <div className="max-w-2xl">
              <div className="flex items-center gap-4 mb-6">
                <span
                  className="type-label px-3 py-1"
                  style={{ background: featured.accentColor, color: '#fff' }}
                >
                  Featured
                </span>
                <span className="type-label" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {featured.category} · {featured.readTime} read
                </span>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 300,
                  lineHeight: 1.05,
                  color: featured.textColor,
                  marginBottom: '1rem',
                }}
              >
                {featured.title}
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 300,
                  color: featured.textColor,
                  opacity: 0.7,
                  lineHeight: 1.7,
                  marginBottom: '2rem',
                  maxWidth: '480px',
                }}
              >
                {featured.excerpt}
              </p>
              <div
                className="flex items-center gap-2 type-label transition-gap duration-200 group-hover:gap-3"
                style={{ color: featured.textColor, opacity: 0.8 }}
              >
                Read story
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </a>

        {/* Story grid */}
        <div className="px-8 md:px-16 py-16 max-w-screen-2xl mx-auto">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-3 mb-12">
            {['All', 'Craft', 'Material', 'Maker', 'Object', 'Philosophy'].map((cat) => (
              <span
                key={cat}
                className="type-label px-4 py-2 cursor-default"
                style={{
                  border: '1px solid var(--border)',
                  color: cat === 'All' ? 'var(--bg)' : 'var(--muted)',
                  background: cat === 'All' ? 'var(--fg)' : 'transparent',
                }}
              >
                {cat}
              </span>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {rest.map((story, i) => (
              <a
                key={story.id}
                href={`/stories/${story.slug}`}
                className="group block"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Image */}
                <div
                  className="relative overflow-hidden mb-5"
                  style={{ aspectRatio: '4/3' }}
                >
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                    style={{ background: story.gradient }}
                  />
                  <div
                    className="absolute inset-0 opacity-20 mix-blend-overlay"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                      backgroundSize: '150px',
                    }}
                  />
                  {/* Category badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className="type-label px-2.5 py-1"
                      style={{ background: story.accentColor, color: '#fff' }}
                    >
                      {story.category}
                    </span>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="type-label" style={{ color: 'var(--muted)' }}>{story.date}</span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="type-label" style={{ color: 'var(--muted)' }}>{story.readTime} read</span>
                </div>

                {/* Title */}
                <h3
                  className="mb-2"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
                    fontWeight: 300,
                    lineHeight: 1.15,
                    color: 'var(--fg)',
                  }}
                >
                  {story.title}
                </h3>

                {/* Excerpt */}
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 1.7,
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {story.excerpt}
                </p>

                <div
                  className="flex items-center gap-2 type-label group-hover:gap-3 transition-all duration-200"
                  style={{ color: 'var(--accent)' }}
                >
                  Read
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
