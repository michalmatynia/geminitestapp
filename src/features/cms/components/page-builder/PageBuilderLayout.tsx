'use client';

import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { useAdminLayoutActions } from '@/features/admin';
import { Button } from '@/shared/ui';

import { PagePreviewPanel } from './PagePreviewPanel';
import { PageBuilderPageSkeleton } from './PageBuilderPageSkeleton';
import { ThemeSettingsProvider } from './ThemeSettingsContext';
import { useBuilderKeyboardShortcuts } from '../../hooks/useBuilderKeyboardShortcuts';
import { useCmsDomainSelection } from '../../hooks/useCmsDomainSelection';
import { useCmsPage, useCmsPages } from '../../hooks/useCmsQueries';
import { DragStateProvider } from '../../hooks/useDragStateContext';
import { PageBuilderProvider, usePageBuilder } from '../../hooks/usePageBuilderContext';

import { CmsBuilderLeftPanel } from './CmsBuilderLeftPanel';
import { PageBuilderRightPanel } from './PageBuilderRightPanel';

import type { PageBuilderState } from '../../types/page-builder';

function PageBuilderInner(): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const { activeDomainId, isLoading: domainSelectionLoading } = useCmsDomainSelection();
  const pagesQuery = useCmsPages(activeDomainId);
  const initialPageId = React.useMemo((): string => {
    if (state.currentPage?.id) return state.currentPage.id;
    return pagesQuery.data?.[0]?.id ?? '';
  }, [pagesQuery.data, state.currentPage?.id]);
  const pageQuery = useCmsPage(initialPageId || undefined);
  useBuilderKeyboardShortcuts();

  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const autoCollapsedRightRef = useRef(false);
  const wasNarrowRef = useRef<boolean | null>(null);

  useEffect((): (() => void) => {
    setIsProgrammaticallyCollapsed(true);
    return (): void => setIsProgrammaticallyCollapsed(false);
  }, [setIsProgrammaticallyCollapsed]);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return undefined;
    const breakpoint = 1200;
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const applyBreakpoint = (isNarrow: boolean): void => {
      if (wasNarrowRef.current === isNarrow) return;
      wasNarrowRef.current = isNarrow;

      if (isNarrow) {
        if (!state.rightPanelCollapsed) {
          dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
          autoCollapsedRightRef.current = true;
        }
      } else if (autoCollapsedRightRef.current) {
        if (state.rightPanelCollapsed) {
          dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
        }
        autoCollapsedRightRef.current = false;
      }
    };

    applyBreakpoint(media.matches);
    const handler = (event: MediaQueryListEvent): void => {
      applyBreakpoint(event.matches);
    };

    media.addEventListener('change', handler);
    return (): void => {
      media.removeEventListener('change', handler);
    };
  }, [dispatch, state.rightPanelCollapsed]);

  const isBuilderBootstrapping =
    !state.currentPage && (domainSelectionLoading || pagesQuery.isLoading || pageQuery.isLoading);

  if (isBuilderBootstrapping) {
    return <PageBuilderPageSkeleton />;
  }

  return (
    <div className='flex h-[calc(100vh-64px)] flex-col bg-background text-white'>
      <div className='relative flex flex-1 overflow-hidden'>
        {/* Left panel toggle (shown when collapsed) */}
        {state.leftPanelCollapsed && !isViewing && (
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
            size='sm'
            variant='outline'
            className='absolute left-1 top-1 z-10 h-8 w-8 p-0 border text-gray-300 hover:bg-muted/50'
            aria-label='Show left panel'
          >
            <PanelLeftClose className='size-4' />
          </Button>
        )}

        <CmsBuilderLeftPanel />

        <PagePreviewPanel />

        {/* Right panel toggle (shown when collapsed) */}
        {state.rightPanelCollapsed && !isViewing && (
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
            size='sm'
            variant='outline'
            className='absolute right-1 top-1 z-10 h-8 w-8 p-0 border text-gray-300 hover:bg-muted/50'
            aria-label='Show right panel'
          >
            <PanelRightClose className='size-4' />
          </Button>
        )}

        <PageBuilderRightPanel />
      </div>
    </div>
  );
}

export function PageBuilderLayout({
  initialState,
}: {
  initialState?: PageBuilderState | undefined;
}): React.JSX.Element {
  const providerProps = React.useMemo(() => (initialState ? { initialState } : {}), [initialState]);

  return (
    <PageBuilderProvider {...providerProps}>
      <DragStateProvider>
        <ThemeSettingsProvider>
          <PageBuilderInner />
        </ThemeSettingsProvider>
      </DragStateProvider>
    </PageBuilderProvider>
  );
}
