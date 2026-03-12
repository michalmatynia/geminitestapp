import * as React from 'react';

import { cn } from '@/shared/utils';

import { type KangurAccent } from '../tokens';

export const KANGUR_ACTIVITY_COLUMN_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'from-indigo-500 to-purple-400',
  violet: 'from-violet-500 to-fuchsia-400',
  emerald: 'from-emerald-500 to-teal-400',
  sky: 'from-sky-400 to-indigo-300',
  amber: 'from-amber-400 to-orange-400',
  rose: 'from-rose-500 to-pink-400',
  teal: 'from-teal-500 to-cyan-400',
  slate: 'from-slate-300 to-slate-200',
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
