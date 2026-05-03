'use client';

import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  type LeftPanelMode,
  usePageBuilder,
} from '@/features/cms/public';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';
import { Button } from '@/features/kangur/shared/ui';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { type KangurThemeMode } from '@/features/kangur/appearance/theme-settings';

import { KangurCmsBuilderLeftPanel } from './KangurCmsBuilderLeftPanel';
import { KangurCmsBuilderRightPanel } from './KangurCmsBuilderRightPanel';
import { KangurCmsBuilderStatusSidebar } from './KangurCmsBuilderStatusSidebar';
import { useKangurCmsBuilderRuntime } from './KangurCmsBuilderRuntimeContext';
import { KangurCmsPreviewPanel } from './KangurCmsPreviewPanel';
import { resolveThemePreviewFallback } from './workspace-theme-preview';

const readStoredStatusSidebar = (): boolean => {
  if (typeof window === 'undefined') return true;
  return withKangurClientErrorSync(
    {
      source: 'kangur.cms-builder',
      action: 'read-status-sidebar',
      description: 'Reads the persisted CMS builder status sidebar state.',
    },
    () => window.localStorage.getItem('kangur_cms_builder_status_sidebar') !== '0',
    { fallback: true }
  );
};

const useStatusSidebarState = (): {
  setStatusSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statusSidebarOpen: boolean;
} => {
  const [statusSidebarOpen, setStatusSidebarOpen] = useState<boolean>(readStoredStatusSidebar);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    withKangurClientErrorSync(
      {
        source: 'kangur.cms-builder',
        action: 'persist-status-sidebar',
        description: 'Persists the CMS builder status sidebar state.',
        context: { statusSidebarOpen },
      },
      () => {
        window.localStorage.setItem(
          'kangur_cms_builder_status_sidebar',
          statusSidebarOpen ? '1' : '0'
        );
      },
      { fallback: undefined }
    );
  }, [statusSidebarOpen]);

  return { setStatusSidebarOpen, statusSidebarOpen };
};

const useBuilderLayoutEffects = ({
  dispatch,
  rightPanelCollapsed,
}: {
  dispatch: ReturnType<typeof usePageBuilder>['dispatch'];
  rightPanelCollapsed: boolean;
}): void => {
  const { setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const autoCollapsedRightRef = useRef(false);
  const wasNarrowRef = useRef<boolean | null>(null);

  useEffect((): (() => void) => {
    setIsProgrammaticallyCollapsed(true);
    return (): void => setIsProgrammaticallyCollapsed(false);
  }, [setIsProgrammaticallyCollapsed]);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 1200px)');
    const applyBreakpoint = (isNarrow: boolean): void => {
      if (wasNarrowRef.current === isNarrow) return;
      wasNarrowRef.current = isNarrow;
      if (isNarrow && !rightPanelCollapsed) {
        dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
        autoCollapsedRightRef.current = true;
      } else if (!isNarrow && autoCollapsedRightRef.current) {
        if (rightPanelCollapsed) {
          dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
        }
        autoCollapsedRightRef.current = false;
      }
    };

    applyBreakpoint(media.matches);
    const handleChange = (event: MediaQueryListEvent): void => applyBreakpoint(event.matches);
    media.addEventListener('change', handleChange);
    return (): void => media.removeEventListener('change', handleChange);
  }, [dispatch, rightPanelCollapsed]);
};

const CollapseToggleButton = ({
  ariaLabel,
  className,
  icon,
  onClick,
  title,
}: {
  ariaLabel: string;
  className: string;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}): React.JSX.Element => (
  <Button
    onClick={onClick}
    size='sm'
    variant='outline'
    className={className}
    aria-label={ariaLabel}
    title={title}
  >
    {icon}
  </Button>
);

export function KangurCmsBuilderInner(): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const { themePreviewMode, themePreviewFallbacks, setThemePreviewMode: onThemeModeChange } =
    useKangurCmsBuilderRuntime();
  const { setStatusSidebarOpen, statusSidebarOpen } = useStatusSidebarState();
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('structure');
  const [themePreviewSection, setThemePreviewSection] = useState<string | null>(null);
  const [themePreviewTheme, setThemePreviewTheme] = useState<ThemeSettings | null>(null);
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  useBuilderLayoutEffects({ dispatch, rightPanelCollapsed: state.rightPanelCollapsed });

  const handleThemeModeChange = useCallback((mode: KangurThemeMode): void => {
    setThemePreviewTheme(null);
    onThemeModeChange(mode);
  }, [onThemeModeChange]);

  return (
    <div className='flex h-[calc(100vh-64px)] flex-col bg-background text-white'>
      <div className='relative flex flex-1 overflow-hidden'>
        {state.leftPanelCollapsed && !isViewing ? (
          <CollapseToggleButton
            ariaLabel='Show left panel'
            className='absolute left-1 top-1 z-10 h-8 w-8 border p-0 text-gray-300 hover:bg-muted/50'
            icon={<PanelLeftClose className='size-4' />}
            onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
            title='Show left panel'
          />
        ) : null}
        <KangurCmsBuilderLeftPanel
          onModeChange={setLeftPanelMode}
          onThemeSectionChange={setThemePreviewSection}
          onThemeChange={setThemePreviewTheme}
          onThemeModeChange={handleThemeModeChange}
        />
        <KangurCmsPreviewPanel
          statusSidebarOpen={statusSidebarOpen}
          onToggleStatusSidebar={() => setStatusSidebarOpen((prev) => !prev)}
        />
        {state.rightPanelCollapsed && !isViewing ? (
          <CollapseToggleButton
            ariaLabel='Show right panel'
            className='absolute right-1 top-1 z-10 h-8 w-8 border p-0 text-gray-300 hover:bg-muted/50'
            icon={<PanelRightClose className='size-4' />}
            onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
            title='Show right panel'
          />
        ) : null}
        <KangurCmsBuilderRightPanel
          showThemePreview={leftPanelMode === 'theme'}
          themePreviewSection={themePreviewSection}
          themePreviewTheme={
            themePreviewTheme ?? resolveThemePreviewFallback(themePreviewMode, themePreviewFallbacks)
          }
          themePreviewMode={themePreviewMode}
        />
        <KangurCmsBuilderStatusSidebar visible={statusSidebarOpen} />
      </div>
    </div>
  );
}
