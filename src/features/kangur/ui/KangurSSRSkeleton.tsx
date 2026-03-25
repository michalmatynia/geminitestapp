/**
 * Pure HTML/CSS loading skeleton for Kangur routes, rendered server-side.
 *
 * This component provides instant visual feedback (FCP) while the client-side
 * JS chunks download. It matches the KangurAppLoader appearance using only
 * CSS animations — no JavaScript or framer-motion required.
 *
 * Once KangurFeatureApp mounts on the client, it replaces this skeleton
 * entirely via the FrontendPublicOwnerShellClient component tree.
 */
import type { JSX } from 'react';

export function KangurSSRSkeleton(): JSX.Element {
  return (
    <div
      aria-busy='true'
      aria-live='polite'
      aria-atomic='true'
      className='fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4'
      data-testid='kangur-ssr-skeleton'
      role='status'
      style={{ isolation: 'isolate' }}
    >
      {/* Background layer — uses CSS variable with safe fallback */}
      <div
        aria-hidden='true'
        className='absolute inset-0 z-10 flex items-center justify-center'
        style={{
          background:
            'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
        }}
      >
        <div className='relative flex h-full w-full items-center justify-center'>
          {/* Glow ring */}
          <div
            aria-hidden='true'
            className='absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-[360px] sm:w-[360px]'
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--kangur-soft-card-border, #cbd5e1) 34%, transparent) 0%, transparent 74%)',
            }}
          />

          {/* Card — CSS pulse animation instead of framer-motion */}
          <div
            className='kangur-ssr-skeleton-card relative flex w-full max-w-[360px] flex-col items-center justify-center gap-6 rounded-[40px] border px-6 py-8 backdrop-blur-xl sm:max-w-[420px] sm:px-12 sm:py-11'
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-page-background, #f8fafc)) 100%)',
              borderColor:
                'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
              boxShadow:
                'var(--kangur-glass-panel-shadow, 0 32px 84px -42px rgba(68,87,215,0.28))',
            }}
          >
            {/* Inner border ring */}
            <div
              aria-hidden='true'
              className='absolute inset-[10px] rounded-[30px] border'
              style={{
                borderColor:
                  'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 56%, transparent)',
              }}
            />
            {/* Decorative corner glow */}
            <div
              aria-hidden='true'
              className='absolute -right-2 -top-2 h-14 w-14 rounded-full blur-md'
              style={{
                background:
                  'radial-gradient(circle, color-mix(in srgb, var(--kangur-logo-accent-start, #FFD560) 82%, transparent) 0%, color-mix(in srgb, var(--kangur-logo-accent-end, #FF9A35) 22%, transparent) 54%, transparent 76%)',
              }}
            />

            {/* Logo placeholder circle */}
            <div
              className='relative flex h-24 w-24 items-center justify-center rounded-full border'
              style={{
                background:
                  'radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 96%, white), color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, var(--kangur-page-background, #eef2ff)) 58%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 80%, var(--kangur-page-background, #e2e8f0)) 100%)',
                borderColor:
                  'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 58%, transparent)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.72), 0 18px 32px -24px rgba(68,87,215,0.26)',
              }}
            >
              <div
                aria-hidden='true'
                className='absolute inset-2.5 rounded-full border'
                style={{
                  borderColor:
                    'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 48%, transparent)',
                }}
              />
              {/* Shimmer placeholder for logo */}
              <div className='kangur-ssr-skeleton-shimmer h-[34px] w-[34px] rounded-full' />
            </div>

            {/* Text placeholders */}
            <div className='relative text-center'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.32em]' style={{ color: 'var(--kangur-nav-item-active-text, #334155)' }}>
                StudiQ
              </div>
              <div className='kangur-ssr-skeleton-shimmer mt-2 mx-auto h-3 w-24 rounded-full' />
            </div>
          </div>
        </div>
      </div>

      {/* CSS-only animations — no JS needed */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes kangur-ssr-pulse {
  0%, 100% { transform: scale(0.985); }
  50% { transform: scale(1); }
}
@keyframes kangur-ssr-shimmer {
  0% { opacity: 0.4; }
  50% { opacity: 0.7; }
  100% { opacity: 0.4; }
}
.kangur-ssr-skeleton-card {
  animation: kangur-ssr-pulse 1.8s ease-in-out infinite;
}
.kangur-ssr-skeleton-shimmer {
  background: color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 60%, transparent);
  animation: kangur-ssr-shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .kangur-ssr-skeleton-card { animation: none; }
  .kangur-ssr-skeleton-shimmer { animation: none; opacity: 0.5; }
}`,
        }}
      />
      <span className='sr-only'>Loading application...</span>
    </div>
  );
}
