'use client';

import { ArrowLeft, Menu, AppWindow, Settings, PanelLeftClose, Workflow } from 'lucide-react';
import React from 'react';

import { Button, SectionHeader } from '@/shared/ui';

import { AppEmbedsPanel } from './AppEmbedsPanel';
import { ComponentTreePanel } from './ComponentTreePanel';
import { MenuSettingsPanel } from './MenuSettingsPanel';
import { ThemeSettingsPanel } from './ThemeSettingsPanel';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';

export type LeftPanelMode = 'sections' | 'theme' | 'menu' | 'app-embeds' | 'structure';

export interface CmsBuilderLeftPanelProps {
  variant?: 'standard' | 'kangur';
  themePanel?: React.ReactNode;
  onModeChange?: (mode: LeftPanelMode) => void;
}

export function CmsBuilderLeftPanel({
  variant = 'standard',
  themePanel,
  onModeChange,
}: CmsBuilderLeftPanelProps): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const [leftPanelMode, setLeftPanelMode] = React.useState<LeftPanelMode>(
    variant === 'kangur' ? 'structure' : 'sections'
  );

  const isKangur = variant === 'kangur';
  const headerActions = (
    <div className='flex items-center gap-1'>
      {!isKangur && (
        <>
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
        </>
      )}

      {isKangur && (
        <Button
          onClick={() => setLeftPanelMode('structure')}
          size='icon'
          variant='ghost'
          className={`h-6 w-6 p-0 ${
            leftPanelMode === 'structure'
              ? 'text-blue-300 hover:text-blue-200'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          title='Structure'
          aria-label='Structure'
        >
          <Workflow className='size-3.5' />
        </Button>
      )}

      <Button
        onClick={() => setLeftPanelMode('theme')}
        size='icon'
        variant='ghost'
        className={`h-6 w-6 p-0 ${
          leftPanelMode === 'theme'
            ? 'text-blue-300 hover:text-blue-200'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title={isKangur ? 'Theme' : 'Theme settings'}
        aria-label={isKangur ? 'Theme' : 'Theme settings'}
      >
        <Settings className='size-3.5' />
      </Button>
      <Button
        onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
        size='icon'
        variant='ghost'
        className='h-6 w-6 p-0 text-gray-500 hover:text-gray-300'
        aria-label='Hide left panel'
        title={'Hide left panel'}>
        <PanelLeftClose className='size-3.5' />
      </Button>
    </div>
  );

  const leftPanelLabel = React.useMemo(() => {
    if (leftPanelMode === 'sections') return 'Sections';
    if (leftPanelMode === 'structure') return 'Structure';
    if (leftPanelMode === 'theme') return isKangur ? 'Theme' : 'Theme settings';
    if (leftPanelMode === 'menu') return 'Menu settings';
    if (leftPanelMode === 'app-embeds') return 'App embeds';
    return 'Panel';
  }, [leftPanelMode, isKangur]);

  React.useEffect((): void => {
    onModeChange?.(leftPanelMode);
  }, [leftPanelMode, onModeChange]);

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
          actions={headerActions}
        />
        {(leftPanelMode === 'sections' || leftPanelMode === 'structure') && <ComponentTreePanel />}
        {leftPanelMode === 'theme' &&
          (themePanel ?? <ThemeSettingsPanel showHeader={false} />)}
        {leftPanelMode === 'menu' && <MenuSettingsPanel showHeader={false} />}
        {leftPanelMode === 'app-embeds' && <AppEmbedsPanel showHeader={false} />}
      </div>
    </div>
  );
}
