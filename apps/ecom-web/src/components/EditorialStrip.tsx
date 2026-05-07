'use client';

import type { JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeEditorialContent } from '@/data/homeContent';

const REPORT_VISUALS = [
  {
    gradient: 'linear-gradient(145deg, #0a0d1e 0%, #0d1a35 50%, #142a50 100%)',
    accent: 'rgba(171,217,208,0.7)',
    tagColor: 'var(--cyan-teal)',
  },
  {
    gradient: 'linear-gradient(145deg, #1a0d00 0%, #2e1800 50%, #3d2200 100%)',
    accent: 'rgba(250,229,163,0.7)',
    tagColor: 'var(--soft-gold)',
  },
  {
    gradient: 'linear-gradient(145deg, #150520 0%, #220a35 50%, #30105a 100%)',
    accent: 'rgba(244,185,142,0.7)',
    tagColor: 'var(--peach-orange)',
  },
];

const DEFAULT_VISUAL = REPORT_VISUALS[0];

export function EditorialStrip({
  content = HOME_CONTENT_DEFAULTS.editorial,
}: {
  content?: HomeEditorialContent;
}): JSX.Element {
  return (
    <section className="px-6 md:px-10 py-24 max-w-screen-2xl mx-auto">
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--cyan-teal)' }}>
            {content.eyebrow}
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            {content.title}
          </h2>
        </div>
        <a
          href={content.ctaHref}
          className="hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all duration-200"
          style={{ color: 'var(--muted-teal)' }}
        >
          {content.ctaLabel}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {content.reports.map((story, index) => {
          const visual = REPORT_VISUALS[index] ?? DEFAULT_VISUAL;
          return (
          <a
            key={`${story.title}-${index}`}
            href={story.href}
            className="group block relative overflow-hidden"
            style={{
              aspectRatio: '3/4',
              border: '1px solid rgba(171,217,208,0.1)',
              transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = visual.accent;
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
              style={{ background: visual.gradient }}
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
            <div className="absolute top-4 left-4 w-5 h-5 z-10 opacity-60" style={{ borderTop: `1px solid ${visual.accent}`, borderLeft: `1px solid ${visual.accent}` }} />
            <div className="absolute top-4 right-4 w-5 h-5 z-10 opacity-60" style={{ borderTop: `1px solid ${visual.accent}`, borderRight: `1px solid ${visual.accent}` }} />

            {/* Content */}
            <div className="absolute inset-0 p-7 flex flex-col justify-end z-10">
              <span
                className="type-label inline-block mb-4 self-start"
                style={{ color: visual.tagColor, background: 'rgba(1,0,13,0.5)', border: `1px solid ${visual.accent}`, padding: '0.2rem 0.6rem' }}
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
                style={{ color: visual.tagColor }}
              >
                {content.readLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
          );
        })}
      </div>
    </section>
  );
}
