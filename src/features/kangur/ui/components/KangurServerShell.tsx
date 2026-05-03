import { safeHtml } from '@/shared/lib/security/safe-html';

/**
 * Static server-rendered loading shell that matches the visual appearance of
 * `KangurAppLoader`. Provides an instant first paint while client JS downloads
 * and hydrates. The client's `KangurFeatureRouteShell` removes this element
 * once it mounts.
 */
export function KangurServerShell(): React.JSX.Element {
  return (
    <div
      aria-busy='true'
      aria-live='polite'
      aria-atomic='true'
      role='status'
      className='pointer-events-none fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4'
      data-kangur-server-shell=''
      style={{
        background:
          'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
      }}
    >
      <div className='absolute inset-0 z-10 flex items-center justify-center'>
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
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-page-background, #f8fafc)) 100%)',
              borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
              boxShadow:
                'var(--kangur-glass-panel-shadow, 0 32px 84px -42px rgba(68,87,215,0.28))',
              animation: 'kangur-loader-pulse 1.8s ease-in-out infinite',
            }}
          >
            <style
              dangerouslySetInnerHTML={{
                __html: safeHtml(
                  '@keyframes kangur-loader-pulse { 0%, 100% { transform: scale(0.985); } 50% { transform: scale(1); } } @keyframes kangur-loader-spin { to { transform: rotate(360deg); } }'
                ),
              }}
            />
            <div
              aria-hidden='true'
              className='absolute inset-[10px] rounded-[30px] border'
              style={{
                borderColor:
                  'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 56%, transparent)',
              }}
            />
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
              <div
                aria-hidden='true'
                className='relative h-10 w-10 rounded-full'
                style={{
                  border: '3px solid color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 48%, transparent)',
                  borderTopColor: 'var(--kangur-nav-item-active-text, #4457D7)',
                  animation: 'kangur-loader-spin 0.9s linear infinite',
                }}
              />
            </div>
            <div className='relative text-center'>
              <div
                className='text-[11px] font-semibold uppercase tracking-[0.32em]'
                style={{ color: 'var(--kangur-nav-item-active-text, #4457D7)' }}
              >
                StudiQ
              </div>
              <div
                className='mt-1 text-sm font-medium tracking-[0.08em]'
                style={{ color: 'var(--kangur-page-muted-text, #94a3b8)' }}
              >
                Loading&hellip;
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className='sr-only'>Loading StudiQ</span>
    </div>
  );
}
