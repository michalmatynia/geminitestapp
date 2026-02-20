import { Loader2 } from 'lucide-react';

import { cn } from '@/shared/utils';

import { SectionHeader } from './section-header';

import type { ReactNode } from 'react';

type ListPanelVariant = 'default' | 'flat';

type ListPanelProps = {
  title?: string;
  description?: string;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  headerActions?: ReactNode;
  header?: ReactNode; // Legacy or custom header
  refresh?: {
    onRefresh: () => void;
    isRefreshing: boolean;
  } | undefined;
  alerts?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  alertsClassName?: string;
  filtersClassName?: string;
  actionsClassName?: string;
  footerClassName?: string;
  variant?: ListPanelVariant;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyState?: ReactNode;
};

const variantStyles: Record<ListPanelVariant, string> = {
  default: 'rounded-lg border bg-card p-6',
  flat: 'bg-transparent p-0 shadow-none',
};

export function ListPanel({
  title,
  description,
  eyebrow,
  icon,
  headerActions,
  header,
  refresh,
  alerts,
  filters,
  actions,
  footer,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  alertsClassName,
  filtersClassName,
  actionsClassName,
  footerClassName,
  variant = 'default',
  isLoading = false,
  loadingMessage = 'Loading...',
  emptyState,
}: ListPanelProps) {
  return (
    <section className={cn(variantStyles[variant], className)}>
      {header || title ? (
        <div className={cn('mb-6', headerClassName)}>
          {header || (
            <SectionHeader
              title={title ?? ''}
              description={description}
              eyebrow={eyebrow}
              icon={icon}
              actions={headerActions}
              refresh={refresh}
              titleClassName={titleClassName}
              descriptionClassName={descriptionClassName}
            />
          )}
        </div>
      ) : null}
      
      {alerts ? (
        <div className={cn('mb-4 space-y-3', alertsClassName)}>
          {alerts}
        </div>
      ) : null}

      {filters ? (
        <div className={cn('mb-4', filtersClassName)}>{filters}</div>
      ) : null}

      {actions ? (
        <div className={cn('mb-4', actionsClassName)}>{actions}</div>
      ) : null}

      <div className={cn('min-h-0', contentClassName)}>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-16 text-sm text-muted-foreground'>
            <Loader2 className='mb-4 h-8 w-8 animate-spin text-blue-500' />
            {loadingMessage}
          </div>
        ) : children ? (
          children
        ) : emptyState ? (
          emptyState
        ) : null}
      </div>

      {footer ? (
        <div className={cn('mt-4', footerClassName)}>{footer}</div>
      ) : null}
    </section>
  );
}
