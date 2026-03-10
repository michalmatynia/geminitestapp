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
  const resolvedHeaderActions = headerActions ? (
    <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-3'>{headerActions}</div>
  ) : null;

  return (
    <div className='relative overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(10,18,32,0.97),rgba(13,38,68,0.88))] px-5 py-5 shadow-[0_30px_100px_-56px_rgba(14,165,233,0.42)]'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_58%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_54%)]' />
      <div className='relative'>
        <div className='mb-4 flex flex-wrap items-center gap-2'>
          <span className='inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/85'>
            Kangur Admin Workspace
          </span>
          <span className='inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300/90'>
            Structured authoring shell
          </span>
        </div>
        <SectionHeader
          title={title}
          description={description}
          actions={resolvedHeaderActions}
          refresh={refresh}
          className='gap-6'
        >
          <div className='mt-3 flex flex-wrap items-center gap-3'>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
            <span className='hidden h-4 w-px bg-white/12 md:block' />
            <span className='text-xs text-slate-300/80'>
              Focused editing shell for lessons, tests, and content operations.
            </span>
          </div>
        </SectionHeader>
      </div>
    </div>
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
    'border-border/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.62))] shadow-[0_36px_110px_-72px_rgba(15,23,42,0.95)] backdrop-blur-md',
    panelClassName
  );
  const panelContentClassName = cn('min-h-0 space-y-6', contentClassName);
  const shellClassNameValue = className;

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
          >
            {children}
          </ListPanel>
        </div>
      </>
    </KangurAdminContentShellContext.Provider>
  );
}
