'use client';

import { type ReactNode } from 'react';

import { KangurAdminMenuToggle } from '@/features/kangur/admin/KangurAdminMenuToggle';
import { Breadcrumbs, ListPanel, SectionHeader } from '@/shared/ui';
import type { BreadcrumbItem } from '@/shared/ui';
import { cn } from '@/shared/utils';

type KangurAdminContentShellProps = {
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  headerActions?: ReactNode;
  refresh?:
    | {
        onRefresh: () => void;
        isRefreshing: boolean;
      }
    | undefined;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  contentClassName?: string;
  showMenuToggle?: boolean;
};

export function KangurAdminContentShell({
  title,
  description,
  breadcrumbs,
  headerActions,
  refresh,
  children,
  className,
  panelClassName,
  contentClassName,
  showMenuToggle = false,
}: KangurAdminContentShellProps): React.JSX.Element {
  return (
    <>
      {showMenuToggle ? <KangurAdminMenuToggle /> : null}
      <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 lg:px-6', className)}>
        <ListPanel
          header={
            <SectionHeader
              title={title}
              description={description}
              actions={headerActions}
              refresh={refresh}
              className='gap-6'
            >
              <Breadcrumbs items={breadcrumbs} className='mt-1' />
            </SectionHeader>
          }
          className={cn('border-border/70 bg-card/70 shadow-sm backdrop-blur-sm', panelClassName)}
          headerClassName='mb-8'
          contentClassName={cn('min-h-0', contentClassName)}
        >
          {children}
        </ListPanel>
      </div>
    </>
  );
}
