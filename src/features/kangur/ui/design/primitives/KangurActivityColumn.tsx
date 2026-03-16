import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { type KangurAccent } from '../tokens';

export const KANGUR_ACTIVITY_COLUMN_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'kangur-gradient-accent-indigo',
  violet: 'kangur-gradient-accent-violet',
  emerald: 'kangur-gradient-accent-emerald',
  sky: 'kangur-gradient-accent-sky',
  amber: 'kangur-gradient-accent-amber',
  rose: 'kangur-gradient-accent-rose',
  teal: 'kangur-gradient-accent-teal',
  slate: 'kangur-gradient-accent-slate',
};

export type KangurActivityColumnProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: KangurAccent;
  active?: boolean;
  value: number;
};

export function KangurActivityColumn({
  accent = 'indigo',
  active = false,
  className,
  value,
  ...props
}: KangurActivityColumnProps): React.JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        'w-full rounded-lg bg-gradient-to-t transition-[height] duration-500',
        active
          ? cn(
            KANGUR_ACTIVITY_COLUMN_CLASSNAMES[accent],
            'shadow-[0_18px_28px_-18px_rgba(99,102,241,0.42)]'
          )
          : KANGUR_ACTIVITY_COLUMN_CLASSNAMES.slate,
        className
      )}
      data-active={active ? 'true' : 'false'}
      style={{ height: `${clampedValue}%` }}
      {...props}
    />
  );
}
