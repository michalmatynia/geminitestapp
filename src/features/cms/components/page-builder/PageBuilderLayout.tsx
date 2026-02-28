'use client';

import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { Button } from '@/shared/ui';

import { PagePreviewPanel } from './PagePreviewPanel';
import { ThemeSettingsProvider } from './ThemeSettingsContext';
import { useBuilderKeyboardShortcuts } from '../../hooks/useBuilderKeyboardShortcuts';
import { DragStateProvider } from '../../hooks/useDragStateContext';
import { PageBuilderProvider, usePageBuilder } from '../../hooks/usePageBuilderContext';

import { PageBuilderLeftPanel } from './PageBuilderLeftPanel';
import { PageBuilderRightPanel } from './PageBuilderRightPanel';

import type { PageBuilderState } from '../../types/page-builder';

function PageBuilderInner(): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayout();
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

        <PageBuilderLeftPanel />

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
  return (
    <PageBuilderProvider {...(initialState ? { initialState } : {})}>
      <DragStateProvider>
        <ThemeSettingsProvider>
          <PageBuilderInner />
        </ThemeSettingsProvider>
      </DragStateProvider>
    </PageBuilderProvider>
  );
}
