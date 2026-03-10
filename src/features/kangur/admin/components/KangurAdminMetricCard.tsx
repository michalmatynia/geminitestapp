'use client';


import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { LucideIcon } from 'lucide-react';

type KangurAdminMetricCardTone = 'neutral' | 'info' | 'warning' | 'success';

const METRIC_TONE_STYLES: Record<
  KangurAdminMetricCardTone,
  {
    iconWrapClassName: string;
    iconClassName: string;
  }
> = {
  neutral: {
    iconWrapClassName: 'border-border/60 bg-background/80',
    iconClassName: 'text-foreground',
  },
  info: {
    iconWrapClassName: 'border-sky-300/20 bg-sky-500/10',
    iconClassName: 'text-sky-200',
  },
  warning: {
    iconWrapClassName: 'border-amber-300/20 bg-amber-500/10',
    iconClassName: 'text-amber-200',
  },
  success: {
    iconWrapClassName: 'border-emerald-300/20 bg-emerald-500/10',
    iconClassName: 'text-emerald-200',
  },
};

type KangurAdminMetricCardProps = {
  label: string;
  value: number;
  detail: string;
  Icon: LucideIcon;
  tone?: KangurAdminMetricCardTone;
  className?: string;
};

export function KangurAdminMetricCard({
  label,
  value,
  detail,
  Icon,
  tone = 'neutral',
  className,
}: KangurAdminMetricCardProps): React.JSX.Element {
  const toneStyles = METRIC_TONE_STYLES[tone];

  return (
    <Card
      variant='subtle'
      padding='md'
      className={cn('rounded-2xl border-border/60 bg-card/40 shadow-sm', className)}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground'>
            {label}
          </div>
          <div className='mt-2 text-2xl font-semibold text-foreground'>{value}</div>
        </div>
        <div
          className={cn(
            'rounded-xl border p-2 shadow-sm',
            toneStyles.iconWrapClassName
          )}
        >
          <Icon className={cn('size-4', toneStyles.iconClassName)} />
        </div>
      </div>
      <div className='mt-3 text-xs leading-relaxed text-muted-foreground'>{detail}</div>
    </Card>
  );
}
