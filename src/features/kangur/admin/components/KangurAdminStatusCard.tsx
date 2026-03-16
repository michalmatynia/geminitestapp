import type { ReactNode } from 'react';

import { Card } from '@/features/kangur/shared/ui';

type KangurAdminStatusCardItem = {
  label: string;
  value: ReactNode;
};

type KangurAdminStatusCardProps = {
  title?: string;
  statusBadge?: ReactNode;
  items?: KangurAdminStatusCardItem[];
  children?: ReactNode;
  sticky?: boolean;
};

export function KangurAdminStatusCard({
  title = 'Status',
  statusBadge,
  items,
  children,
  sticky = true,
}: KangurAdminStatusCardProps): React.JSX.Element {
  const cardClassName = `h-fit border-border/60 bg-card/30 shadow-sm${
    sticky ? ' xl:sticky xl:top-24' : ''
  }`;

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className={cardClassName}
    >
      <div className='space-y-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
            {title}
          </div>
          {statusBadge ? <div className='shrink-0'>{statusBadge}</div> : null}
        </div>

        {items ? (
          <div className='space-y-2'>
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className='flex items-center justify-between gap-3 text-xs text-muted-foreground'
              >
                <span>{item.label}</span>
                <div className='shrink-0'>{item.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {children ? <div className='space-y-2'>{children}</div> : null}
      </div>
    </Card>
  );
}
