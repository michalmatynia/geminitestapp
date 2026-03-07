'use client';

import { useEffect, useState } from 'react';

import { useAdminLayoutActions } from '@/features/admin/context/AdminLayoutContext';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { AiPathsSettings } from '../components/AiPathsSettings';
import { FocusModeTogglePortal } from '../components/FocusModeTogglePortal';
import { PortableEngineTrendSnapshotsPanel } from '../components/PortableEngineTrendSnapshotsPanel';

const WORKSPACE_VIEWS = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'paths', label: 'Paths' },
  { id: 'docs', label: 'Docs' },
] as const;

export function AdminAiPathsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'canvas' | 'paths' | 'docs'>('canvas');
  const [mounted, setMounted] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const { setIsMenuHidden } = useAdminLayoutActions();

  useEffect((): void | (() => void) => {
    const id = requestAnimationFrame(() => setMounted(true));
    return (): void => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const shouldHideAdminMenu = activeTab === 'canvas' && isFocusMode;
    setIsMenuHidden(shouldHideAdminMenu);
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [activeTab, isFocusMode, setIsMenuHidden]);

  const wrapperClass = isFocusMode
    ? 'h-[calc(100%+2rem)] w-[calc(100%+2rem)] -m-4'
    : 'mx-auto box-border flex h-[calc((100dvh-4rem)*1.19)] w-full min-h-0 min-w-0 max-w-none flex-col gap-2 overflow-hidden px-0.5 pb-0 pt-2';

  return (
    <div className={wrapperClass}>
      {activeTab === 'canvas' ? (
        <FocusModeTogglePortal
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode((current) => !current)}
        />
      ) : null}
      <div
        className={`mb-2 flex items-center justify-between gap-4 px-1 ${isFocusMode ? 'hidden' : ''}`}
      >
        {mounted ? (
          <div
            role='group'
            aria-label='AI paths workspace views'
            className='inline-flex h-10 items-center justify-center rounded-md border border-foreground/10 bg-card/70 p-1 text-muted-foreground/80'
          >
            {WORKSPACE_VIEWS.map((view) => {
              const isActive = activeTab === view.id;
              return (
                <button
                  key={view.id}
                  type='button'
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(view.id)}
                  className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 hover:bg-foreground/6',
                    isActive ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/80'
                  )}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className='h-9 w-[180px]' />
        )}
        <div id='ai-paths-name' className='text-sm text-gray-300' />
      </div>
      {!isFocusMode && activeTab !== 'canvas' ? (
        <div className='mb-2'>
          <PortableEngineTrendSnapshotsPanel />
        </div>
      ) : null}
      <Card
        variant='subtle'
        padding='none'
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-border/60 bg-card/40 transition-all duration-300 ease-in-out',
          isFocusMode ? 'h-full border-0 rounded-none' : 'p-2'
        )}
      >
        <div className={`mb-2 flex items-center ${isFocusMode ? 'hidden' : ''}`}>
          <div id='ai-paths-actions' className='flex w-full items-center' />
        </div>
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
