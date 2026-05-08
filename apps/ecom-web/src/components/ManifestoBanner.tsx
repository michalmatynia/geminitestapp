'use client';

import { Fragment, useRef, type JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeManifestoContent } from '@/data/homeContent';
import { DEFAULT_LOCALE, localizeHref, type EcomLocale } from '@/lib/locales';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';

interface ManifestoBannerProps {
  content?: HomeManifestoContent;
  locale?: EcomLocale;
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

export function ManifestoBanner({ content = HOME_CONTENT_DEFAULTS.manifesto, locale = DEFAULT_LOCALE }: ManifestoBannerProps): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);

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
            }}
            aria-hidden="true"
          >
            {[0, 1].map((group) => (
              <div key={group} className="flex shrink-0 items-center gap-8 pr-8">
                {content.marqueeItems.map((item, i) => (
                  <Fragment key={`${group}-${item}-${i}`}>
                    <span className="shrink-0" style={{ color: 'var(--accent)' }}>{item}</span>
                    <span className="shrink-0" style={{ color: 'var(--soft-gold)' }}>◆</span>
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{content.marqueeItems.join(', ')}</span>
      </div>

      {/* Manifesto block */}
      <div className="relative grain overflow-hidden" style={{ background: 'var(--manifesto-bg)' }}>
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
