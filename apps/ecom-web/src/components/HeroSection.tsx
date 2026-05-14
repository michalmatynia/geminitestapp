/* eslint-disable @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-non-null-assertion,@typescript-eslint/strict-boolean-expressions,complexity,max-lines,max-lines-per-function,no-nested-ternary */
'use client';

import { useRef, useCallback, useState, useEffect, type CSSProperties, type JSX } from 'react';
import { HOME_CONTENT_DEFAULTS, type HomeHeroContent } from '@/data/homeContent';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import {
  buildHomeProductTypeCategoryHref,
  resolveHomeProductTypeFilterKey,
  type CatalogCategoryOption,
} from '@/lib/homeCategoryLinks';

/* ── Zone data ──────────────────────────────────────────────────── */
type ZoneId = 'outer' | 'middle' | 'inner';

const ZONES = {
  outer: {
    label: 'ANIME UNIVERSE',
    short: 'Anime',
    color: 'var(--accent)',
    rgb: '171,217,208',
    items: [
      'Attack on Titan',
      'Demon Slayer',
      'Jujutsu Kaisen',
      'One Piece',
      'Naruto Shippuden',
      'Fullmetal Alchemist',
    ],
  },
  middle: {
    label: 'CINEMATIC LORE',
    short: 'Cinematic',
    color: 'var(--soft-gold)',
    rgb: '250,229,163',
    items: [
      'Star Wars',
      'The Matrix',
      'Blade Runner 2049',
      'Dune',
      'Inception',
      'Mad Max: Fury Road',
    ],
  },
  inner: {
    label: 'GAMING REALM',
    short: 'Gaming',
    color: 'var(--coral-red)',
    rgb: '210,116,102',
    items: [
      'Elden Ring',
      'Dark Souls',
      'Final Fantasy VII',
      'Cyberpunk 2077',
      'The Witcher 3',
      'Halo Infinite',
    ],
  },
} as const satisfies Record<ZoneId, {
  label: string; short: string; color: string; rgb: string; items: readonly string[];
}>;

const ZONE_IDS: ZoneId[] = ['outer', 'middle', 'inner'];
const STAT_COLORS = ['var(--soft-gold)', 'var(--accent)', 'var(--peach-orange)'];

const HERO_COPY = {
  en: {
    zones: {
      outer: { label: 'ANIME UNIVERSE', short: 'Anime', items: ZONES.outer.items },
      middle: { label: 'CINEMATIC LORE', short: 'Cinematic', items: ZONES.middle.items },
      inner: { label: 'GAMING REALM', short: 'Gaming', items: ZONES.inner.items },
    },
    clickToExplore: '· click to explore ·',
    allThemes: 'All themes',
    hoverOuter: '- outer ring -',
    hoverMiddle: '- middle ring -',
    hoverCenter: '- center gem -',
    hoverIdle: 'hover zones to explore',
  },
  pl: {
    zones: {
      outer: { label: 'ŚWIAT ANIME', short: 'Anime', items: ZONES.outer.items },
      middle: { label: 'FILMOWE LORE', short: 'Film', items: ZONES.middle.items },
      inner: { label: 'ŚWIAT GIER', short: 'Gaming', items: ZONES.inner.items },
    },
    clickToExplore: '· kliknij, aby odkryć ·',
    allThemes: 'Wszystkie światy',
    hoverOuter: '- zewnętrzny krąg -',
    hoverMiddle: '- środkowy krąg -',
    hoverCenter: '- rdzeń -',
    hoverIdle: 'najedź, aby odkryć',
  },
} as const;

type HeroCopy = {
  zones: Record<ZoneId, { label: string; short: string; items: readonly string[] }>;
  clickToExplore: string;
  allThemes: string;
};

interface HeroSectionProps {
  content?: HomeHeroContent;
  catalogCategories?: CatalogCategoryOption[];
  heroLoreGroups?: Partial<Record<'anime' | 'gaming' | 'movie', string[]>>;
}

function getZoneLoreGroupKey(zone: ZoneId): 'anime' | 'gaming' | 'movie' {
  if (zone === 'outer') return 'anime';
  if (zone === 'middle') return 'movie';
  return 'gaming';
}

function buildThemeCatalogHref(theme: string): string {
  const params = new URLSearchParams({ themes: theme });
  return `/products?${params.toString()}`;
}

