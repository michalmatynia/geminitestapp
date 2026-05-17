'use client';

import React from 'react';

/**
 * Renders the StuqiQ Beta badge as an SVG element.
 * 
 * @param props - Component properties
 * @param props.testId - Test identifier for the badge
 */
export function KangurHomeBetaBadge({
  testId = 'kangur-home-beta-badge',
}: {
  testId?: string;
} = {}): React.JSX.Element {
  return (
    <svg
      aria-hidden='true'
      className='mt-0.5 h-[12px] w-auto overflow-visible sm:h-[13px]'
      data-testid={testId}
      fill='none'
      viewBox='0 0 62 18'
      xmlns='http://www.w3.org/2000/svg'
    >
      <title>StuqiQ Beta badge</title>
      <rect
        fill='color-mix(in srgb, var(--kangur-accent, #5566f2) 10%, white)'
        height='17'
        rx='8.5'
        stroke='color-mix(in srgb, var(--kangur-accent, #5566f2) 36%, white)'
        strokeWidth='1'
        width='61'
        x='0.5'
        y='0.5'
      />
      <text
        fill='color-mix(in srgb, var(--kangur-accent, #5566f2) 68%, #1e293b)'
        fontFamily='ui-sans-serif, system-ui, sans-serif'
        fontSize='8'
        fontWeight='800'
        letterSpacing='0.18em'
        textAnchor='middle'
        x='31'
        y='11.2'
      >
        BETA
      </text>
    </svg>
  );
}

export function KangurHomeFallbackThemeBadge(): React.JSX.Element {
  return (
    <span
      aria-label='Fallback theme'
      className='mt-0.5 inline-flex h-[13px] items-center rounded-full border px-1.5 text-[7px] font-extrabold leading-none tracking-[0.12em] sm:h-[14px] sm:text-[8px]'
      data-testid='kangur-home-fallback-badge'
      style={{
        background:
          'color-mix(in srgb, var(--kangur-error, #f06f7b) 10%, white)',
        borderColor:
          'color-mix(in srgb, var(--kangur-error, #f06f7b) 34%, white)',
        color:
          'color-mix(in srgb, var(--kangur-error, #f06f7b) 72%, #1e293b)',
      }}
    >
      fallback
    </span>
  );
}
