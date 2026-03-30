import type { ReactNode } from 'react';

import { cn } from '@/features/kangur/utils/cn';

export type KangurWordmarkBaseProps = React.SVGProps<SVGSVGElement> & {
  idPrefix?: string;
  arcPath: string;
  wordTransform: string;
  children?: ReactNode;
  textLabel?: string;
  textProps?: React.SVGProps<SVGTextElement>;
};

export function KangurWordmarkBase({
  className,
  idPrefix = 'kangur-wordmark',
  arcPath,
  wordTransform,
  children,
  textLabel,
  textProps,
  ...props
}: KangurWordmarkBaseProps): React.JSX.Element {
  const iconId = idPrefix.replace(/[^a-zA-Z0-9_-]/g, '-');
  const wordGradId = `${iconId}-word-grad`;
  const shadowId = `${iconId}-shadow`;

  return (
    <svg
      aria-hidden='true'
      className={cn('h-auto w-full max-w-[272px] overflow-visible sm:max-w-[356px]', className)}
      fill='none'
      focusable='false'
      viewBox='0 0 560 164'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <defs>
        <linearGradient
          id={wordGradId}
          gradientUnits='userSpaceOnUse'
          x1='132'
          x2='502'
          y1='36'
          y2='136'
        >
          <stop offset='0' stopColor='var(--kangur-logo-word-start, #4457D7)' />
          <stop offset='0.55' stopColor='var(--kangur-logo-word-mid, #5566F2)' />
          <stop offset='1' stopColor='var(--kangur-logo-word-end, #7C52FF)' />
        </linearGradient>
        <filter height='180%' id={shadowId} width='120%' x='-10%' y='-30%'>
          <feDropShadow
            dx='0'
            dy='6'
            floodColor='var(--kangur-logo-shadow, #B4B7DA)'
            floodOpacity='0.20'
            stdDeviation='8'
          />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <path
          d={arcPath}
          opacity='0.14'
          stroke={`url(#${wordGradId})`}
          strokeLinecap='round'
          strokeWidth='10'
        />
        {textLabel ? (
          <text fill={`url(#${wordGradId})`} {...textProps}>
            {textLabel}
          </text>
        ) : (
          <g fill={`url(#${wordGradId})`} transform={wordTransform}>
            <g transform='scale(0.049 -0.051)'>
              <g>{children}</g>
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
