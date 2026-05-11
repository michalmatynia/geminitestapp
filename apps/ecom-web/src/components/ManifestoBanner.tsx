'use client';

import { Fragment, useRef, useState, type JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeManifestoContent } from '@/data/homeContent';
import { DEFAULT_LOCALE, localizeHref, type EcomLocale } from '@/lib/locales';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';

interface ManifestoBannerProps {
  content?: HomeManifestoContent;
  locale?: EcomLocale;
  allowedCategoryNames?: string[];
}

function QuoteWords({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i} className="mfst-word inline-block" style={{ opacity: 0 }}>
          {word}&nbsp;
        </span>
      ))}
    </>
  );
}

export function ManifestoBanner({
  content = HOME_CONTENT_DEFAULTS.manifesto,
  locale = DEFAULT_LOCALE,
  allowedCategoryNames = [],
}: ManifestoBannerProps): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const backgroundImageUrl = content.backgroundImageUrl.trim();
  const backgroundImage = backgroundImageUrl.length > 0
    ? `linear-gradient(180deg, rgba(2,2,5,0.7) 0%, rgba(2,2,5,0.82) 100%), url(${JSON.stringify(backgroundImageUrl)})`
    : undefined;
  const [isStripHovered, setIsStripHovered] = useState(false);

  const normalizedMarqueeItems = content.marqueeItems.map((item) => item.trim()).filter(Boolean);
  const knownNonCategoryItems = new Set(['official merch', 'oficjalny merch', 'rare finds', 'limited drops']);

  const buildCategoryItems = (items: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      const normalized = item.trim();
      const lower = normalized.toLowerCase();
      if (!normalized || knownNonCategoryItems.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      result.push(normalized);
    }
    return result;
  };

  const dynamicMarqueeItems = buildCategoryItems(allowedCategoryNames);
  const fallbackMarqueeItems = buildCategoryItems(normalizedMarqueeItems.filter((item, index) => index !== 0));
  const childMarqueeItems = dynamicMarqueeItems.length > 0 ? dynamicMarqueeItems : fallbackMarqueeItems;
  const stripGroupCount = Math.max(2, Math.min(12, Math.ceil(16 / Math.max(childMarqueeItems.length, 1))));
  const stripRepeatGroups = stripGroupCount % 2 === 0 ? stripGroupCount : stripGroupCount + 1;

  useGSAP(() => {
    /* Eyebrow */
    gsap.fromTo('.mfst-eyebrow',
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'expo.out',
        scrollTrigger: { trigger: '.mfst-eyebrow', start: 'top 90%', toggleActions: 'play none none none' },
      });

    /* Quote words stagger */
    gsap.fromTo('.mfst-word',
      { opacity: 0, y: 16 },
      {
        opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.032,
        scrollTrigger: { trigger: '.mfst-quote', start: 'top 86%', toggleActions: 'play none none none' },
      });

    /* Body */
    gsap.fromTo('.mfst-body',
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.85, ease: 'expo.out',
        scrollTrigger: { trigger: '.mfst-body', start: 'top 90%', toggleActions: 'play none none none' },
      });

    /* Divider lines grow from center */
    gsap.fromTo('.mfst-divider',
      { scaleX: 0 },
      {
        scaleX: 1, duration: 1.1, ease: 'expo.out', transformOrigin: 'center',
        scrollTrigger: { trigger: '.mfst-divider', start: 'top 92%', toggleActions: 'play none none none' },
      });

    /* CTA */
    gsap.fromTo('.mfst-cta',
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'expo.out',
        scrollTrigger: { trigger: '.mfst-cta', start: 'top 92%', toggleActions: 'play none none none' },
      });

    /* Glow blooms in */
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 70%',
      onEnter: () => {
        gsap.fromTo('.mfst-glow',
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 2, ease: 'expo.out' });
      },
    });
  }, { scope: sectionRef, dependencies: [] });

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-0">
      <div className="divider" />

      {/* Marquee strip */}
      <div
        className="relative h-12 overflow-hidden"
        onMouseEnter={() => setIsStripHovered(true)}
        onMouseLeave={() => setIsStripHovered(false)}
        style={{
          background: 'rgba(var(--accent-rgb),0.07)',
          borderBottom: '1px solid rgba(var(--accent-rgb),0.12)',
          contain: 'paint',
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
            maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
          }}
        >
          <div
            className="flex h-full w-max min-w-max items-center whitespace-nowrap animate-marquee will-change-transform"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              lineHeight: 1,
              textTransform: 'uppercase',
              animationDuration: '240s',
              animationPlayState: isStripHovered ? 'paused' : 'running',
            }}
            aria-hidden="true"
          >
            {Array.from({ length: stripRepeatGroups }, (_, group) => (
              <div key={group} className="flex shrink-0 items-center gap-8 pr-8">
                {childMarqueeItems.map((item, i) => (
                  <Fragment key={`${group}-${item}-${i}`}>
                    <a
                      href={localizeHref(`/products?categories=${encodeURIComponent(item)}`, locale)}
                      className="shrink-0 text-[var(--accent)] transition-all duration-150 hover:text-[var(--soft-gold)] hover:scale-105 focus-visible:text-[var(--soft-gold)]"
                    >
                      {item}
                    </a>
                    <span className="shrink-0" style={{ color: 'var(--soft-gold)' }}>◆</span>
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{childMarqueeItems.join(', ')}</span>
      </div>

      {/* Manifesto block */}
      <div
        className="relative grain overflow-hidden"
        style={{
          background: 'var(--manifesto-bg)',
          backgroundImage,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        {/* Grid bg */}
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        {/* Ambient glow */}
        <div
          className="mfst-glow absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(var(--accent-rgb),0.08) 0%, transparent 70%)',
            opacity: 0,
          }}
        />

        <div className="px-8 md:px-24 py-24 md:py-36 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mfst-eyebrow type-label mb-8" style={{ color: 'rgba(var(--accent-rgb),0.55)', opacity: 0 }}>
              {content.eyebrow}
            </div>

            <blockquote
              className="mfst-quote"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4.5vw, 4rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                color: 'var(--fg)',
                marginBottom: '2rem',
              }}
            >
              &ldquo;<QuoteWords text={content.quotePrefix} />
              {content.quoteEmphasis && (
                <span className="mfst-word inline-block" style={{ color: 'var(--accent)', fontStyle: 'normal', textShadow: '0 0 30px rgba(var(--accent-rgb),0.4)', opacity: 0 }}>
                  &nbsp;{content.quoteEmphasis}&nbsp;
                </span>
              )}
              {content.quoteSuffix && <QuoteWords text={content.quoteSuffix} />}
              &rdquo;
            </blockquote>

            <p
              className="mfst-body"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 400,
                color: 'var(--muted-teal)',
                maxWidth: '460px',
                margin: '0 auto 3rem',
                lineHeight: 1.8,
                opacity: 0,
              }}
            >
              {content.body}
            </p>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="mfst-divider h-px w-16" style={{ background: 'rgba(var(--accent-rgb),0.2)', transform: 'scaleX(0)', transformOrigin: 'center' }} />
              <span style={{ color: 'var(--soft-gold)', fontSize: '0.7rem', textShadow: '0 0 8px rgba(var(--gold-rgb),0.5)' }}>◆</span>
              <div className="mfst-divider h-px w-16" style={{ background: 'rgba(var(--accent-rgb),0.2)', transform: 'scaleX(0)', transformOrigin: 'center' }} />
            </div>

            <a href={localizeHref(content.ctaHref, locale)} className="mfst-cta btn-primary" style={{ display: 'inline-flex', opacity: 0 }}>
              {content.ctaLabel}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="divider" />
    </section>
  );
}
