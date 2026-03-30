'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
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

const KANGUR_APP_LOADER_THEME_PROBE_VARS = [
  '--kangur-logo-accent-start',
  '--kangur-nav-item-active-text',
  '--kangur-page-background',
];

const KANGUR_APP_LOADER_PULSE_KEYFRAMES = safeHtml(
  '@keyframes kangur-loader-pulse { 0%, 100% { transform: scale(0.985); } 50% { transform: scale(1); } }'
);

const resolveKangurAppLoaderSegment = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const resolveKangurAppLoaderCopyTitle = (title?: string): string =>
  resolveKangurAppLoaderSegment(title) ?? 'StudiQ';

const resolveKangurAppLoaderCombinedScreenReaderLabel = ({
  detail,
  srLabel,
  status,
  translations,
}: {
  detail?: string;
  srLabel?: string;
  status?: string;
  translations: ReturnType<typeof useTranslations>;
}): string =>
  [
    resolveKangurAppLoaderSegment(srLabel) ?? translations('loaderSrLabel'),
    resolveKangurAppLoaderSegment(status),
    resolveKangurAppLoaderSegment(detail),
  ]
    .filter((segment): segment is string => segment !== null)
    .join('. ');

const resolveKangurAppLoaderNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const resolveKangurAppLoaderTargets = (): HTMLElement[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const targets: HTMLElement[] = [];
  if (document.documentElement) {
    targets.push(document.documentElement);
  }
  if (document.body) {
    targets.push(document.body);
  }
  const appContent = document.getElementById('app-content');
  if (appContent instanceof HTMLElement) {
    targets.push(appContent);
  }
  return targets;
};

const hasKangurAppLoaderThemeClass = (): boolean =>
  resolveKangurAppLoaderTargets().some((target) =>
    target.classList.contains('kangur-surface-active')
  );

const hasKangurAppLoaderThemeVars = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return resolveKangurAppLoaderTargets().some((target) => {
    const styles = window.getComputedStyle(target);
    return KANGUR_APP_LOADER_THEME_PROBE_VARS.some(
      (variableName) => styles.getPropertyValue(variableName).trim().length > 0
    );
  });
};

const isKangurAppLoaderThemeReady = (): boolean =>
  hasKangurAppLoaderThemeClass() || hasKangurAppLoaderThemeVars();

const resolveKangurAppLoaderFilter = (
  colorPhase: 'mono' | 'paint' | 'color'
): string =>
  colorPhase === 'mono'
    ? 'grayscale(1) saturate(0.08) brightness(0.98) contrast(1.05)'
    : 'grayscale(0) saturate(1) brightness(1) contrast(1)';

const resolveKangurAppLoaderFilterTransition = (
  prefersReducedMotion: boolean
): string | undefined =>
  prefersReducedMotion ? undefined : 'filter 1200ms cubic-bezier(0.22, 1, 0.36, 1)';

const resolveKangurAppLoaderFilterLayerStyle = ({
  colorPhase,
  prefersReducedMotion,
}: {
  colorPhase: 'mono' | 'paint' | 'color';
  prefersReducedMotion: boolean;
}): CSSProperties => ({
  background:
    'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
  filter: resolveKangurAppLoaderFilter(colorPhase),
  transition: resolveKangurAppLoaderFilterTransition(prefersReducedMotion),
  ...(prefersReducedMotion ? {} : { willChange: 'filter' }),
});

const resolveKangurAppLoaderPaintOverlayStyle = ({
  colorPhase,
  prefersReducedMotion,
}: {
  colorPhase: 'mono' | 'paint' | 'color';
  prefersReducedMotion: boolean;
}): CSSProperties => {
  if (prefersReducedMotion) {
    return { opacity: 0 };
  }

  const isPainting = colorPhase === 'paint';
  const translateX =
    colorPhase === 'mono'
      ? 'translateX(-8%)'
      : isPainting
        ? 'translateX(0%)'
        : 'translateX(8%)';

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
    transition: 'opacity 300ms ease, transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
  };
};

const resolveKangurAppLoaderOuterStyle = ({
  isExiting,
  prefersReducedMotion,
}: {
  isExiting: boolean;
  prefersReducedMotion: boolean;
}): CSSProperties => ({
  isolation: 'isolate',
  opacity: isExiting ? 0 : 1,
  transition: prefersReducedMotion ? undefined : 'opacity 0.12s ease-out',
});

const resolveKangurAppLoaderPanelStyle = (
  prefersReducedMotion: boolean
): CSSProperties => ({
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-page-background, #f8fafc)) 100%)',
  borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
  boxShadow: 'var(--kangur-glass-panel-shadow, 0 32px 84px -42px rgba(68,87,215,0.28))',
  animation: prefersReducedMotion ? undefined : 'kangur-loader-pulse 1.8s ease-in-out infinite',
});

