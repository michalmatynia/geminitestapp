'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { KangurAdminMenuToggle } from '@/features/kangur/admin/KangurAdminMenuToggle';
import type { BreadcrumbItem } from '@/shared/contracts/ui/ui/base';
import type { SectionHeaderRefreshConfigDto } from '@/shared/contracts/ui/ui/menus';
import { Breadcrumbs, ListPanel, SectionHeader } from '@/features/kangur/shared/ui';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import { cn } from '@/features/kangur/shared/utils';

type KangurAdminContentShellProps = {
  title: string;
  description: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  headerActions?: ReactNode;
  headerLayout?: 'inline' | 'stacked';
  headerFooterSpacing?: 'default' | 'flush';
  showBreadcrumbs?: boolean;
  refresh?: SectionHeaderRefreshConfigDto | undefined;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  contentClassName?: string;
  panelVariant?: 'default' | 'flat';
  showMenuToggle?: boolean;
};

const KangurAdminContentShellContext = createContext<{
  title: string;
  description: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  headerActions?: ReactNode;
  headerLayout?: 'inline' | 'stacked';
  headerFooterSpacing?: 'default' | 'flush';
  showBreadcrumbs?: boolean;
  refresh?: SectionHeaderRefreshConfigDto | undefined;
} | null>(null);

const useKangurAdminContentShellContext = () => {
  const value = useContext(KangurAdminContentShellContext);
  if (!value) {
    throw new Error('KangurAdminContentShell context is unavailable.');
  }
  return value;
};

function KangurAdminContentShellHeader(): React.JSX.Element {
  const {
    title,
    description,
    breadcrumbs,
    headerActions,
    headerLayout,
    headerFooterSpacing,
    showBreadcrumbs,
    refresh,
  } =
    useKangurAdminContentShellContext();
  const isStacked = headerLayout === 'stacked';
  const resolvedHeaderActions = headerActions ? (
    <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-3'>{headerActions}</div>
  ) : null;
  const shouldShowBreadcrumbs = showBreadcrumbs !== false;
  const hasFooterContent = Boolean((isStacked && resolvedHeaderActions) || shouldShowBreadcrumbs);
  const renderFooterContent = (className: string): React.JSX.Element => (
    <div className={className}>
      {isStacked && resolvedHeaderActions ? (
        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>{resolvedHeaderActions}</div>
      ) : null}
      {shouldShowBreadcrumbs ? (
        <div className='flex flex-wrap items-center gap-3'>
          <AdminFavoriteBreadcrumbRow>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
          </AdminFavoriteBreadcrumbRow>
          <span className='hidden h-4 w-px bg-white/12 md:block' />
          <span className='text-xs text-slate-300/80'>
            Focused editing shell for lessons, tests, and content operations.
          </span>
        </div>
      ) : null}
    </div>
  );
  const footerContentDefault = renderFooterContent('mt-1 space-y-1');
  const footerContentFlush = hasFooterContent
    ? renderFooterContent('mt-4 pt-4 space-y-1')
    : null;

  return (
    <div className='relative overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(10,18,32,0.97),rgba(13,38,68,0.88))] px-5 py-5 shadow-[0_30px_100px_-56px_rgba(14,165,233,0.42)]'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_58%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_54%)]' />
      <div className='relative'>
        <SectionHeader
          title={title}
          description={description}
          actions={isStacked ? undefined : resolvedHeaderActions}
          refresh={refresh}
          className={cn('gap-6', isStacked ? 'lg:flex-col lg:items-stretch' : null)}
          actionsClassName={isStacked ? 'w-full justify-start' : undefined}
        >
          {headerFooterSpacing === 'flush' ? null : footerContentDefault}
        </SectionHeader>
        {headerFooterSpacing === 'flush' ? footerContentFlush : null}
      </div>
    </div>
  );
}

export function KangurAdminContentShell({
  title,
  description,
  breadcrumbs,
  headerActions,
  headerLayout = 'inline',
  headerFooterSpacing = 'default',
  showBreadcrumbs = true,
  refresh,
  children,
  className,
  panelClassName,
  contentClassName,
  panelVariant = 'default',
  showMenuToggle = false,
}: KangurAdminContentShellProps): React.JSX.Element {
  const contextValue = {
    title,
    description,
    breadcrumbs,
    headerActions,
    headerLayout,
    headerFooterSpacing,
    showBreadcrumbs,
    refresh,
  };
  const panelSurfaceClassName = cn(
    panelVariant === 'flat'
      ? 'bg-transparent shadow-none'
      : 'border-border/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.62))] shadow-[0_36px_110px_-72px_rgba(15,23,42,0.95)] backdrop-blur-md',
    panelClassName
  );
  const panelContentClassName = cn('min-h-0 space-y-6', contentClassName);
  const shellClassNameValue = className;
  const listPanelVariant = panelVariant;

  return (
    <KangurAdminContentShellContext.Provider value={contextValue}>
      <>
        {showMenuToggle ? <KangurAdminMenuToggle /> : null}
        <div
          className={cn(
            'mx-auto w-full max-w-[92rem] px-4 py-6 lg:px-6 xl:px-8',
            shellClassNameValue
          )}
        >
          <ListPanel
            header={<KangurAdminContentShellHeader />}
            className={panelSurfaceClassName}
            headerClassName='mb-6'
            contentClassName={panelContentClassName}
            variant={listPanelVariant}
          >
            {children}
          </ListPanel>
        </div>
      </>
    </KangurAdminContentShellContext.Provider>
  );
}
