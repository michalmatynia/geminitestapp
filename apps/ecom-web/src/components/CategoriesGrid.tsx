/* eslint-disable @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions,complexity,max-lines-per-function */
'use client';

import { useRef, type CSSProperties, type JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeCategoriesContent } from '@/data/homeContent';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { useLocalizedHref } from '@/context/LocaleContext';
import { getHomeCategoryCardHref, type CatalogCategoryOption } from '@/lib/homeCategoryLinks';

const CATEGORY_VISUALS = [
  {
    id: 'objects',
    gradient: 'radial-gradient(circle at 50% 20%, rgba(229,183,94,0.22) 0%, transparent 30%), radial-gradient(circle at 14% 74%, rgba(234,247,238,0.08) 0%, transparent 24%), linear-gradient(145deg, #020205 0%, #060913 58%, #120708 100%)',
    accent: 'var(--soft-gold)',
    accentRgb: '229,183,94',
    aspectRatio: '2/3',
  },
  {
    id: 'womenswear',
    gradient: 'radial-gradient(circle at 32% 18%, rgba(216,116,50,0.2) 0%, transparent 30%), radial-gradient(circle at 78% 78%, rgba(201,60,47,0.12) 0%, transparent 32%), linear-gradient(145deg, #020205 0%, #120708 58%, #2A0A07 100%)',
    accent: 'var(--coral-red)',
    accentRgb: '201,60,47',
    aspectRatio: '3/4',
  },
  {
    id: 'menswear',
    gradient: 'radial-gradient(circle at 70% 22%, rgba(126,202,216,0.16) 0%, transparent 32%), radial-gradient(circle at 26% 74%, rgba(44,70,216,0.14) 0%, transparent 30%), linear-gradient(145deg, #020205 0%, #050812 56%, #0D1538 100%)',
    accent: 'var(--cyan-teal)',
    accentRgb: '126,202,216',
    aspectRatio: '3/4',
  },
  {
    id: 'accessories',
    gradient: 'radial-gradient(circle at 48% 18%, rgba(234,247,238,0.13) 0%, transparent 28%), radial-gradient(circle at 82% 76%, rgba(229,183,94,0.16) 0%, transparent 34%), linear-gradient(145deg, #020205 0%, #060913 58%, #140B13 100%)',
    accent: 'var(--mint-white)',
    accentRgb: '234,247,238',
    aspectRatio: '2/3',
  },
];

const DEFAULT_VISUAL = CATEGORY_VISUALS[0];

type CategoryCounts = Partial<Record<string, number | null>>;

function isValidCount(value: number | null | undefined): value is number { return typeof value === 'number' && Number.isFinite(value); }

