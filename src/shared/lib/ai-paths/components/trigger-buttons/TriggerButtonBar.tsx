'use client';

import { Settings2 } from 'lucide-react';
import React from 'react';

import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import type {
  AiTriggerButtonLocation,
  AiTriggerButtonRecord,
} from '@/shared/contracts/ai-trigger-buttons';
import { Button, ToggleRow, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useTriggerButtons } from '../../hooks/useTriggerButtons';

type TriggerButtonBarProps = {
  location: AiTriggerButtonLocation;
  entityType: 'product' | 'note' | 'custom';
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
  className?: string;
};

type TriggerButtonToggleRuntimeValue = {
  label: string;
  showLabel: boolean;
  isRunning: boolean;
  progress: number;
  checked: boolean;
  iconNode: React.ReactNode;
  onCheckedChange: (nextChecked: boolean) => void;
};

const TriggerButtonToggleRuntimeContext =
  React.createContext<TriggerButtonToggleRuntimeValue | null>(null);

function useTriggerButtonToggleRuntime(): TriggerButtonToggleRuntimeValue {
  const runtime = React.useContext(TriggerButtonToggleRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useTriggerButtonToggleRuntime must be used within TriggerButtonToggleRuntimeContext.Provider'
    );
  }
  return runtime;
}

function TriggerButtonToggleControl(): React.JSX.Element {
  const { label, showLabel, isRunning, progress, checked, iconNode, onCheckedChange } =
    useTriggerButtonToggleRuntime();
  return (
    <div className={cn('relative overflow-hidden rounded-lg', isRunning ? 'cursor-wait' : null)}>
      {isRunning ? (
        <span
          aria-hidden
          className='pointer-events-none absolute inset-0 z-0 origin-left bg-emerald-500/10 transition-transform duration-200 ease-linear'
          style={{
            transform: `scaleX(${Math.max(0.02, progress)})`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <ToggleRow
        label={showLabel ? label : ''}
        icon={iconNode}
        checked={checked}
        disabled={isRunning}
        onCheckedChange={onCheckedChange}
        className='relative z-10 border-border bg-card/40 px-2 py-1'
      />
    </div>
  );
}

export function TriggerButtonBar({
  location,
  entityType,
  entityId,
  getEntityJson,
  className,
}: TriggerButtonBarProps): React.JSX.Element | null {
  const { buttons, toggleMap, successMap, runStates, handleTrigger } = useTriggerButtons({
    location,
    entityType,
    entityId,
    getEntityJson,
  });

  if (buttons.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {buttons.map((button: AiTriggerButtonRecord) => {
        const Icon = button.iconId ? ICON_LIBRARY_MAP[button.iconId] : null;
        const showLabel = button.display.showLabel !== false;
        const runState = runStates[button.id];
        const isRunning = runState?.status === 'running';
        const progress = isRunning ? Math.max(0, Math.min(1, runState?.progress ?? 0)) : 0;
        const hasSucceeded = Boolean(successMap[button.id]);
        const baseOpacity = hasSucceeded ? 1 : 0.7;
        const textOpacity = isRunning ? baseOpacity + (1 - baseOpacity) * progress : baseOpacity;
        const iconNode = Icon ? (
          <Icon className='size-4 text-gray-200' style={{ opacity: textOpacity }} />
        ) : (
          <Settings2 className='size-4 text-gray-500' style={{ opacity: textOpacity }} />
        );

        if (button.mode === 'toggle') {
          const checked = Boolean(toggleMap[button.id]);
          const toggleControl = (
            <TriggerButtonToggleRuntimeContext.Provider
              key={button.id}
              value={{
                label: button.name,
                showLabel,
                isRunning,
                progress,
                checked,
                iconNode,
                onCheckedChange: (nextChecked: boolean) => {
                  void handleTrigger(button, { mode: 'toggle', checked: nextChecked });
                },
              }}
            >
              <TriggerButtonToggleControl />
            </TriggerButtonToggleRuntimeContext.Provider>
          );

          if (!showLabel) {
            return (
              <Tooltip key={button.id} content={button.name}>
                {toggleControl}
              </Tooltip>
            );
          }

          return toggleControl;
        }

        const clickControl = (
          <Button
            key={button.id}
            variant='outline'
            size={showLabel ? 'xs' : 'icon'}
            aria-label={button.name}
            disabled={isRunning}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              void handleTrigger(button, { mode: 'click', event });
            }}
            className={cn(
              'relative overflow-hidden text-gray-200',
              showLabel ? 'gap-2' : null,
              isRunning ? 'cursor-wait' : null
            )}
          >
            {isRunning ? (
              <span
                aria-hidden
                className='pointer-events-none absolute inset-0 z-0 origin-left bg-emerald-500/10 transition-transform duration-200 ease-linear'
                style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
              />
            ) : null}
            {Icon ? (
              <Icon
                className='relative z-10 size-4'
                style={{ opacity: showLabel ? 1 : textOpacity }}
              />
            ) : (
              <Settings2
                className='relative z-10 size-4'
                style={{ opacity: showLabel ? 1 : textOpacity }}
              />
            )}
            {showLabel ? (
              <span
                className='relative z-10 max-w-[160px] truncate transition-opacity duration-200 ease-linear'
                style={{ opacity: textOpacity }}
              >
                {button.name}
              </span>
            ) : null}
          </Button>
        );

        if (!showLabel) {
          return (
            <Tooltip key={button.id} content={button.name}>
              {clickControl}
            </Tooltip>
          );
        }

        return clickControl;
      })}
    </div>
  );
}
