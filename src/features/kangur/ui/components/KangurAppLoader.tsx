import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';

type KangurAppLoaderProps = {
  visible: boolean;
};

export function KangurAppLoader({ visible }: KangurAppLoaderProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const allowIntroAnimation = hasMounted && !prefersReducedMotion;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key='kangur-app-loader'
          aria-busy='true'
          aria-live='polite'
          aria-atomic='true'
          role='status'
          className='fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4'
          data-testid='kangur-app-loader'
          initial={allowIntroAnimation ? { opacity: 0 } : { opacity: 1 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          style={{
            background:
              'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
          }}
        >
          <div
            aria-hidden='true'
            className='absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl'
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--kangur-soft-card-border, #cbd5e1) 34%, transparent) 0%, transparent 74%)',
            }}
          />
          <motion.div
            className='relative flex flex-col items-center justify-center gap-4 rounded-[40px] border px-12 py-11 backdrop-blur-xl'
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
                StudiQ
              </div>
              <div className='mt-1 text-sm font-medium tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                Loading
              </div>
            </div>
          </motion.div>
          <span className='sr-only'>Ladowanie aplikacji StudiQ</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