export function CategoriesGrid({
  counts = {},
  content = HOME_CONTENT_DEFAULTS.categories,
  catalogCategories = [],
}: {
  counts?: CategoryCounts;
  content?: HomeCategoriesContent;
  catalogCategories?: CatalogCategoryOption[];
}): JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const hasLiveCounts = Object.values(counts).some(isValidCount);
  const localizedHref = useLocalizedHref();
  const cornerLineColorOpacity = (alpha: number, accentRgb: string): string => `rgba(${accentRgb}, ${alpha})`;

  useGSAP(() => {
    /* Section header reveal */
    gsap.fromTo('.cat-header',
      { y: 40 },
      {
        y: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: {
          trigger: '.cat-header',
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });

    /* Cards stagger in on scroll */
    ScrollTrigger.batch('.cat-card', {
      start: 'top 90%',
      onEnter: (batch) => {
        gsap.fromTo(batch,
          { y: 60, clipPath: 'inset(0 0 30% 0)' },
          {
            y: 0, clipPath: 'inset(0 0 0% 0)',
            duration: 1.0, ease: 'expo.out', stagger: 0.1,
          });
      },
    });

  }, { scope: sectionRef, dependencies: [] });

  return (
    <section ref={sectionRef} className='px-6 md:px-10 pt-20 pb-16 max-w-screen-2xl mx-auto'>
      {/* Section header */}
      <div className='cat-header flex items-end justify-between mb-12'>
        <div>
          <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>
            {content.eyebrow}
          </div>
          <h2 className='type-display-lg' style={{ color: 'var(--fg)' }}>
            {content.title}
          </h2>
        </div>
        <a
          href={localizedHref(content.ctaHref)}
          className='hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all duration-200'
          style={{ color: 'var(--muted-teal)' }}
        >
          {content.ctaLabel}
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
            <path d='M5 12h14M12 5l7 7-7 7' />
          </svg>
        </a>
      </div>

      {/* Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4'>
        {content.cards.filter((card) => card.visible).map((cat, i) => {
              const visual = CATEGORY_VISUALS.find((item) => item.id === cat.id) ?? CATEGORY_VISUALS[i] ?? DEFAULT_VISUAL;
              const categoryCount = counts[cat.id];
              const totalCount = cat.id === 'objects' && hasLiveCounts
                ? Object.values(counts).reduce<number>((total, count) => (isValidCount(count) ? total + count : total), 0)
                : undefined;
              const liveCount = isValidCount(categoryCount) ? categoryCount : totalCount;
              const displayCount = isValidCount(liveCount) ? `${liveCount.toLocaleString()} items` : `${cat.fallbackCount.toLocaleString()}+ items`;
              const cornerStatic = cornerLineColorOpacity(0.45, visual.accentRgb);
              const cornerTrace = cornerLineColorOpacity(0.95, visual.accentRgb);

              return (
            <a
              key={cat.id}
              href={localizedHref(getHomeCategoryCardHref(cat, catalogCategories))}
              className='cat-card category-card group block'
              style={{ aspectRatio: visual.aspectRatio }}
            >
              {/* Background */}
              {cat.imageUrl.trim() ? (
                <>
                  <img
                    src={cat.imageUrl}
                    alt=''
                    className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]'
                    loading='lazy'
                  />
                  <div
                    className='cat-bg absolute inset-0'
                    style={{ background: 'linear-gradient(180deg, rgba(4,3,20,0.14) 0%, rgba(4,3,20,0.76) 100%)' }}
                  />
                </>
              ) : (
                <div className='cat-bg absolute inset-0' style={{ background: visual.gradient }} />
              )}

              {/* Dot grid */}
              <div className='absolute inset-0 dot-grid opacity-30' />

              {/* Scanlines */}
              <div className='absolute inset-0 pointer-events-none category-card-scanline-wrap'>
                <div className='category-card-scanline-layer' />
              </div>

              {/* Corner brackets */}
              <div
                className='absolute z-30 pointer-events-none category-corner-marker'
                style={{
                  top: '0.75rem',
                  left: '0.75rem',
                  width: '42px',
                  height: '42px',
                  position: 'absolute',
                }}
              >
                <span
                  className='category-corner-frame'
                  style={{
                    top: 0,
                    left: 0,
                    borderTop: `1.5px solid ${cornerStatic}`,
                    borderLeft: `1.5px solid ${cornerStatic}`,
                    width: '42px',
                    height: '42px',
                  } as CSSProperties}
                />
                <span
                  style={{
                    background: cornerTrace,
                    boxShadow: `0 0 10px ${cornerTrace}`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '1.5px',
                    width: '42px',
                    transformOrigin: 'left center',
                    animation: 'corner-tl-trace-top 8s ease-in-out infinite',
                    display: 'block',
                  } as CSSProperties}
                />
                <span
                  style={{
                    background: cornerTrace,
                    boxShadow: `0 0 10px ${cornerTrace}`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1.5px',
                    height: '42px',
                    transformOrigin: 'top center',
                    animation: 'corner-tl-trace-left 8s ease-in-out infinite',
                    display: 'block',
                  } as CSSProperties}
                />
              </div>
              <div
                className='absolute z-30 pointer-events-none category-corner-marker'
                style={{
                  bottom: '0.75rem',
                  right: '0.75rem',
                  width: '42px',
                  height: '42px',
                  position: 'absolute',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '42px',
                    height: '42px',
                    transform: 'rotate(180deg)',
                    transformOrigin: '50% 50%',
                  }}
                >
                  <span
                    className='category-corner-frame'
                    style={{
                      top: 0,
                      left: 0,
                      borderTop: `1.5px solid ${cornerStatic}`,
                      borderLeft: `1.5px solid ${cornerStatic}`,
                      width: '42px',
                      height: '42px',
                    } as CSSProperties}
                  />
                  <span
                    style={{
                      background: cornerTrace,
                      boxShadow: `0 0 10px ${cornerTrace}`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '1.5px',
                      width: '42px',
                      transformOrigin: 'left center',
                      animation: 'corner-tl-trace-top 8s ease-in-out infinite',
                      display: 'block',
                    } as CSSProperties}
                  />
                  <span
                    style={{
                      background: cornerTrace,
                      boxShadow: `0 0 10px ${cornerTrace}`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '1.5px',
                      height: '42px',
                      transformOrigin: 'top center',
                      animation: 'corner-tl-trace-left 8s ease-in-out infinite',
                      display: 'block',
                    } as CSSProperties}
                  />
                </div>
              </div>

              {/* Content */}
              <div className='absolute inset-0 p-5 flex flex-col justify-between z-20'>
                {/* Tag */}
                <div>
                  <span
                    className='type-label inline-block'
                    style={{
                      color: visual.accent,
                      background: `rgba(${visual.accentRgb},0.1)`,
                      border: `1px solid rgba(${visual.accentRgb},0.3)`,
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
                      color: 'var(--on-media)',
                      marginBottom: '0.35rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {cat.label}
                  </h3>
                  <p className='type-label mb-2' style={{ color: `rgba(${visual.accentRgb},0.65)`, letterSpacing: '0.1em' }}>
                    {cat.sublabel}
                  </p>
                  <p className='type-label' style={{ color: `rgba(${visual.accentRgb},0.4)` }}>
                    {displayCount}
                    {isValidCount(liveCount) && (
                      <span style={{ color: visual.accent, opacity: 0.6 }}> · live</span>
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
