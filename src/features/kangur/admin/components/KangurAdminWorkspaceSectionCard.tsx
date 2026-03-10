'use client';


import { Badge, Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ReactNode } from 'react';

type KangurAdminWorkspaceSectionCardProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function KangurAdminWorkspaceSectionCard({
  title,
  description,
  badge,
  actions,
  children,
  className,
  bodyClassName,
}: KangurAdminWorkspaceSectionCardProps): React.JSX.Element {
  return (
    <Card
      variant='subtle'
      padding='md'
      className={cn('rounded-2xl border-border/60 bg-card/40 shadow-sm', className)}
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
            {badge ? <Badge variant='outline'>{badge}</Badge> : null}
          </div>
          {description ? (
            <p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>{description}</p>
          ) : null}
        </div>
        {actions ? <div className='shrink-0'>{actions}</div> : null}
      </div>
      {children ? <div className={cn('mt-4', bodyClassName)}>{children}</div> : null}
    </Card>
  );
}
