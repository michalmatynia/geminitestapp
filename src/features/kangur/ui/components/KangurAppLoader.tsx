'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';

type KangurAppLoaderProps = {
  offsetTopBar?: boolean;
  visible: boolean;
  title?: string;
  status?: string;
  detail?: string;
  srLabel?: string;
};

const usePrefersReducedMotion = (): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };
    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
    };
  }, []);

  return matches;
};

export function KangurAppLoader({
  offsetTopBar = false,
  visible,
  title,
  status,
  detail,
  srLabel,
}: KangurAppLoaderProps): React.JSX.Element {
  const translations = useTranslations('KangurPublic');
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);
  const [colorPhase, setColorPhase] = useState<'mono' | 'paint' | 'color'>('mono');
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTitle = title?.trim() || 'StudiQ';
  const screenReaderLabel = srLabel?.trim() || translations('loaderSrLabel');
  const screenReaderStatus = status?.trim() || null;
  const screenReaderDetail = detail?.trim() || null;
  const combinedScreenReaderLabel = [
    screenReaderLabel,
    screenReaderStatus,
    screenReaderDetail,
  ]
    .filter((segment): segment is string => segment !== null && segment.length > 0)
    .join('. ');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Exit animation: when visible transitions from true to false, keep the
  // element rendered with opacity 0 for 200ms, then unmount.
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      setIsExiting(true);
      exitTimeoutRef.current = globalThis.setTimeout(() => {
        setIsExiting(false);
      }, prefersReducedMotion ? 0 : 120);
    }
    prevVisibleRef.current = visible;

    return () => {
      if (exitTimeoutRef.current !== null) {
        globalThis.clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [visible, prefersReducedMotion]);

  useEffect(() => {
    if (!visible) {
      setColorPhase('mono');
      return;
    }

    if (prefersReducedMotion) {
      setColorPhase('color');
      return;
    }

    let cancelled = false;
    let paintTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollIntervalId: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;
    const startTime =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const maxWaitMs = 60;
    const probeVars = [
      '--kangur-logo-accent-start',
      '--kangur-nav-item-active-text',
      '--kangur-page-background',
    ];

    const resolveTargets = (): HTMLElement[] => {
      if (typeof document === 'undefined') {
        return [];
      }
      const targets: HTMLElement[] = [];
      if (document.documentElement) targets.push(document.documentElement);
      if (document.body) targets.push(document.body);
      const appContent = document.getElementById('app-content');
      if (appContent instanceof HTMLElement) targets.push(appContent);
      return targets;
    };

    const hasThemeClass = (): boolean =>
      resolveTargets().some((t) => t.classList.contains('kangur-surface-active'));

    const hasThemeVars = (): boolean => {
      if (typeof window === 'undefined') return false;
      return resolveTargets().some((target) => {
        const styles = window.getComputedStyle(target);
        return probeVars.some((v) => styles.getPropertyValue(v).trim().length > 0);
      });
    };

    const onThemeReady = (): void => {
      if (cancelled) return;
      cancelled = true;
      if (maxWaitTimeoutId !== null) globalThis.clearTimeout(maxWaitTimeoutId);
      if (pollIntervalId !== null) safeClearInterval(pollIntervalId);
      if (observer) observer.disconnect();
      setColorPhase((prev) => (prev === 'color' ? prev : 'paint'));
      paintTimeoutId = globalThis.setTimeout(() => {
        setColorPhase('color');
      }, 80);
    };

    // Fast path: theme class or CSS vars already present
    if (hasThemeClass() || hasThemeVars()) {
      onThemeReady();
    } else {
      if (typeof MutationObserver !== 'undefined') {
        // Prefer event-driven observation and keep only a single timeout fallback.
        observer = new MutationObserver(() => {
          if (hasThemeClass()) onThemeReady();
        });
        for (const target of resolveTargets()) {
          observer.observe(target, { attributes: true, attributeFilter: ['class'] });
        }
        maxWaitTimeoutId = globalThis.setTimeout(() => {
          onThemeReady();
        }, maxWaitMs);
      } else {
        // Fallback: throttled poll for CSS variables when observers are unavailable.
        pollIntervalId = safeSetInterval(() => {
          const now =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();
          if (hasThemeClass() || hasThemeVars() || now - startTime >= maxWaitMs) {
            onThemeReady();
          }
        }, 200);
      }
    }

    return () => {
      cancelled = true;
      if (maxWaitTimeoutId !== null) globalThis.clearTimeout(maxWaitTimeoutId);
      if (pollIntervalId !== null) safeClearInterval(pollIntervalId);
      if (observer) observer.disconnect();
      if (paintTimeoutId !== null) globalThis.clearTimeout(paintTimeoutId);
    };
  }, [prefersReducedMotion, visible]);

  const allowIntroAnimation = hasMounted && !prefersReducedMotion;
  const loaderFilter = colorPhase === 'mono'
    ? 'grayscale(1) saturate(0.08) brightness(0.98) contrast(1.05)'
    : 'grayscale(0) saturate(1) brightness(1) contrast(1)';
  const loaderTransition = prefersReducedMotion
    ? undefined
    : 'filter 1200ms cubic-bezier(0.22, 1, 0.36, 1)';
  const filterLayerStyle = useMemo(
    () => ({
      background:
        'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
      filter: loaderFilter,
      transition: loaderTransition,
      ...(prefersReducedMotion ? {} : { willChange: 'filter' }),
    }),
    [loaderFilter, loaderTransition, prefersReducedMotion]
  );
  const paintOverlayStyle = useMemo(() => {
    if (prefersReducedMotion) {
      return { opacity: 0 };
    }

    const isPainting = colorPhase === 'paint';
    const translateX = isPainting ? 'translateX(0%)' : colorPhase === 'mono' ? 'translateX(-8%)' : 'translateX(8%)';

    return {
      background: [
        'linear-gradient(100deg, transparent 0%,',
        'color-mix(in srgb, var(--kangur-logo-accent-start, #FFD560) 55%, transparent) 28%,',
        'color-mix(in srgb, var(--kangur-accent-violet-start, #7c3aed) 40%, transparent) 46%,',
        'color-mix(in srgb, var(--kangur-accent-sky-start, #38bdf8) 35%, transparent) 58%,',
        'transparent 74%)',
        ', radial-gradient(120% 120% at 12% 24%,',
        'color-mix(in srgb, var(--kangur-logo-accent-end, #FF9A35) 42%, transparent) 0%,',
        'transparent 58%)',
        ', radial-gradient(120% 120% at 88% 18%,',
        'color-mix(in srgb, var(--kangur-accent-emerald-start, #10b981) 32%, transparent) 0%,',
        'transparent 62%)',
      ].join(' '),
      mixBlendMode: 'color',
      opacity: isPainting ? 0.45 : 0,
      transform: translateX,
      transition:
        'opacity 300ms ease, transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
    } as CSSProperties;
  }, [colorPhase, prefersReducedMotion]);

  const shouldRender = visible || isExiting;

  if (!shouldRender) {
    return <></>;
  }

  const outerStyle: CSSProperties = {
    isolation: 'isolate',
    opacity: isExiting ? 0 : 1,
    transition: prefersReducedMotion ? undefined : 'opacity 0.12s ease-out',
    ...(allowIntroAnimation && !isExiting ? {} : {}),
  };

  const panelStyle: CSSProperties = {
    background:
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-page-background, #f8fafc)) 100%)',
    borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
    boxShadow: 'var(--kangur-glass-panel-shadow, 0 32px 84px -42px rgba(68,87,215,0.28))',
    animation: prefersReducedMotion ? undefined : 'kangur-loader-pulse 1.8s ease-in-out infinite',
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: safeHtml('@keyframes kangur-loader-pulse { 0%, 100% { transform: scale(0.985); } 50% { transform: scale(1); } }') }} />
      <div
        aria-busy='true'
        aria-live='polite'
        aria-atomic='true'
        role='status'
        className={offsetTopBar
          ? 'pointer-events-none fixed inset-x-0 bottom-0 top-[var(--kangur-top-bar-height,88px)] z-[90] flex items-center justify-center overflow-hidden px-4'
          : 'pointer-events-none fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4'}
        data-testid='kangur-app-loader'
        data-loader-offset-top-bar={offsetTopBar ? 'true' : 'false'}
        style={outerStyle}
      >
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 z-20'
          style={paintOverlayStyle}
        />
        <div className='absolute inset-0 z-10 flex items-center justify-center' style={filterLayerStyle}>
          <div className='relative flex h-full w-full items-center justify-center'>
            <div
              aria-hidden='true'
              className='absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-[360px] sm:w-[360px]'
              style={{
                background:
                  'radial-gradient(circle, color-mix(in srgb, var(--kangur-soft-card-border, #cbd5e1) 34%, transparent) 0%, transparent 74%)',
              }}
            />
            <div
              className='relative flex w-full max-w-[360px] flex-col items-center justify-center kangur-panel-gap rounded-[40px] border px-6 py-8 backdrop-blur-xl sm:max-w-[420px] sm:px-12 sm:py-11'
              data-loader-layout='expanded-card'
              data-testid='kangur-app-loader-panel'
              style={panelStyle}
            >
              <div
                aria-hidden='true'
                className='absolute inset-[10px] rounded-[30px] border'
                style={{ borderColor: 'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 56%, transparent)' }}
              />
              <div
                aria-hidden='true'
                className='absolute -right-2 -top-2 h-14 w-14 rounded-full blur-md'
                style={{
                  background:
                    'radial-gradient(circle, color-mix(in srgb, var(--kangur-logo-accent-start, #FFD560) 82%, transparent) 0%, color-mix(in srgb, var(--kangur-logo-accent-end, #FF9A35) 22%, transparent) 54%, transparent 76%)',
                }}
              />
              <div
                className='relative flex h-24 w-24 items-center justify-center rounded-full border'
                style={{
                  background:
                    'radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 96%, white), color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, var(--kangur-page-background, #eef2ff)) 58%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 80%, var(--kangur-page-background, #e2e8f0)) 100%)',
                  borderColor: 'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 58%, transparent)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.72), 0 18px 32px -24px rgba(68,87,215,0.26)',
                }}
              >
                <div
                  aria-hidden='true'
                  className='absolute inset-2.5 rounded-full border'
                  style={{ borderColor: 'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 48%, transparent)' }}
                />
                <KangurHomeLogo
                  className='relative h-[32px] sm:h-[34px] md:h-[38px]'
                  idPrefix='kangur-app-loader-logo'
                />
              </div>
              <div
                className='relative text-center'
                data-testid='kangur-app-loader-copy'
              >
                <div className='text-[11px] font-semibold uppercase tracking-[0.32em] [color:var(--kangur-nav-item-active-text)]'>
                  {copyTitle}
                </div>
              </div>
            </div>
          </div>
        </div>
        <span className='sr-only'>{combinedScreenReaderLabel}</span>
      </div>
    </>
  );
}
