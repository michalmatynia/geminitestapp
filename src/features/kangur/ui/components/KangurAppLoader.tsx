'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';

type KangurAppLoaderProps = {
  offsetTopBar?: boolean;
  visible: boolean;
  title?: string;
  status?: string;
  detail?: string;
  srLabel?: string;
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
  const prefersReducedMotion = useReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);
  const [colorPhase, setColorPhase] = useState<'mono' | 'paint' | 'color'>('mono');
  const copyTitle = title?.trim() || 'StudiQ';
  const copyStatus = status?.trim() || translations('loaderStatus');
  const copyDetail = detail?.trim() || null;
  const screenReaderLabel = srLabel?.trim() || translations('loaderSrLabel');

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
    type FrameHandle = number | ReturnType<typeof setTimeout>;
    let frameId: FrameHandle | null = null;
    let paintTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const startTime =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const maxWaitMs = 1200;
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

    const hasThemeVars = (target: HTMLElement): boolean => {
      if (typeof window === 'undefined') {
        return false;
      }
      const styles = window.getComputedStyle(target);
      return probeVars.some((variable) => styles.getPropertyValue(variable).trim().length > 0);
    };

    const isThemeReady = (): boolean => {
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return true;
      }
      return resolveTargets().some((target) => {
        if (target.classList.contains('kangur-surface-active')) {
          return true;
        }
        return hasThemeVars(target);
      });
    };

    const scheduleFrame = (callback: FrameRequestCallback): FrameHandle => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(callback);
      }
      return globalThis.setTimeout(() => callback(0), 16);
    };

    const cancelFrame = (id: FrameHandle): void => {
      if (
        typeof window !== 'undefined'
        && typeof window.cancelAnimationFrame === 'function'
        && typeof id === 'number'
      ) {
        window.cancelAnimationFrame(id);
        return;
      }
      globalThis.clearTimeout(id);
    };

    const check = (): void => {
      if (cancelled) {
        return;
      }
      const now =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      if (isThemeReady() || now - startTime >= maxWaitMs) {
        setColorPhase((prev) => (prev === 'color' ? prev : 'paint'));
        if (paintTimeoutId !== null) {
          globalThis.clearTimeout(paintTimeoutId);
        }
        paintTimeoutId = globalThis.setTimeout(() => {
          if (!cancelled) {
            setColorPhase('color');
          }
        }, 900);
        return;
      }
      frameId = scheduleFrame(() => check());
    };

    frameId = scheduleFrame(() => check());

    return () => {
      cancelled = true;
      if (frameId !== null) {
        cancelFrame(frameId);
      }
      if (paintTimeoutId !== null) {
        globalThis.clearTimeout(paintTimeoutId);
      }
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
        'opacity 700ms ease, transform 1200ms cubic-bezier(0.22, 1, 0.36, 1)',
    } as CSSProperties;
  }, [colorPhase, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key='kangur-app-loader'
          aria-busy='true'
          aria-live='polite'
          aria-atomic='true'
          role='status'
          className={offsetTopBar
            ? 'pointer-events-none fixed inset-x-0 bottom-0 top-[var(--kangur-top-bar-height,88px)] z-[90] flex items-center justify-center overflow-hidden px-4'
            : 'pointer-events-none fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4'}
          data-testid='kangur-app-loader'
          data-loader-offset-top-bar={offsetTopBar ? 'true' : 'false'}
          initial={allowIntroAnimation ? { opacity: 0 } : { opacity: 1 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          style={{ isolation: 'isolate' }}
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
              <motion.div
                className='relative flex w-full max-w-[360px] flex-col items-center justify-center kangur-panel-gap rounded-[40px] border px-6 py-8 backdrop-blur-xl sm:max-w-[420px] sm:px-12 sm:py-11'
                data-loader-layout='expanded-card'
                data-testid='kangur-app-loader-panel'
                initial={
                  allowIntroAnimation
                    ? { opacity: 0.94, scale: 0.98 }
                    : { opacity: 1, scale: 1 }
                }
                animate={
                  prefersReducedMotion
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 1, scale: [0.985, 1, 0.985] }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                      duration: 1.8,
                      ease: 'easeInOut',
                      repeat: Number.POSITIVE_INFINITY,
                    }
                }
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-page-background, #f8fafc)) 100%)',
                  borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
                  boxShadow: 'var(--kangur-glass-panel-shadow, 0 32px 84px -42px rgba(68,87,215,0.28))',
                }}
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
                  <div className='mt-1 text-sm font-medium tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                    {copyStatus}
                  </div>
                  {copyDetail ? (
                    <div className='mt-2 text-xs font-medium [color:var(--kangur-page-muted-text)]'>
                      {copyDetail}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </div>
          <span className='sr-only'>{screenReaderLabel}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
