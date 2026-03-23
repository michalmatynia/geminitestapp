import type { SVGProps } from 'react';

import { cn } from '@/features/kangur/shared/utils';

import type { KangurMusicSynthWaveform } from './music-theory';

type KangurMusicWaveformIconProps = SVGProps<SVGSVGElement> & {
  waveform: KangurMusicSynthWaveform;
};

export function KangurMusicWaveformIcon({
  className,
  waveform,
  ...props
}: KangurMusicWaveformIconProps): React.JSX.Element {
  const sharedProps = {
    'aria-hidden': true,
    className: cn('h-4 w-7 shrink-0', className),
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 28 12',
    ...props,
  };

  switch (waveform) {
    case 'sine':
      return (
        <svg {...sharedProps}>
          <path d='M1 6C3.4 6 3.6 2 6 2S8.6 10 11 10 13.6 2 16 2s2.6 8 5 8 2.6-4 6-4' />
        </svg>
      );
    case 'triangle':
      return (
        <svg {...sharedProps}>
          <path d='M1 9 7.5 2 14 9 20.5 2 27 9' />
        </svg>
      );
    case 'sawtooth':
      return (
        <svg {...sharedProps}>
          <path d='M1 9 7 2V9L13 2V9L19 2V9L25 2V9' />
        </svg>
      );
    case 'square':
      return (
        <svg {...sharedProps}>
          <path d='M1 9V2H8V9H15V2H22V9H27' />
        </svg>
      );
  }
}