/* ── Interactive + Animated Hexagon SVG ─────────────────────────── */
function HexMenu({
  hexWrapRef,
  outerRingRef,
  middleRingRef,
  centerGroupRef,
  hoveredZone,
  activeZone,
  onEnter,
  onLeave,
  onClick,
}: {
  hexWrapRef: React.RefObject<HTMLDivElement | null>;
  outerRingRef: React.RefObject<SVGGElement | null>;
  middleRingRef: React.RefObject<SVGGElement | null>;
  centerGroupRef: React.RefObject<SVGGElement | null>;
  hoveredZone: ZoneId | null;
  activeZone: ZoneId | null;
  onEnter: (z: ZoneId) => void;
  onLeave: () => void;
  onClick: (z: ZoneId) => void;
}): JSX.Element {
  const zone = activeZone ?? hoveredZone;

  const outerFill  = zone === 'outer'  ? `rgba(${ZONES.outer.rgb},0.18)`  : 'rgba(0,0,0,0)';
  const middleFill = zone === 'middle' ? `rgba(${ZONES.middle.rgb},0.18)` : 'rgba(0,0,0,0)';
  const innerFill  = zone === 'inner'  ? `rgba(${ZONES.inner.rgb},0.22)`  : 'rgba(var(--accent-rgb),0.06)';

  const outerStroke  = zone === 'outer'  ? `rgba(${ZONES.outer.rgb},0.85)`  : 'rgba(var(--accent-rgb),0.35)';
  const middleStroke = zone === 'middle' ? `rgba(${ZONES.middle.rgb},0.75)` : 'rgba(var(--accent-rgb),0.2)';
  const innerStroke  = zone === 'inner'  ? `rgba(${ZONES.inner.rgb},0.95)`  : 'rgba(var(--accent-rgb),0.6)';
  const lineStroke   = zone ? `rgba(${ZONES[zone].rgb},0.4)` : 'rgba(var(--accent-rgb),0.3)';
  const nodeFill     = zone === 'outer' ? `rgba(${ZONES.outer.rgb},0.75)` : 'rgba(var(--accent-rgb),0.5)';
  const centerFill   = zone ? `rgba(${ZONES[zone].rgb},0.9)` : 'rgba(var(--accent-rgb),0.8)';
  const centerGlow   = `drop-shadow(0 0 ${zone ? '8px' : '6px'} ${zone ? `rgba(${ZONES[zone].rgb},0.9)` : 'rgba(var(--accent-rgb),0.9)'})`;

  const outerGlow  = activeZone === 'outer'  ? `drop-shadow(0 0 6px rgba(${ZONES.outer.rgb},0.7))`  : 'none';
  const middleGlow = activeZone === 'middle' ? `drop-shadow(0 0 5px rgba(${ZONES.middle.rgb},0.6))` : 'none';
  const innerGlow  = activeZone === 'inner'  ? `drop-shadow(0 0 8px rgba(${ZONES.inner.rgb},0.8))`  : 'none';

  return (
    /* Wrapper: receives float + 3-D tilt from parent */
    <div
      ref={hexWrapRef}
      style={{ width: '160px', height: '160px', willChange: 'transform' }}
    >
      <svg
        viewBox='0 0 200 200'
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/* ── Zone ring highlight fills (evenodd cuts out inner zone) ── */}
        <path
          d='M100,12 L176,56 L176,144 L100,188 L24,144 L24,56 Z
             M100,36 L156,68 L156,132 L100,164 L44,132 L44,68 Z'
          fillRule='evenodd'
          fill={outerFill}
          style={{ pointerEvents: 'none', transition: 'fill 0.25s ease', filter: outerGlow }}
        />
        <path
          d='M100,36 L156,68 L156,132 L100,164 L44,132 L44,68 Z
             M100,60 L130,88 L130,118 L100,140 L70,118 L70,88 Z'
          fillRule='evenodd'
          fill={middleFill}
          style={{ pointerEvents: 'none', transition: 'fill 0.25s ease', filter: middleGlow }}
        />
        <polygon
          points='100,60 130,88 130,118 100,140 70,118 70,88'
          fill={innerFill}
          style={{ pointerEvents: 'none', transition: 'fill 0.25s ease', filter: innerGlow }}
        />

        {/* ── Outer ring group (oscillates gently) ─────────────────── */}
        <g ref={outerRingRef}>
          <polygon
            className='hero-svg-el'
            points='100,12 176,56 176,144 100,188 24,144 24,56'
            fill='none'
            stroke={outerStroke}
            strokeWidth={zone === 'outer' ? 1.6 : 1}
            style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
          />
          {([[100,12],[176,56],[176,144],[100,188],[24,144],[24,56]] as [number,number][]).map(([cx,cy],i) => (
            <circle
              key={i}
              className='hero-svg-el'
              cx={cx} cy={cy} r='3'
              fill={nodeFill}
              style={{ transition: 'fill 0.3s' }}
            />
          ))}
        </g>

        {/* ── Middle ring group (counter-oscillates) ───────────────── */}
        <g ref={middleRingRef}>
          <polygon
            className='hero-svg-el'
            points='100,36 156,68 156,132 100,164 44,132 44,68'
            fill='none'
            stroke={middleStroke}
            strokeWidth={zone === 'middle' ? 1.6 : 1}
            style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
          />
        </g>

        {/* ── Center group (gentle scale breathe) ──────────────────── */}
        <g ref={centerGroupRef}>
          <polygon
            className='hero-svg-el'
            points='100,60 130,88 130,118 100,140 70,118 70,88'
            fill='none'
            stroke={innerStroke}
            strokeWidth={zone === 'inner' ? 2 : 1.5}
            style={{ transition: 'stroke 0.25s' }}
          />
          {(['100,60,100,100','130,88,100,100','130,118,100,100',
             '100,140,100,100','70,118,100,100','70,88,100,100'] as const).map((c, i) => {
            const [x1,y1,x2,y2] = c.split(',').map(Number);
            return (
              <line
                key={i}
                className='hero-svg-el'
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={lineStroke}
                strokeWidth='0.8'
                style={{ transition: 'stroke 0.3s' }}
              />
            );
          })}
          <circle
            className='hero-svg-el'
            cx='100' cy='100' r={zone ? 7 : 5}
            fill={centerFill}
            style={{ filter: centerGlow, transition: 'r 0.3s, fill 0.3s, filter 0.3s' }}
          />
        </g>

        {/* ── Hit areas — transparent but pointer-event-capturing ────── */}
        <polygon
          points='100,12 176,56 176,144 100,188 24,144 24,56'
          fill='rgba(0,0,0,0)'
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          onMouseEnter={() => onEnter('outer')}
          onMouseMove={() => onEnter('outer')}
          onMouseLeave={onLeave}
          onClick={() => onClick('outer')}
        />
        <polygon
          points='100,36 156,68 156,132 100,164 44,132 44,68'
          fill='rgba(0,0,0,0)'
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          onMouseEnter={() => onEnter('middle')}
          onMouseMove={() => onEnter('middle')}
          onMouseLeave={onLeave}
          onClick={() => onClick('middle')}
        />
        <polygon
          points='100,60 130,88 130,118 100,140 70,118 70,88'
          fill='rgba(0,0,0,0)'
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          onMouseEnter={() => onEnter('inner')}
          onMouseMove={() => onEnter('inner')}
          onMouseLeave={onLeave}
          onClick={() => onClick('inner')}
        />
      </svg>
    </div>
  );
}

