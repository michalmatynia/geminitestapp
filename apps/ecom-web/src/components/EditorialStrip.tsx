'use client';

import type { JSX } from 'react';

const UNIVERSE_REPORTS = [
  {
    id: 1,
    tag: 'Universe Report',
    title: 'Attack on Titan — The Final Collection',
    excerpt: 'Survey Corps insignia, crystal-cast pins and wall-break keychains from the most iconic arc in modern anime.',
    gradient: 'linear-gradient(145deg, #0a0d1e 0%, #0d1a35 50%, #142a50 100%)',
    accent: 'rgba(171,217,208,0.7)',
    tagColor: 'var(--cyan-teal)',
  },
  {
    id: 2,
    tag: 'Gaming Drop',
    title: 'Elden Ring Talisman Series',
    excerpt: 'Gilded pendants, smithing stone charms and Great Rune keychains — forged for Tarnished who survived the Lands Between.',
    gradient: 'linear-gradient(145deg, #1a0d00 0%, #2e1800 50%, #3d2200 100%)',
    accent: 'rgba(250,229,163,0.7)',
    tagColor: 'var(--soft-gold)',
  },
  {
    id: 3,
    tag: 'Film Collectible',
    title: 'Blade Runner 2049 — Off-World Edition',
    excerpt: 'Origami figures, spinner-craft pendants and neon-etched charms inspired by the rain-soaked skylines of New Los Angeles.',
    gradient: 'linear-gradient(145deg, #150520 0%, #220a35 50%, #30105a 100%)',
    accent: 'rgba(244,185,142,0.7)',
    tagColor: 'var(--peach-orange)',
  },
];

export function EditorialStrip(): JSX.Element {
  return (
    <section className="px-6 md:px-10 py-24 max-w-screen-2xl mx-auto">
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--cyan-teal)' }}>
            Universe Reports
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            Lore &amp; Drops
          </h2>
        </div>
        <a
          href="#"
          className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all duration-200"
          style={{ color: 'var(--muted-teal)' }}
        >
          All reports
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {UNIVERSE_REPORTS.map((story) => (
          <a
            key={story.id}
            href="#"
            className="group block relative overflow-hidden"
            style={{
              aspectRatio: '3/4',
              border: '1px solid rgba(171,217,208,0.1)',
              transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = story.accent;
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(171,217,208,0.1)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(171,217,208,0.1)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {/* Background */}
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ background: story.gradient }}
            />

            {/* Dot grid overlay */}
            <div className="absolute inset-0 dot-grid opacity-20" />

            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
              }}
            />

            {/* Corner bracket top-left */}
            <div className="absolute top-4 left-4 w-5 h-5 z-10 opacity-60" style={{ borderTop: `1px solid ${story.accent}`, borderLeft: `1px solid ${story.accent}` }} />
            <div className="absolute top-4 right-4 w-5 h-5 z-10 opacity-60" style={{ borderTop: `1px solid ${story.accent}`, borderRight: `1px solid ${story.accent}` }} />

            {/* Content */}
            <div className="absolute inset-0 p-7 flex flex-col justify-end z-10">
              <span
                className="type-label inline-block mb-4 self-start"
                style={{ color: story.tagColor, background: 'rgba(1,0,13,0.5)', border: `1px solid ${story.accent}`, padding: '0.2rem 0.6rem' }}
              >
                {story.tag}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: 'var(--cream-highlight)',
                  marginBottom: '0.75rem',
                }}
              >
                {story.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 400,
                  color: 'var(--muted-teal)',
                  lineHeight: 1.65,
                  marginBottom: '1.25rem',
                }}
              >
                {story.excerpt}
              </p>
              <div
                className="flex items-center gap-2 type-label group-hover:gap-3 transition-all duration-200"
                style={{ color: story.tagColor }}
              >
                Read Report
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
