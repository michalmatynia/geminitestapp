import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

type AdminTitleBreadcrumbHeaderProps = {
  title: ReactNode;
  breadcrumb: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleStackClassName?: string;
  titleRowClassName?: string;
  breadcrumbClassName?: string;
  actionsClassName?: string;
};

export function AdminTitleBreadcrumbHeader({
  title,
  breadcrumb,
  actions,
  className,
  titleStackClassName,
  titleRowClassName,
  breadcrumbClassName,
  actionsClassName,
}: AdminTitleBreadcrumbHeaderProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className={cn('min-w-0 space-y-1', titleStackClassName)}>
        <div className={cn('min-w-0', titleRowClassName)}>{title}</div>
        <div className={cn('min-w-0', breadcrumbClassName)}>{breadcrumb}</div>
      </div>
      {actions ? (
        <div className={cn('flex flex-wrap items-center gap-2 pt-1', actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
