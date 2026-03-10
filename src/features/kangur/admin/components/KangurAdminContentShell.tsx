'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { KangurAdminMenuToggle } from '@/features/kangur/admin/KangurAdminMenuToggle';
import { Breadcrumbs, ListPanel, SectionHeader } from '@/shared/ui';
import type { BreadcrumbItem } from '@/shared/ui';
import { cn } from '@/shared/utils';

type KangurAdminRefresh = {
  onRefresh: () => void;
  isRefreshing: boolean;
};

type KangurAdminContentShellProps = {
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  headerActions?: ReactNode;
  refresh?: KangurAdminRefresh | undefined;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  contentClassName?: string;
  showMenuToggle?: boolean;
};

const KangurAdminContentShellContext = createContext<{
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  headerActions?: ReactNode;
  refresh?: KangurAdminRefresh | undefined;
} | null>(null);

const useKangurAdminContentShellContext = () => {
  const value = useContext(KangurAdminContentShellContext);
  if (!value) {
    throw new Error('KangurAdminContentShell context is unavailable.');
  }
  return value;
};

function KangurAdminContentShellHeader(): React.JSX.Element {
  const { title, description, breadcrumbs, headerActions, refresh } =
    useKangurAdminContentShellContext();

  return (
    <SectionHeader
      title={title}
      description={description}
      actions={headerActions}
      refresh={refresh}
      className='gap-6'
    >
      <Breadcrumbs items={breadcrumbs} className='mt-1' />
    </SectionHeader>
  );
}

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
  const contextValue = {
    title,
    description,
    breadcrumbs,
    headerActions,
    refresh,
  };
  const panelSurfaceClassName = cn(
    'border-border/70 bg-card/70 shadow-sm backdrop-blur-sm',
    panelClassName
  );
  const panelContentClassName = cn('min-h-0', contentClassName);
  const shellClassNameValue = className;

  return (
    <KangurAdminContentShellContext.Provider value={contextValue}>
      <>
        {showMenuToggle ? <KangurAdminMenuToggle /> : null}
        <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 lg:px-6', shellClassNameValue)}>
          <ListPanel
            header={<KangurAdminContentShellHeader />}
            className={panelSurfaceClassName}
            headerClassName='mb-8'
            contentClassName={panelContentClassName}
          >
            {children}
          </ListPanel>
        </div>
      </>
    </KangurAdminContentShellContext.Provider>
  );
}
