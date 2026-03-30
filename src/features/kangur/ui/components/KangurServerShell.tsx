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
                  '@keyframes kangur-loader-pulse { 0%, 100% { transform: scale(0.985); } 50% { transform: scale(1); } }'
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
              {/* Inline StudiQ logo SVG — avoids importing client module */}
              <svg
                aria-hidden='true'
                className='relative h-[32px] w-auto overflow-visible sm:h-[34px] md:h-[38px]'
                fill='none'
                focusable='false'
                viewBox='20 24 710 182'
                xmlns='http://www.w3.org/2000/svg'
              >
                <defs>
                  <linearGradient id='ssr-word' gradientUnits='userSpaceOnUse' x1='36' x2='550' y1='52' y2='200'>
                    <stop offset='0' stopColor='#4457D7' />
                    <stop offset='0.55' stopColor='#5566F2' />
                    <stop offset='1' stopColor='#7C52FF' />
                  </linearGradient>
                  <linearGradient id='ssr-ring' gradientUnits='userSpaceOnUse' x1='586' x2='710' y1='58' y2='182'>
                    <stop offset='0' stopColor='#4F63F8' />
                    <stop offset='1' stopColor='#8A5DFF' />
                  </linearGradient>
                  <linearGradient id='ssr-amber' gradientUnits='userSpaceOnUse' x1='652' x2='704' y1='78' y2='142'>
                    <stop offset='0' stopColor='#FFD560' />
                    <stop offset='1' stopColor='#FF9A35' />
                  </linearGradient>
                  <linearGradient id='ssr-inner' gradientUnits='userSpaceOnUse' x1='624' x2='670' y1='96' y2='142'>
                    <stop offset='0' stopColor='#FFFFFF' />
                    <stop offset='1' stopColor='#E6EEFF' />
                  </linearGradient>
                </defs>
                <g>
                  <path
                    d='M85.82,198.42 Q71.38,198.42 58.66,193.98 Q45.94,189.51 38.75,182.29 Q36.00,179.54 36.00,175.73 Q36.00,170.63 40.24,167.45 Q44.25,164.50 47.66,164.50 Q51.90,164.50 55.71,168.31 Q59.72,172.75 67.77,176.06 Q75.85,179.34 84.96,179.34 Q97.05,179.34 103.71,175.30 Q110.40,171.26 110.40,164.50 Q110.40,157.91 103.81,153.57 Q97.25,149.23 81.58,146.25 Q40.87,138.40 40.87,112.76 Q40.87,102.36 47.00,95.17 Q53.16,87.95 63.13,84.37 Q73.10,80.76 84.33,80.76 Q98.11,80.76 109.01,85.20 Q119.94,89.64 126.30,97.49 Q129.05,100.90 129.05,104.28 Q129.05,107.89 125.44,110.84 Q123.12,112.56 119.51,112.56 Q114.01,112.56 109.54,108.52 Q104.24,103.65 98.31,101.63 Q92.38,99.61 83.90,99.61 Q74.16,99.61 67.90,102.92 Q61.64,106.20 61.64,112.13 Q61.64,116.37 63.76,119.25 Q65.88,122.10 71.81,124.55 Q77.74,126.97 89.00,129.29 Q112.09,133.96 121.73,142.24 Q131.40,150.49 131.40,163.64 Q131.40,173.38 126.10,181.33 Q120.80,189.28 110.50,193.85 Q100.23,198.42 85.82,198.42 Z M208.12,176.36 Q211.93,176.36 214.58,179.34 Q217.23,182.29 217.23,186.96 Q217.23,191.63 213.72,194.61 Q210.24,197.56 204.75,197.56 L200.94,197.56 Q190.53,197.56 181.96,192.16 Q173.38,186.76 168.47,177.42 Q163.60,168.08 163.60,156.42 L163.60,104.08 L153.87,104.08 Q149.39,104.08 146.64,101.53 Q143.89,98.98 143.89,95.17 Q143.89,90.93 146.64,88.38 Q149.39,85.83 153.87,85.83 L163.60,85.83 L163.60,55.32 Q163.60,50.65 166.55,47.70 Q169.53,44.72 174.20,44.72 Q178.87,44.72 181.82,47.70 Q184.80,50.65 184.80,55.32 L184.80,85.83 L202.82,85.83 Q207.30,85.83 210.05,88.38 Q212.79,90.93 212.79,95.17 Q212.79,98.98 210.05,101.53 Q207.30,104.08 202.82,104.08 L184.80,104.08 L184.80,156.42 Q184.80,164.90 189.47,170.63 Q194.15,176.36 200.94,176.36 L208.12,176.36 Z M339.35,81.39 Q344.25,81.39 347.20,84.37 Q350.18,87.32 350.18,92.19 L350.18,186.76 Q350.18,191.40 347.20,194.48 Q344.25,197.56 339.35,197.56 Q334.71,197.56 331.63,194.48 Q328.55,191.40 328.55,186.76 L328.55,184.41 Q321.76,191.20 312.41,194.91 Q303.11,198.62 292.51,198.62 Q277.87,198.62 266.21,192.26 Q254.55,185.90 247.99,173.71 Q241.43,161.52 241.43,144.36 L241.43,92.19 Q241.43,87.52 244.48,84.47 Q247.56,81.39 252.23,81.39 Q256.90,81.39 259.94,84.47 Q263.03,87.52 263.03,92.19 L263.03,144.36 Q263.03,161.52 272.23,170.33 Q281.48,179.11 296.75,179.11 Q305.66,179.11 312.94,175.53 Q320.27,171.92 324.41,165.76 Q328.55,159.60 328.55,151.98 L328.55,92.19 Q328.55,87.32 331.63,84.37 Q334.71,81.39 339.35,81.39 Z M488.40,32.00 Q493.27,32.00 496.22,34.98 Q499.20,37.93 499.20,42.80 L499.20,139.46 Q499.20,156.02 491.45,169.47 Q483.73,182.92 470.48,190.67 Q457.23,198.42 440.90,198.42 Q424.57,198.42 411.12,190.67 Q397.67,182.92 390.02,169.47 Q382.40,156.02 382.40,139.46 Q382.40,122.93 389.49,109.48 Q396.61,96.00 409.00,88.38 Q421.39,80.76 436.66,80.76 Q448.95,80.76 459.55,85.86 Q470.15,90.93 477.57,100.04 L477.57,42.80 Q477.57,37.93 480.65,34.98 Q483.73,32.00 488.40,32.00 Z M440.90,179.34 Q451.50,179.34 460.08,174.14 Q468.69,168.94 473.56,159.83 Q478.43,150.72 478.43,139.46 Q478.43,128.23 473.56,119.22 Q468.69,110.21 460.08,105.04 Q451.50,99.84 440.90,99.84 Q430.30,99.84 421.72,105.04 Q413.14,110.21 408.14,119.22 Q403.17,128.23 403.17,139.46 Q403.17,150.72 408.14,159.83 Q413.14,168.94 421.72,174.14 Q430.30,179.34 440.90,179.34 Z M550.29,197.56 Q545.65,197.56 542.57,194.48 Q539.49,191.40 539.49,186.76 L539.49,92.42 Q539.49,87.52 542.57,84.57 Q545.65,81.59 550.29,81.59 Q555.19,81.59 558.14,84.57 Q561.12,87.52 561.12,92.42 L561.12,186.76 Q561.12,191.40 558.14,194.48 Q555.19,197.56 550.29,197.56 Z M550.29,62.74 Q544.59,62.74 540.45,58.60 Q536.31,54.46 536.31,48.73 Q536.31,43.00 540.45,38.89 Q544.59,34.75 550.29,34.75 Q556.02,34.75 560.16,38.89 Q564.30,43.00 564.30,48.73 Q564.30,54.46 560.16,58.60 Q556.02,62.74 550.29,62.74 Z'
                    fill='url(#ssr-word)'
                  />
                  <circle cx='648' cy='116' fill='url(#ssr-ring)' r='64' />
                  <circle cx='648' cy='116' fill='url(#ssr-inner)' r='38' />
                  <path d='M690,160 l26,24' stroke='url(#ssr-ring)' strokeLinecap='round' strokeWidth='16' />
                  <path d='M700.85,94.65 A57,57 0 0 1 669.35,168.85' stroke='url(#ssr-amber)' strokeLinecap='round' strokeWidth='14' />
                  <circle cx='696' cy='74' fill='url(#ssr-amber)' r='11' />
                  <circle cx='696' cy='74' fill='#FFF6C6' r='4.5' />
                </g>
              </svg>
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
