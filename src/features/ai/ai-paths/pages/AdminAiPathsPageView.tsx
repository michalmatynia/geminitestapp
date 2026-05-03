'use client';

import { Card } from '@/shared/ui/primitives.public';
import { FocusModeTogglePortal } from '@/shared/ui/navigation-and-layout.public';
import { AdminAiPathsBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { cn } from '@/shared/utils/ui-utils';

import { AiPathsSettings } from '../components/AiPathsSettings';
import { PortableEngineTrendSnapshotsPanel } from '../components/PortableEngineTrendSnapshotsPanel';
import { useAiPaths } from '../context/AiPathsContext';

const WORKSPACE_VIEWS = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'paths', label: 'Paths' },
  { id: 'docs', label: 'Docs' },
] as const;

const tabButtonClassName =
  'inline-flex min-w-[88px] items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 hover:bg-foreground/6';

export function AdminAiPathsPageView(): React.JSX.Element {
  const {
    activeTab,
    setActiveTab,
    mounted,
    isFocusMode,
    onToggleFocusMode,
    setIsFocusMode,
  } = useAiPaths();
  const activeView = WORKSPACE_VIEWS.find((view) => view.id === activeTab) ?? WORKSPACE_VIEWS[0];

  const wrapperClass = isFocusMode
    ? 'h-[calc(100%+2rem)] w-[calc(100%+2rem)] -m-4'
    : 'mx-auto box-border flex h-[calc((100dvh-4rem)*1.19)] w-full min-h-0 min-w-0 max-w-none flex-col gap-3 overflow-hidden px-0.5 pb-0 pt-2';

  return (
    <div className={wrapperClass}>
      {activeTab === 'canvas' && (
        <FocusModeTogglePortal
          isFocusMode={isFocusMode}
          onToggleFocusMode={onToggleFocusMode}
          labelOn='Show side menu and top bar'
          labelOff='Preview canvas only'
        />
      )}
      {!isFocusMode && (
        <AiPathsWorkspaceHeader
          activeTab={activeTab}
          activeViewLabel={activeView.label}
          mounted={mounted}
          setActiveTab={setActiveTab}
        />
      )}
      <Card
        variant='subtle'
        padding='none'
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-border/60 bg-card/40 transition-all duration-300 ease-in-out',
          isFocusMode ? 'h-full border-0 rounded-none' : 'p-3'
        )}
      >
        <AiPathsSettings
          activeTab={activeTab}
          renderActions={(actions: React.ReactNode) => <div className='w-full'>{actions}</div>}
          onTabChange={setActiveTab}
          isFocusMode={isFocusMode}
          onFocusModeChange={setIsFocusMode}
        />
      </Card>
    </div>
  );
}

function AiPathsWorkspaceHeader({
  activeTab,
  activeViewLabel,
  mounted,
  setActiveTab,
}: {
  activeTab: (typeof WORKSPACE_VIEWS)[number]['id'];
  activeViewLabel: string;
  mounted: boolean;
  setActiveTab: (id: (typeof WORKSPACE_VIEWS)[number]['id']) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-3 px-1'>
      <AdminTitleBreadcrumbHeader
        title={
          <div className='space-y-1'>
            <h1 className='text-3xl font-bold tracking-tight text-white'>AI Paths</h1>
            <p className='text-sm text-muted-foreground'>
              Build, organize, and validate workflow canvases without losing operational context.
            </p>
          </div>
        }
        breadcrumb={<AdminAiPathsBreadcrumbs current={activeViewLabel} />}
        actions={
          <AiPathsWorkspaceTabs
            activeTab={activeTab}
            mounted={mounted}
            setActiveTab={setActiveTab}
          />
        }
        actionsClassName='w-full justify-start pt-0 sm:w-auto sm:justify-end sm:pt-1'
      />

      {activeTab === 'canvas' ? (
        <div className='rounded-2xl border border-border/60 bg-card/30 p-4 shadow-sm'>
          <div id='ai-paths-name' className='min-h-[72px] text-sm text-gray-300' />
          <div className='mt-4 border-t border-border/50 pt-4'>
            <div id='ai-paths-actions' className='flex w-full items-start' />
          </div>
        </div>
      ) : (
        <div className='rounded-2xl border border-border/60 bg-card/30 p-4 shadow-sm'>
          <PortableEngineTrendSnapshotsPanel />
        </div>
      )}
    </div>
  );
}

function AiPathsWorkspaceTabs({
  activeTab,
  mounted,
  setActiveTab,
}: {
  activeTab: (typeof WORKSPACE_VIEWS)[number]['id'];
  mounted: boolean;
  setActiveTab: (id: (typeof WORKSPACE_VIEWS)[number]['id']) => void;
}): React.JSX.Element {
  if (!mounted) return <div className='h-10 w-[240px]' />;

  return (
    <div
      role='group'
      aria-label='AI paths workspace views'
      className='inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-card/55 p-1'
    >
      {WORKSPACE_VIEWS.map((view) => {
        const isActive = activeTab === view.id;
        return (
          <button
            key={view.id}
            type='button'
            aria-pressed={isActive}
            aria-label={view.label}
            onClick={() => setActiveTab(view.id)}
            className={cn(
              tabButtonClassName,
              isActive ? 'bg-foreground/10 text-foreground shadow-sm' : 'text-muted-foreground/80'
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