/* ── Lore panel content ─────────────────────────────────────────── */
function LorePanel({
  content,
  copy,
  panelIdleSubtitle,
  heroLoreGroups,
  hoveredZone,
  activeZone,
  selectedLore,
  engageHref,
  onZoneClick,
  onZoneHover,
  onZoneLeave,
  onLoreSelect,
  onBack,
}: {
  content: HomeHeroContent;
  copy: HeroCopy;
  panelIdleSubtitle: string;
  heroLoreGroups: Partial<Record<'anime' | 'gaming' | 'movie', string[]>>;
  hoveredZone: ZoneId | null;
  activeZone: ZoneId | null;
  selectedLore: string | null;
  engageHref: string | null;
  onZoneClick: (z: ZoneId) => void;
  onZoneHover: (z: ZoneId) => void;
  onZoneLeave: () => void;
  onLoreSelect: (l: string) => void;
  onBack: () => void;
}): JSX.Element {
  const loreRef = useRef<HTMLDivElement>(null);
  const displayZone = activeZone ?? hoveredZone;
  useEffect(() => {
    if (!activeZone || !loreRef.current) return;
    const items = loreRef.current.querySelectorAll<HTMLElement>('.lore-item');
    gsap.fromTo(items,
      { x: -14 },
      { x: 0, duration: 0.38, ease: 'expo.out', stagger: 0.045 });
  }, [activeZone]);

  const zoneStyle = displayZone ? ZONES[displayZone] : null;
  const zoneText = displayZone ? copy.zones[displayZone] : null;
  const title = selectedLore
    ? selectedLore
    : activeZone
    ? zoneText!.label
    : hoveredZone
    ? copy.zones[hoveredZone].label
    : content.panelTitle;

  const titleColor = zoneStyle ? zoneStyle.color : 'var(--fg)';
  const liveLoreItems = activeZone ? heroLoreGroups[getZoneLoreGroupKey(activeZone)] : undefined;
  const activeLoreItems = activeZone
    ? liveLoreItems && liveLoreItems.length > 0
      ? liveLoreItems
      : copy.zones[activeZone].items
    : [];
  const engageStyle = {
    '--hero-engage-color': zoneStyle?.color ?? 'var(--accent)',
    '--hero-engage-rgb': zoneStyle?.rgb ?? 'var(--accent-rgb)',
  } as CSSProperties;

  return (
    <div className='hero-panel-info text-center select-none'>
      <style>{`
        .hero-engage-cta {
          color: var(--hero-engage-color);
          background: linear-gradient(135deg, rgba(var(--hero-engage-rgb),0.14), rgba(var(--hero-engage-rgb),0.04));
          border: 1px solid rgba(var(--hero-engage-rgb),0.5);
          box-shadow: 0 0 18px rgba(var(--hero-engage-rgb),0.16), inset 0 0 18px rgba(var(--hero-engage-rgb),0.06);
          clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
          letter-spacing: 0.18em;
          text-decoration: none;
          transform: translateY(0) scale(1);
          animation: hero-engage-idle 2.6s ease-in-out infinite;
          will-change: transform, box-shadow, background, letter-spacing;
        }

        .hero-engage-cta svg {
          transition: transform 0.22s ease;
        }

        .hero-engage-cta:hover,
        .hero-engage-cta:focus-visible {
          animation: hero-engage-hover 0.72s ease-in-out infinite alternate;
          background: linear-gradient(135deg, rgba(var(--hero-engage-rgb),0.24), rgba(var(--hero-engage-rgb),0.08));
          box-shadow:
            0 0 28px rgba(var(--hero-engage-rgb),0.32),
            0 0 56px rgba(var(--hero-engage-rgb),0.14),
            inset 0 0 22px rgba(var(--hero-engage-rgb),0.12);
          letter-spacing: 0.22em;
          outline: none;
        }

        .hero-engage-cta:hover svg,
        .hero-engage-cta:focus-visible svg {
          transform: translateX(3px);
        }

        @keyframes hero-engage-idle {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 0 18px rgba(var(--hero-engage-rgb),0.16), inset 0 0 18px rgba(var(--hero-engage-rgb),0.06);
          }
          50% {
            transform: translateY(-1px) scale(1.018);
            box-shadow: 0 0 24px rgba(var(--hero-engage-rgb),0.24), inset 0 0 20px rgba(var(--hero-engage-rgb),0.08);
          }
        }

        @keyframes hero-engage-hover {
          from { transform: translateY(-1px) scale(1.025); }
          to { transform: translateY(-3px) scale(1.065); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-engage-cta,
          .hero-engage-cta:hover,
          .hero-engage-cta:focus-visible {
            animation: none;
            transform: none;
          }
        }
      `}</style>
      {/* Zone badge */}
      <div className='flex justify-center mb-3 min-h-[1.4rem]'>
        {zoneStyle && zoneText && (
          <span
            className='type-label px-2 py-0.5'
            style={{
              color: zoneStyle.color,
              border: `1px solid rgba(${zoneStyle.rgb},0.45)`,
              background: `rgba(${zoneStyle.rgb},0.08)`,
              transition: 'all 0.25s ease',
            }}
          >
            {zoneText.short}
          </span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: selectedLore ? '1.1rem' : '1.25rem',
          fontWeight: 700,
          color: titleColor,
          letterSpacing: '0.03em',
          marginBottom: '0.5rem',
          lineHeight: 1.2,
          transition: 'color 0.3s ease, font-size 0.2s ease',
          textShadow: zoneStyle ? `0 0 20px rgba(${zoneStyle.rgb},0.3)` : 'none',
          minHeight: '1.5rem',
        }}
      >
        {title}
      </div>

      {/* No zone active → zone selectors */}
      {!activeZone && (
        <div>
          <div className='type-label mb-4' style={{ color: 'var(--muted-teal)', textTransform: 'none' }}>
            {hoveredZone ? copy.clickToExplore : panelIdleSubtitle}
          </div>
          <div className='flex justify-center items-center gap-4 mb-5'>
            {ZONE_IDS.map((z) => (
              <button
                key={z}
                onMouseEnter={() => onZoneHover(z)}
                onMouseLeave={onZoneLeave}
                onFocus={() => onZoneHover(z)}
                onBlur={onZoneLeave}
                onClick={() => onZoneClick(z)}
                title={copy.zones[z].label}
                className='flex flex-col items-center gap-1.5'
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <span
                  className='block w-2.5 h-2.5 rounded-full transition-all duration-200'
                  style={{
                    background: hoveredZone === z ? ZONES[z].color : `rgba(${ZONES[z].rgb},0.3)`,
                    boxShadow: hoveredZone === z ? `0 0 8px ${ZONES[z].color}` : 'none',
                    transform: hoveredZone === z ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
                <span
                  className='type-label'
                  style={{
                    color: hoveredZone === z ? ZONES[z].color : 'var(--muted-teal)',
                    fontSize: '0.55rem',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {copy.zones[z].short}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active zone → lore list */}
      {activeZone && (
        <div
          ref={loreRef}
          className='mb-3'
          style={{ maxHeight: '13rem', overflowY: 'auto', paddingRight: '0.25rem' }}
        >
          {activeLoreItems.map((lore) => {
            const isSelected = selectedLore === lore;
            return (
              <button
                key={lore}
                className='lore-item block w-full text-left px-3 py-1.5 transition-all duration-150'
                style={{
                  background: isSelected ? `rgba(${ZONES[activeZone].rgb},0.1)` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? ZONES[activeZone].color : 'var(--fg)',
                  borderLeft: isSelected ? `2px solid ${ZONES[activeZone].color}` : '2px solid transparent',
                  letterSpacing: '0.03em',
                  opacity: 1,
                }}
                onClick={() => onLoreSelect(lore)}
              >
                {isSelected && <span style={{ marginRight: '0.4rem', fontSize: '0.6rem' }}>▶</span>}
                {lore}
              </button>
            );
          })}
        </div>
      )}

      {/* Back link */}
      {activeZone && (
        <button
          onClick={onBack}
          className='type-label mb-3'
          style={{ color: 'var(--muted-teal)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
            <path d='M19 12H5M12 19l-7-7 7-7' />
          </svg>
          {copy.allThemes}
        </button>
      )}

      {selectedLore && engageHref && (
        <div
          className='mt-1 flex justify-center'
          style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.1)', paddingTop: '0.85rem' }}
        >
          <a
            href={engageHref}
            className='hero-engage-cta type-label inline-flex items-center justify-center gap-2 px-4 py-2 transition-all duration-200'
            style={engageStyle}
          >
            Engage
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M5 12h14M13 5l7 7-7 7' />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

/* ── Main HeroSection ───────────────────────────────────────────── */
export function HeroSection({
  content = HOME_CONTENT_DEFAULTS.hero,
  catalogCategories = [],
  heroLoreGroups = {},
}: HeroSectionProps): JSX.Element {
  const bottomStripText = [...content.bottomStripItems, ...content.bottomStripItems].join('  ·  ');
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const copy = locale === 'pl' ? HERO_COPY.pl : HERO_COPY.en;
  const heroProductTags = locale === 'pl'
    ? ['Breloki', 'Piny', 'Pierścionki', 'Bransoletki', 'Kości']
    : ['Keychains', 'Pins', 'Rings', 'Bracelets', 'Dice'];
  const headlineLine1FontSize = locale === 'pl'
    ? 'clamp(2.25rem, 8.4cqw, 4.35rem)'
    : 'clamp(3.1rem, 12cqw, 5.8rem)';
  const headlineLine2FontSize = 'clamp(3.1rem, 12cqw, 5.8rem)';

  /* Hex menu interaction state */
  const [hoveredZone, setHoveredZone]           = useState<ZoneId | null>(null);
  const [activeZone, setActiveZone]             = useState<ZoneId | null>(null);
  const [selectedLore, setSelectedLore]         = useState<string | null>(null);
  const engageHref = selectedLore ? localizedHref(buildThemeCatalogHref(selectedLore)) : null;

  /* Refs */
  const sectionRef     = useRef<HTMLElement>(null);
  const leftRef        = useRef<HTMLDivElement>(null);
  const rightRef       = useRef<HTMLDivElement>(null);
  const glowRef        = useRef<HTMLDivElement>(null);
  const panelRef       = useRef<HTMLDivElement>(null);
  /* Hexagon animation refs */
  const hexWrapRef     = useRef<HTMLDivElement>(null);
  const outerRingRef   = useRef<SVGGElement>(null);
  const middleRingRef  = useRef<SVGGElement>(null);
  const centerGroupRef = useRef<SVGGElement>(null);
  /* Stores panel height just before a zone transition so we can animate from it */
  const panelHeightRef = useRef<number>(0);

  const captureHeight = useCallback(() => {
    if (panelRef.current) panelHeightRef.current = panelRef.current.offsetHeight;
  }, []);

  const handleZoneClick = useCallback((z: ZoneId) => {
    captureHeight();
    setActiveZone((prev) => (prev === z ? null : z));
    setSelectedLore(null);
  }, [captureHeight]);

  const handleLoreSelect = useCallback((lore: string) => {
    setSelectedLore((prev) => (prev === lore ? null : lore));
  }, []);

  const handleBack = useCallback(() => {
    captureHeight();
    setActiveZone(null);
    setSelectedLore(null);
  }, [captureHeight]);

  /* ── Panel height animation on zone open / close ─────────────── */
  useEffect(() => {
    if (!panelRef.current) return;
    const panel = panelRef.current;
    const fromH = panelHeightRef.current;
    if (!fromH) return; // skip initial mount (no prior height recorded)
    gsap.fromTo(
      panel,
      { height: fromH },
      { height: 'auto', duration: 0.58, ease: 'expo.out',
        onComplete: () => gsap.set(panel, { height: 'auto' }) },
    );
  }, [activeZone]);

  /* ── Click outside the panel closes the active zone ──────────── */
  useEffect(() => {
    if (activeZone) {
      const onDocClick = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          handleBack();
        }
      };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }
    return undefined;
  }, [activeZone, handleBack]);  /* ── Idle animations — start after entrance completes (~2.2s) ─── */
  useEffect(() => {
    const delay = setTimeout(() => {
      /* Float — applied to the hexagon wrapper */
      gsap.to(hexWrapRef.current, {
        y: -9,
        duration: 2.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      /* Outer ring: slow oscillation ±5 deg */
      gsap.to(outerRingRef.current, {
        rotation: 5,
        svgOrigin: '100 100',
        duration: 9,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      /* Middle ring: counter-oscillation ±7 deg */
      gsap.to(middleRingRef.current, {
        rotation: -7,
        svgOrigin: '100 100',
        duration: 7,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      /* Center group: gentle scale breathe */
      gsap.to(centerGroupRef.current, {
        scale: 1.1,
        svgOrigin: '100 100',
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut',
      });
    }, 2200);

    return () => {
      clearTimeout(delay);
      [hexWrapRef, outerRingRef, middleRingRef, centerGroupRef].forEach((r) => {
        if (r.current) gsap.killTweensOf(r.current);
      });
    };
  }, []);

  /* ── Panel mouse tracking → 3-D tilt on the hexagon ──────────── */
  const onPanelMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hexWrapRef.current) return;
    const panel = e.currentTarget.getBoundingClientRect();
    const hex   = hexWrapRef.current.getBoundingClientRect();
    const hexCx = hex.left + hex.width  / 2;
    const hexCy = hex.top  + hex.height / 2;

    /* Normalised distance from hex center, capped at ±1 */
    const nx = Math.max(-1, Math.min(1, (e.clientX - hexCx) / (panel.width  / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - hexCy) / (panel.height / 2)));

    gsap.to(hexWrapRef.current, {
      rotationX: -ny * 20,
      rotationY:  nx * 20,
      transformPerspective: 550,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto',   /* only cancels rotation tweens, leaves y-float running */
    });
  }, []);

  const onPanelMouseLeave = useCallback(() => {
    if (!hexWrapRef.current) return;
    gsap.to(hexWrapRef.current, {
      rotationX: 0,
      rotationY: 0,
      duration: 1.8,
      ease: 'elastic.out(1, 0.4)',
      overwrite: 'auto',
    });
  }, []);

  /* ── Mouse parallax for ambient glow (whole section) ─────────── */
  const onSectionMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!glowRef.current || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const cx = ((e.clientX - rect.left)  / rect.width  - 0.5) * 80;
    const cy = ((e.clientY - rect.top)   / rect.height - 0.5) * 60;
    gsap.to(glowRef.current, { x: cx, y: cy, duration: 1.4, ease: 'power2.out' });
  }, []);

  /* ── Entrance + scroll parallax (GSAP) ───────────────────────── */
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.fromTo('.hero-right',
      { x: 40 },
      { x: 0, duration: 1.2, ease: 'expo.out' }, 0.05);

    tl.fromTo('.hero-beacon',
      { x: -24 },
      { x: 0, duration: 0.7 }, 0.15);

    tl.fromTo('.hero-h1-1', { yPercent: 115 }, { yPercent: 0, duration: 1.1 }, 0.3);
    tl.fromTo('.hero-h1-2', { yPercent: 115 }, { yPercent: 0, duration: 1.1 }, 0.45);

    tl.fromTo('.hero-tag',
      { y: 14, scale: 0.92 },
      { y: 0, scale: 1, duration: 0.55, stagger: 0.06 }, 0.62);

    tl.fromTo('.hero-desc',  { y: 22 }, { y: 0, duration: 0.75 }, 0.78);
    tl.fromTo('.hero-cta',   { y: 18 }, { y: 0, duration: 0.65, stagger: 0.1 }, 0.9);
    tl.fromTo('.hero-stat',  { y: 28 }, { y: 0, duration: 0.7,  stagger: 0.12 }, 1.05);

    tl.fromTo('.hero-svg-el',
      { scale: 0.7, transformOrigin: '100px 100px' },
      { scale: 1,   duration: 0.9, stagger: 0.04 }, 0.9);

    tl.fromTo('.hero-panel-bar',  { y: -10 }, { y: 0, duration: 0.6 }, 1.1);
    tl.fromTo('.hero-panel-info', { y: 16  }, { y: 0, duration: 0.7 }, 1.2);

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(leftRef.current,  { y: p * 110 });
        gsap.set(rightRef.current, { y: p * 55 });
      },
    });
  }, { scope: sectionRef, dependencies: [] });

  /* Bracket + panel border color follows active zone */
  const bracketZone  = activeZone ?? hoveredZone;
  const bracketColor = bracketZone ? ZONES[bracketZone].color : 'var(--accent)';
  const bracketRgb   = bracketZone ? ZONES[bracketZone].rgb   : 'var(--accent-rgb)';

  return (
    <section
      ref={sectionRef}
      className='relative min-h-screen flex items-stretch overflow-hidden'
      style={{ paddingTop: 'var(--nav-h)', background: 'var(--bg)' }}
      onMouseMove={onSectionMouseMove}
    >
      <div className='absolute inset-0 dot-grid opacity-30 pointer-events-none' />

      {/* Ambient glow */}
      <div
        ref={glowRef}
        className='absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none will-change-transform'
        style={{ background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.07) 0%, transparent 70%)' }}
      />

      {/* ── Left column ─────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className='relative z-10 flex flex-col justify-center px-8 md:px-14 lg:px-16 xl:px-20 w-full lg:w-[55%] py-20 lg:py-28 will-change-transform'
        style={{ containerType: 'inline-size' }}
      >
        <div className='hero-beacon flex items-center gap-3 mb-10'>
          <span
            className='w-2 h-2 rounded-full flex-shrink-0'
            style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'neonPulse 2s ease-in-out infinite' }}
          />
          <span className='type-label tracking-[0.22em]' style={{ color: 'var(--accent)' }}>{content.status}</span>
        </div>

        <div className='overflow-hidden mb-1'>
          <h1
            className='hero-h1-1 type-display-xl'
            style={{
              color: 'var(--fg)',
              fontSize: headlineLine1FontSize,
              letterSpacing: 0,
              maxWidth: '100%',
              whiteSpace: 'nowrap',
            }}
          >
            {content.headlineLine1}
          </h1>
        </div>
        <div className='overflow-hidden mb-8'>
          <h1
            className='hero-h1-2 hero-cache-glitch type-display-xl'
            data-text={content.headlineLine2}
            aria-label={content.headlineLine2}
            style={{
              color: 'transparent',
              fontSize: headlineLine2FontSize,
              letterSpacing: 0,
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              WebkitTextStroke: '1.5px var(--accent)',
              textShadow: '0 0 60px rgba(var(--accent-rgb),0.25)',
            }}
          >
            {Array.from(content.headlineLine2).map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                aria-hidden='true'
                className='hero-cache-letter'
                style={{ animationDelay: `${index * -0.28}s` }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            ))}
          </h1>
        </div>

        <div className='flex flex-wrap gap-2 mb-8'>
          {heroProductTags.map((tag) => {
            const filterKey = resolveHomeProductTypeFilterKey(tag);
            const href = filterKey === null
              ? '/products'
              : buildHomeProductTypeCategoryHref(filterKey, catalogCategories);

            return (
              <a
                key={tag}
                href={localizedHref(href)}
                className='hero-tag neon-tag-cyan inline-block transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
              >
                {tag}
              </a>
            );
          })}
        </div>

        <p
          className='hero-desc max-w-md mb-8 leading-relaxed'
          style={{ color: 'var(--muted-teal)', fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 400 }}
        >
          {content.description}
        </p>

        <div className='flex flex-wrap gap-4'>
          <a href={localizedHref(content.primaryCtaHref)} className='hero-cta btn-primary'>
            {content.primaryCtaLabel}
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <path d='M5 12h14M12 5l7 7-7 7' />
            </svg>
          </a>
          <a href={localizedHref(content.secondaryCtaHref)} className='hero-cta btn-ghost'>
            {content.secondaryCtaLabel}
          </a>
        </div>

        <div className='flex gap-10 mt-10 pt-5' style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
          {content.stats.map(({ value, label }, index) => {
            const color = STAT_COLORS[index % STAT_COLORS.length];
            return (
              <div key={`${label}-${index}`} className='hero-stat'>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 2.8vw, 2.5rem)', fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 20px ${color}66` }}>
                  {value}
                </div>
                <div className='type-label mt-1.5' style={{ color: 'var(--muted-teal)' }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right column ────────────────────────────────────────── */}
      <div
        ref={rightRef}
        className='hero-right hidden lg:block absolute right-0 top-0 bottom-0 w-[47%] will-change-transform'
        style={{ background: 'var(--hero-visual-bg)', clipPath: 'inset(0 0 0 0)' }}
      >
        <div className='absolute inset-0 dot-grid opacity-40' />
        <div
          className='absolute inset-0 pointer-events-none'
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, var(--scanline-soft) 3px, var(--scanline-soft) 4px)', zIndex: 1 }}
        />

        {/* Corner brackets — color follows active zone */}
        {(['top-8 left-8 border-t-2 border-l-2','top-8 right-8 border-t-2 border-r-2',
           'bottom-8 left-8 border-b-2 border-l-2','bottom-8 right-8 border-b-2 border-r-2'] as const).map((cls, i) => (
          <div
            key={i}
            className={`absolute w-10 h-10 z-10 transition-colors duration-300 ${cls}`}
            style={{ borderColor: bracketColor, opacity: 0.7 }}
          />
        ))}

        {/* Central display panel — mouse events here drive the hex tilt */}
        <div className='absolute inset-0 flex flex-col items-center justify-center z-10 px-10'>
          <div
            ref={panelRef}
            className='w-full px-8 py-6 relative overflow-hidden'
            style={{
              border: `1px solid rgba(${bracketRgb},0.25)`,
              background: 'var(--panel-bg)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 60px rgba(var(--accent-rgb),0.06), inset 0 0 40px rgba(var(--accent-rgb),0.03)',
              animation: 'neonBorderPulse 4s ease-in-out infinite',
              transition: 'border-color 0.4s ease',
            }}
            onMouseMove={onPanelMouseMove}
            onMouseLeave={onPanelMouseLeave}
          >
            {/* Header bar */}
            <div className='hero-panel-bar flex items-center gap-2 mb-5'>
              <div className='w-2 h-2 rounded-full' style={{ background: 'var(--coral-red)', boxShadow: '0 0 6px var(--coral-red)' }} />
              <div className='w-2 h-2 rounded-full' style={{ background: 'var(--soft-gold)', boxShadow: '0 0 6px var(--soft-gold)' }} />
              <div className='w-2 h-2 rounded-full' style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
              <div className='flex-1 h-px mx-3' style={{ background: 'rgba(var(--accent-rgb),0.15)' }} />
              <span className='type-label' style={{ color: 'rgba(var(--accent-rgb),0.55)' }}>{content.panelStatus}</span>
            </div>

            {/* Interactive + animated hexagon */}
            <div className='flex justify-center mb-4'>
              <HexMenu
                hexWrapRef={hexWrapRef}
                outerRingRef={outerRingRef}
                middleRingRef={middleRingRef}
                centerGroupRef={centerGroupRef}
                hoveredZone={hoveredZone}
                activeZone={activeZone}
                onEnter={setHoveredZone}
                onLeave={() => setHoveredZone(null)}
                onClick={handleZoneClick}
              />
            </div>

            {/* Hover hint */}
            <div className='text-center mb-3' style={{ minHeight: '1rem' }}>
              {!activeZone && hoveredZone && (
                <p className='type-label' style={{ color: ZONES[hoveredZone].color, fontSize: '0.55rem', letterSpacing: '0.2em' }}>
                  {hoveredZone === 'outer' ? copy.hoverOuter : hoveredZone === 'middle' ? copy.hoverMiddle : copy.hoverCenter}
                </p>
              )}
              {!activeZone && !hoveredZone && (
                <p className='type-label' style={{ color: 'rgba(var(--accent-rgb),0.3)', fontSize: '0.55rem', letterSpacing: '0.2em' }}>
                  {copy.hoverIdle}
                </p>
              )}
            </div>

            {/* Lore selection panel */}
            <LorePanel
              content={content}
              copy={copy}
              panelIdleSubtitle={content.panelSubtitle}
              heroLoreGroups={heroLoreGroups}
              hoveredZone={hoveredZone}
              activeZone={activeZone}
              selectedLore={selectedLore}
              engageHref={engageHref}
              onZoneClick={handleZoneClick}
              onZoneHover={setHoveredZone}
              onZoneLeave={() => setHoveredZone(null)}
              onLoreSelect={handleLoreSelect}
              onBack={handleBack}
            />
          </div>
        </div>

      </div>

      {/* Bottom marquee — anchored to the section (not the parallaxed right column) so it never clips */}
      <div
        className='hidden lg:block absolute bottom-5 right-0 w-[47%] overflow-hidden z-20'
        style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.08)', paddingTop: '0.75rem' }}
      >
        <div
          className='animate-marquee whitespace-nowrap type-label'
          style={{ color: 'rgba(var(--accent-rgb),0.3)', letterSpacing: '0.3em' }}
        >
          {bottomStripText}
        </div>
      </div>

      {/* Mobile strip */}
      <div
        className='lg:hidden absolute bottom-0 left-0 right-0 h-2'
        style={{ background: 'linear-gradient(90deg, rgba(var(--accent-rgb),0), rgba(var(--accent-rgb),0.4), rgba(var(--accent-rgb),0))' }}
      />
    </section>
  );
}
