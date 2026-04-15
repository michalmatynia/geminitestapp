'use client';

import React from 'react';

import { type PanelAction } from '@/shared/contracts/ui/panels';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button } from '@/shared/ui/button';
import { RefreshButton } from '@/shared/ui/RefreshButton';
import { cn } from '@/shared/utils/ui-utils';
import { logSystemEvent } from '@/shared/lib/observability/system-logger-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  UI_STACK_RELAXED_CLASSNAME,
  UI_START_ROW_SPACED_CLASSNAME,
} from '@/shared/ui/layout';


interface PanelHeaderProps {
  title: string;
  titleLevel?: 1 | 2 | 3;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  refreshable?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  actions?: PanelAction[];
  customActions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

type PanelHeaderRuntimeValue = {
  actions: PanelAction[];
  isRefreshing: boolean;
  refreshable: boolean;
  onRefresh?: () => void | Promise<void>;
};

const PANEL_HEADER_TITLE_TAG_BY_LEVEL = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
} as const;

const {
  Context: PanelHeaderRuntimeContext,
  useStrictContext: usePanelHeaderRuntime,
} = createStrictContext<PanelHeaderRuntimeValue>({
  hookName: 'usePanelHeaderRuntime',
  providerName: 'PanelHeaderRuntimeContext.Provider',
  displayName: 'PanelHeaderRuntimeContext',
});

function PanelHeaderStandardActions(): React.JSX.Element | null {
  const { actions, isRefreshing } = usePanelHeaderRuntime();
  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant || 'outline'}
          size='sm'
          onClick={() => {
            void action.onClick();
          }}
          disabled={action.disabled || isRefreshing}
          title={action.tooltip}
          className='h-8'
        >
          {action.icon && <span className='mr-1'>{action.icon}</span>}
          {action.label}
        </Button>
      ))}
    </>
  );
}

function PanelHeaderRefreshAction(): React.JSX.Element | null {
  const { refreshable, onRefresh, isRefreshing } = usePanelHeaderRuntime();
  if (!refreshable || !onRefresh) return null;

  const handleRefresh = async (): Promise<void> => {
    try {
      await onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'PanelHeader',
        action: 'refresh',
        level: 'warn',
      });
      void logSystemEvent({
        level: 'error',
        source: 'PanelHeader',
        message: 'Refresh action failed',
        error,
      });
    }
  };

  return (
    <RefreshButton
      onRefresh={() => void handleRefresh()}
      isRefreshing={isRefreshing}
      label=''
      size='icon'
      className='h-8 w-8'
    />
  );
}

/**
 * PanelHeader - Renders panel header with title, description, and action buttons.
 * Refactored to leverage centralized RefreshButton and consistent action styling.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  titleLevel = 2,
  description,
  subtitle,
  icon,
  refreshable = true,
  isRefreshing = false,
  onRefresh,
  actions = [],
  customActions,
  className,
  compact = false,
}) => {
  const TitleTag = PANEL_HEADER_TITLE_TAG_BY_LEVEL[titleLevel];
  const runtimeValue = React.useMemo(
    () => ({ actions, isRefreshing, refreshable, onRefresh }),
    [actions, isRefreshing, refreshable, onRefresh]
  );

  return (
    <div
      className={cn(
        UI_STACK_RELAXED_CLASSNAME,
        'rounded-lg border border-border/60 bg-card/40 px-4 py-3',
        compact && 'py-2',
        className
      )}
    >
      {/* Title and Description Section */}
      <div className={UI_START_ROW_SPACED_CLASSNAME}>
        {icon && (
          <div className='mt-1 flex h-8 w-8 items-center justify-center rounded-md bg-muted/40 text-muted-foreground'>
            {icon}
          </div>
        )}
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <TitleTag className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
              {title}
            </TitleTag>
            {subtitle && (
              <span className='text-xs text-muted-foreground font-medium'>{subtitle}</span>
            )}
          </div>
          {description ? (
            <div className='mt-1 text-xs text-muted-foreground'>{description}</div>
          ) : null}
        </div>
      </div>

      {/* Actions Section */}
      {(actions.length > 0 || refreshable || customActions) && (
        <div className='flex flex-wrap items-center gap-2 pt-2 border-t border-border/50'>
          <PanelHeaderRuntimeContext.Provider value={runtimeValue}>
            {/* Custom Actions Slot */}
            {customActions}

            {/* Standard Actions */}
            <PanelHeaderStandardActions />

            {/* Refresh Button */}
            <PanelHeaderRefreshAction />
          </PanelHeaderRuntimeContext.Provider>
        </div>
      )}
    </div>
  );
};

PanelHeader.displayName = 'PanelHeader';
