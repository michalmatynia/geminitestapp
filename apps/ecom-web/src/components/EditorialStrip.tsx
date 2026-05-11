'use client';

import { useRef, type JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeEditorialContent } from '@/data/homeContent';
import { useLocalizedHref } from '@/context/LocaleContext';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { getProductImageSrc } from '@/lib/productImages';

const REPORT_VISUALS = [
  {
    gradient: 'radial-gradient(circle at 48% 18%, rgba(229,183,94,0.2) 0%, transparent 30%), radial-gradient(circle at 16% 76%, rgba(234,247,238,0.08) 0%, transparent 24%), linear-gradient(145deg, #020205 0%, #060913 58%, #120708 100%)',
    accent: 'rgba(229,183,94,0.7)',
    tagColor: 'var(--soft-gold)',
  },
  {
    gradient: 'radial-gradient(circle at 28% 22%, rgba(216,116,50,0.18) 0%, transparent 32%), radial-gradient(circle at 82% 78%, rgba(201,60,47,0.12) 0%, transparent 30%), linear-gradient(145deg, #020205 0%, #120708 56%, #2A0A07 100%)',
    accent: 'rgba(216,116,50,0.7)',
    tagColor: 'var(--peach-orange)',
  },
  {
    gradient: 'radial-gradient(circle at 70% 22%, rgba(126,202,216,0.16) 0%, transparent 32%), radial-gradient(circle at 26% 74%, rgba(44,70,216,0.14) 0%, transparent 30%), linear-gradient(145deg, #020205 0%, #050812 56%, #0D1538 100%)',
    accent: 'rgba(126,202,216,0.7)',
    tagColor: 'var(--cyan-teal)',
  },
];

const IMAGE_OVERLAY = 'linear-gradient(180deg, rgba(2, 2, 5, 0.16) 0%, rgba(18, 7, 8, 0.78) 100%)';

const DEFAULT_VISUAL = REPORT_VISUALS[0];

export function EditorialStrip({
  content = HOME_CONTENT_DEFAULTS.editorial,
}: {
  content?: HomeEditorialContent;
}): JSX.Element {
  const localizedHref = useLocalizedHref();
  const sectionRef = useRef<HTMLElement>(null);
  const visibleReports = content.reports.filter((story) => story.visible !== false);

  useGSAP(() => {
    gsap.fromTo('.ed-header',
      { y: 40 },
      {
        y: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: '.ed-header', start: 'top 88%', toggleActions: 'play none none none' },
      });

    ScrollTrigger.batch('.ed-card', {
      start: 'top 92%',
      onEnter: (batch) => {
        gsap.fromTo(batch,
          { y: 50, clipPath: 'inset(0 0 20% 0)' },
          { y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.0, ease: 'expo.out', stagger: 0.12 });
      },
    });
  }, { scope: sectionRef, dependencies: [] });

  if (visibleReports.length === 0) return <></>;

  return (
    <section ref={sectionRef} className="px-6 md:px-10 pt-16 pb-24 max-w-screen-2xl mx-auto">
      <div className="ed-header flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
            {content.eyebrow}
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            {content.title}
          </h2>
        </div>
        <a
          href={localizedHref(content.ctaHref)}
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
        {visibleReports.map((story, index) => {
          const visual = REPORT_VISUALS[index] ?? DEFAULT_VISUAL;
          const storyImageUrl = getProductImageSrc(story.imageUrl);
          const hasImage = storyImageUrl !== undefined && storyImageUrl.trim().length > 0;
          return (
          <a
            key={`${story.title}-${index}`}
            href={localizedHref(story.href)}
            className="ed-card group block relative overflow-hidden"
            style={{
              aspectRatio: '3/4',
              border: '1px solid rgba(var(--accent-rgb),0.1)',
              transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = visual.accent;
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(var(--accent-rgb),0.1)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-rgb),0.1)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
            >
            {hasImage ? (
              <img
                alt=''
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                src={storyImageUrl}
              />
            ) : null}
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ background: hasImage ? IMAGE_OVERLAY : visual.gradient }}
            />

            {/* Dot grid overlay */}
            <div className="absolute inset-0 dot-grid opacity-20" />

            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, var(--scanline-soft) 3px, var(--scanline-soft) 4px)',
              }}
            />

            {/* Corner bracket top-left */}
            <div className="absolute top-4 left-4 w-5 h-5 z-10 opacity-60" style={{ borderTop: `1px solid ${visual.accent}`, borderLeft: `1px solid ${visual.accent}` }} />
            <div className="absolute top-4 right-4 w-5 h-5 z-10 opacity-60" style={{ borderTop: `1px solid ${visual.accent}`, borderRight: `1px solid ${visual.accent}` }} />

            {/* Content */}
            <div className="absolute inset-0 p-7 flex flex-col justify-end z-10">
              <span
                className="type-label inline-block mb-4 self-start"
                style={{ color: visual.tagColor, background: 'var(--media-chip-bg)', border: `1px solid ${visual.accent}`, padding: '0.2rem 0.6rem' }}
              >
                {story.tag}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: 'var(--on-media)',
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
                  color: 'var(--on-media-muted)',
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