const resolveKangurAppLoaderClassName = (offsetTopBar: boolean): string =>
  offsetTopBar
    ? 'pointer-events-none fixed inset-x-0 bottom-0 top-[var(--kangur-top-bar-height,88px)] z-[90] flex items-center justify-center overflow-hidden px-4'
    : 'pointer-events-none fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4';

const useKangurAppLoaderExitState = ({
  prefersReducedMotion,
  visible,
}: {
  prefersReducedMotion: boolean;
  visible: boolean;
}): boolean => {
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  return isExiting;
};

const setupKangurAppLoaderThemeTransition = ({
  setColorPhase,
}: {
  setColorPhase: React.Dispatch<React.SetStateAction<'mono' | 'paint' | 'color'>>;
}): (() => void) => {
  let cancelled = false;
  let paintTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let pollIntervalId: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;
  const startTime = resolveKangurAppLoaderNow();
  const maxWaitMs = 60;

  const clearThemeTransition = (): void => {
    if (maxWaitTimeoutId !== null) {
      globalThis.clearTimeout(maxWaitTimeoutId);
    }
    if (pollIntervalId !== null) {
      safeClearInterval(pollIntervalId);
    }
    if (paintTimeoutId !== null) {
      globalThis.clearTimeout(paintTimeoutId);
    }
    observer?.disconnect();
  };

  const onThemeReady = (): void => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    if (maxWaitTimeoutId !== null) {
      globalThis.clearTimeout(maxWaitTimeoutId);
    }
    if (pollIntervalId !== null) {
      safeClearInterval(pollIntervalId);
    }
    observer?.disconnect();
    setColorPhase((previous) => (previous === 'color' ? previous : 'paint'));
    paintTimeoutId = globalThis.setTimeout(() => {
      setColorPhase('color');
    }, 80);
  };

  if (isKangurAppLoaderThemeReady()) {
    onThemeReady();
    return () => {
      cancelled = true;
      clearThemeTransition();
    };
  }

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      if (hasKangurAppLoaderThemeClass()) {
        onThemeReady();
      }
    });
    for (const target of resolveKangurAppLoaderTargets()) {
      observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    }
    maxWaitTimeoutId = globalThis.setTimeout(() => {
      onThemeReady();
    }, maxWaitMs);
  } else {
    pollIntervalId = safeSetInterval(() => {
      if (
        isKangurAppLoaderThemeReady() ||
        resolveKangurAppLoaderNow() - startTime >= maxWaitMs
      ) {
        onThemeReady();
      }
    }, 200);
  }

  return () => {
    cancelled = true;
    clearThemeTransition();
  };
};

const useKangurAppLoaderColorPhase = ({
  prefersReducedMotion,
  visible,
}: {
  prefersReducedMotion: boolean;
  visible: boolean;
}): 'mono' | 'paint' | 'color' => {
  const [colorPhase, setColorPhase] = useState<'mono' | 'paint' | 'color'>('mono');

  useEffect(() => {
    if (!visible) {
      setColorPhase('mono');
      return;
    }

    if (prefersReducedMotion) {
      setColorPhase('color');
      return;
    }

    return setupKangurAppLoaderThemeTransition({ setColorPhase });
  }, [prefersReducedMotion, visible]);

  return colorPhase;
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
  const colorPhase = useKangurAppLoaderColorPhase({ prefersReducedMotion, visible });
  const isExiting = useKangurAppLoaderExitState({ prefersReducedMotion, visible });
  const copyTitle = resolveKangurAppLoaderCopyTitle(title);
  const combinedScreenReaderLabel = resolveKangurAppLoaderCombinedScreenReaderLabel({
    detail,
    srLabel,
    status,
    translations,
  });
  const shouldRender = visible || isExiting;

  if (!shouldRender) {
    return <></>;
  }

  const filterLayerStyle = resolveKangurAppLoaderFilterLayerStyle({
    colorPhase,
    prefersReducedMotion,
  });
  const paintOverlayStyle = resolveKangurAppLoaderPaintOverlayStyle({
    colorPhase,
    prefersReducedMotion,
  });
  const outerStyle = resolveKangurAppLoaderOuterStyle({ isExiting, prefersReducedMotion });
  const panelStyle = resolveKangurAppLoaderPanelStyle(prefersReducedMotion);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KANGUR_APP_LOADER_PULSE_KEYFRAMES }} />
      <div
        aria-busy='true'
        aria-live='polite'
        aria-atomic='true'
        role='status'
        className={resolveKangurAppLoaderClassName(offsetTopBar)}
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
