import type { ReactNode } from 'react';

import { cn } from '@/features/kangur/shared/utils';

type KangurVisualCueContentProps = {
  detail?: ReactNode;
  detailClassName?: string;
  detailTestId?: string;
  icon: ReactNode;
  iconClassName?: string;
  iconTestId?: string;
  label: string;
  className?: string;
};

export default function KangurVisualCueContent({
  detail,
  detailClassName,
  detailTestId,
  icon,
  iconClassName,
  iconTestId,
  label,
  className,
}: KangurVisualCueContentProps): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        aria-hidden='true'
        className={cn('inline-flex items-center justify-center leading-none', iconClassName)}
        data-testid={iconTestId}
      >
        {icon}
      </span>
      {detail !== undefined ? (
        <span
          aria-hidden='true'
          className={cn('inline-flex items-center justify-center gap-1 leading-none', detailClassName)}
          data-testid={detailTestId}
        >
          {detail}
        </span>
      ) : null}
      <span className='sr-only'>{label}</span>
    </span>
  );
}

type KangurVisualCueDotsProps = {
  activeCount: number;
  className?: string;
  dotClassName?: string;
  inactiveDotClassName?: string;
  total: number;
};

export function KangurVisualCueDots({
  activeCount,
  className,
  dotClassName,
  inactiveDotClassName,
  total,
}: KangurVisualCueDotsProps): React.JSX.Element {
  return (
    <span aria-hidden='true' className={cn('inline-flex items-center gap-1', className)}>
      {Array.from({ length: Math.max(0, total) }, (_, index) => (
        <span
          key={`cue-dot-${index}`}
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current',
            index < activeCount ? 'opacity-95' : 'opacity-25',
            index < activeCount ? dotClassName : inactiveDotClassName
          )}
        />
      ))}
    </span>
  );
}
