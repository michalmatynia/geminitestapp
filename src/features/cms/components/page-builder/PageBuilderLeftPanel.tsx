'use client';

import React from 'react';
import { ArrowLeft, Menu, AppWindow, Settings, PanelLeftClose } from 'lucide-react';
import { Button, SectionHeader } from '@/shared/ui';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';
import { ComponentTreePanel } from './ComponentTreePanel';
import { ThemeSettingsPanel } from './ThemeSettingsPanel';
import { MenuSettingsPanel } from './MenuSettingsPanel';
import { AppEmbedsPanel } from './AppEmbedsPanel';

export type LeftPanelMode = 'sections' | 'theme' | 'menu' | 'app-embeds';

export function PageBuilderLeftPanel(): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const [leftPanelMode, setLeftPanelMode] = React.useState<LeftPanelMode>('sections');

  const leftPanelLabel =
    leftPanelMode === 'sections'
      ? 'Sections'
      : leftPanelMode === 'theme'
        ? 'Theme settings'
        : leftPanelMode === 'menu'
          ? 'Menu settings'
          : 'App embeds';

  React.useEffect((): (() => void) | void => {
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
    <div
      className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        state.leftPanelCollapsed
          ? 'w-0 opacity-0 -translate-x-2 pointer-events-none'
          : 'w-72 opacity-100 translate-x-0'
      }`}
    >
      <div className='flex w-72 min-h-0 flex-col border-r border-border bg-card'>
        <SectionHeader
          title={leftPanelLabel}
          size='xs'
          className='p-3 border-b border-border'
          actions={
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
          }
        />
        {leftPanelMode === 'sections' && <ComponentTreePanel />}
        {leftPanelMode === 'theme' && <ThemeSettingsPanel showHeader={false} />}
        {leftPanelMode === 'menu' && <MenuSettingsPanel showHeader={false} />}
        {leftPanelMode === 'app-embeds' && <AppEmbedsPanel showHeader={false} />}
      </div>
    </div>
  );
}
