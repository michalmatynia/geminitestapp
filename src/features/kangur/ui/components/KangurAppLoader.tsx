'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';

type KangurAppLoaderProps = {
  visible: boolean;
};

export function KangurAppLoader({ visible }: KangurAppLoaderProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key='kangur-app-loader'
          aria-busy='true'
          aria-live='polite'
          className='fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(124,82,255,0.14),_transparent_34%),linear-gradient(180deg,_#f6f8ff_0%,_#edf2ff_52%,_#f9fbff_100%)]'
          data-testid='kangur-app-loader'
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
        >
          <div
            aria-hidden='true'
            className='absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(79,99,248,0.12)_0%,_rgba(124,82,255,0.05)_46%,_transparent_74%)] blur-3xl'
          />
          <motion.div
            className='relative flex flex-col items-center justify-center gap-3 rounded-[36px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,249,255,0.88)_100%)] px-9 py-8 shadow-[0_28px_72px_-38px_rgba(68,87,215,0.28)] backdrop-blur-xl'
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0.94, scale: 0.98 }}
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
          >
            <div
              aria-hidden='true'
              className='absolute inset-[10px] rounded-[28px] border border-[rgba(79,99,248,0.08)]'
            />
            <div
              aria-hidden='true'
              className='absolute -right-2 -top-2 h-12 w-12 rounded-full bg-[radial-gradient(circle,_rgba(255,213,96,0.82)_0%,_rgba(255,154,53,0.18)_54%,_transparent_76%)] blur-md'
            />
            <div className='relative flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(79,99,248,0.12)] bg-[radial-gradient(circle_at_32%_28%,_rgba(255,255,255,0.98),_rgba(241,245,255,0.9)_58%,_rgba(236,241,255,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_-22px_rgba(68,87,215,0.26)]'>
              <div
                aria-hidden='true'
                className='absolute inset-2 rounded-full border border-[rgba(124,82,255,0.1)]'
              />
              <KangurHomeLogo
                className='relative h-[28px] sm:h-[30px] md:h-[34px]'
                idPrefix='kangur-app-loader-logo'
              />
            </div>
            <div className='relative text-center'>
              <div className='text-[10px] font-semibold uppercase tracking-[0.32em] text-[#5a6df4]'>
                StudiQ
              </div>
              <div className='mt-1 text-xs font-medium tracking-[0.08em] text-slate-400'>
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
