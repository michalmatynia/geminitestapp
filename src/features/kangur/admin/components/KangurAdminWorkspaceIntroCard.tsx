'use client';


import { Badge, Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ReactNode } from 'react';

type KangurAdminWorkspaceIntroCardProps = {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
};

export function KangurAdminWorkspaceIntroCard({
  title,
  description,
  badge,
  actions,
  className,
}: KangurAdminWorkspaceIntroCardProps): React.JSX.Element {
  const cardClassName = cn('rounded-2xl border-border/60 bg-card/40 shadow-sm', className);

  return (
    <Card variant='subtle' padding='md' className={cardClassName}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-base font-semibold text-foreground'>{title}</h2>
            {badge ? <Badge variant='outline'>{badge}</Badge> : null}
          </div>
          <p className='mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground'>
            {description}
          </p>
        </div>
        {actions ? <div className='shrink-0'>{actions}</div> : null}
      </div>
    </Card>
  );
}
