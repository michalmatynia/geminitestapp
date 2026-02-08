'use client';

import { ArrowLeft, PanelLeftClose, PanelRightClose, Settings, Menu, AppWindow } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { Button, PanelHeader } from '@/shared/ui';

import { AppEmbedsPanel } from './AppEmbedsPanel';
import { ComponentSettingsPanel } from './ComponentSettingsPanel';
import { ComponentTreePanel } from './ComponentTreePanel';
import { MenuSettingsPanel } from './MenuSettingsPanel';
import { PagePreviewPanel } from './PagePreviewPanel';
import { ThemeSettingsProvider } from './ThemeSettingsContext';
import { ThemeSettingsPanel } from './ThemeSettingsPanel';
import { useBuilderKeyboardShortcuts } from '../../hooks/useBuilderKeyboardShortcuts';
import { DragStateProvider } from '../../hooks/useDragStateContext';
import { PageBuilderProvider, usePageBuilder } from '../../hooks/usePageBuilderContext';

import type { PageBuilderState } from '../../types/page-builder';

function PageBuilderInner(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayout();
  useBuilderKeyboardShortcuts();
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const autoCollapsedRightRef = useRef(false);
  const wasNarrowRef = useRef<boolean | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<'sections' | 'theme' | 'menu' | 'app-embeds'>('sections');
  const leftPanelLabel =
    leftPanelMode === 'sections'
      ? 'Sections'
      : leftPanelMode === 'theme'
        ? 'Theme settings'
        : leftPanelMode === 'menu'
          ? 'Menu settings'
          : 'App embeds';

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

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      if (state.leftPanelCollapsed) {
        dispatch({ type: 'TOGGLE_LEFT_PANEL' });
      }
      setLeftPanelMode('theme');
      window.requestAnimationFrame((): void => {
        window.dispatchEvent(new CustomEvent('cms-theme-open', { detail }));
      });
    };
    window.addEventListener('cms-builder-open-theme', handler as EventListener);
    return (): void => {
      window.removeEventListener('cms-builder-open-theme', handler as EventListener);
    };
  }, [dispatch, state.leftPanelCollapsed]);

  return (
    <div className='flex h-[calc(100vh-64px)] flex-col bg-gray-900 text-white'>
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

        {/* Left panel: Component tree / Theme settings */}
        <div
          ref={leftPanelRef}
          className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            state.leftPanelCollapsed ? 'w-0 opacity-0 -translate-x-2 pointer-events-none' : 'w-72 opacity-100 translate-x-0'
          }`}
        >
          <div className='flex w-72 min-h-0 flex-col border-r border-border bg-gray-900'>
            <PanelHeader
              title={leftPanelLabel}
              actions={(
                <div className='flex items-center gap-1'>
                  <Button
                    onClick={() => setLeftPanelMode('sections')}
                    size='icon'
                    variant='ghost'
                    className={`h-6 w-6 p-0 ${
                      leftPanelMode === 'sections'
                        ? 'text-gray-500/70'
                        : 'text-blue-300 hover:text-blue-200'
                    }`}
                    title='Back to sections'
                    aria-label='Back to sections'
                    disabled={leftPanelMode === 'sections'}
                  >
                    <ArrowLeft className='size-3.5' />
                  </Button>
                  <Button
                    onClick={() => setLeftPanelMode('menu')}
                    size='icon'
                    variant='ghost'
                    className={`h-6 w-6 p-0 ${
                      leftPanelMode === 'menu'
                        ? 'text-blue-300 hover:text-blue-200'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title='Menu settings'
                    aria-label='Menu settings'
                  >
                    <Menu className='size-3.5' />
                  </Button>
                  <Button
                    onClick={() => setLeftPanelMode('app-embeds')}
                    size='icon'
                    variant='ghost'
                    className={`h-6 w-6 p-0 ${
                      leftPanelMode === 'app-embeds'
                        ? 'text-blue-300 hover:text-blue-200'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title='App embeds'
                    aria-label='App embeds'
                  >
                    <AppWindow className='size-3.5' />
                  </Button>
                  <Button
                    onClick={() => setLeftPanelMode('theme')}
                    size='icon'
                    variant='ghost'
                    className={`h-6 w-6 p-0 ${
                      leftPanelMode === 'theme'
                        ? 'text-blue-300 hover:text-blue-200'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title='Theme settings'
                    aria-label='Theme settings'
                  >
                    <Settings className='size-3.5' />
                  </Button>
                  <Button
                    onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
                    size='icon'
                    variant='ghost'
                    className='h-6 w-6 p-0 text-gray-500 hover:text-gray-300'
                    aria-label='Hide left panel'
                  >
                    <PanelLeftClose className='size-3.5' />
                  </Button>
                </div>
              )}
            />
            {leftPanelMode === 'sections' && <ComponentTreePanel />}
            {leftPanelMode === 'theme' && <ThemeSettingsPanel showHeader={false} />}
            {leftPanelMode === 'menu' && <MenuSettingsPanel showHeader={false} />}
            {leftPanelMode === 'app-embeds' && <AppEmbedsPanel showHeader={false} />}
          </div>
        </div>

        {/* Center panel: Preview */}
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

        {/* Right panel: Settings */}
        <div
          ref={rightPanelRef}
          className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            state.rightPanelCollapsed ? 'w-0 opacity-0 translate-x-2 pointer-events-none' : 'w-80 opacity-100 translate-x-0'
          }`}
        >
          <ComponentSettingsPanel />
        </div>
      </div>
    </div>
  );
}

export function PageBuilderLayout({ initialState }: { initialState?: PageBuilderState | undefined }): React.ReactNode {
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
