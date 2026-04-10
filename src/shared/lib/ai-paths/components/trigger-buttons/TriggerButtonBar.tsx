'use client';

import { MoreHorizontal, Settings2 } from 'lucide-react';
import React from 'react';

import type {
  AiTriggerButtonLocation,
  AiTriggerButtonRecord,
} from '@/shared/contracts/ai-trigger-buttons';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { ActionMenu, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DropdownMenuItem, Tooltip } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';

import { type TriggerButtonLastRun, useTriggerButtons } from '../../hooks/useTriggerButtons';
import { resolveTriggerButtonRunFeedbackPresentation } from '../../trigger-button-run-feedback';

type TriggerButtonBarProps = {
  location: AiTriggerButtonLocation;
  entityType: 'product' | 'note' | 'custom';
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
  disabled?: boolean | undefined;
  showRunFeedback?: boolean | undefined;
  onRunQueued?:
    | ((args: {
        button: AiTriggerButtonRecord;
        runId: string;
        entityId?: string | null | undefined;
        entityType: 'product' | 'note' | 'custom';
      }) => void)
    | undefined;
  className?: string;
};

type TriggerButtonToggleRuntimeValue = {
  label: string;
  showLabel: boolean;
  isRunning: boolean;
  disabled: boolean;
  progress: number;
  checked: boolean;
  iconNode: React.ReactNode;
  onCheckedChange: (nextChecked: boolean) => void;
};

const {
  Context: TriggerButtonToggleRuntimeContext,
  useStrictContext: useTriggerButtonToggleRuntime,
} = createStrictContext<TriggerButtonToggleRuntimeValue>({
  hookName: 'useTriggerButtonToggleRuntime',
  providerName: 'TriggerButtonToggleRuntimeContext.Provider',
  displayName: 'TriggerButtonToggleRuntimeContext',
});
const PRODUCT_RUN_FEEDBACK_LOCATIONS = new Set<AiTriggerButtonLocation>([
  'product_row',
  'product_modal',
]);
const COMPACT_TRIGGER_BUTTON_INLINE_LIMITS: Partial<Record<AiTriggerButtonLocation, number>> = {
  product_row: 1,
  product_list: 1,
  product_list_header: 1,
};

const truncateMiddle = (value: string, start = 8, end = 6): string => {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const resolveCompactInlineLimit = (location: AiTriggerButtonLocation): number | null =>
  COMPACT_TRIGGER_BUTTON_INLINE_LIMITS[location] ?? null;

const resolveInlineRunProgressScale = (progress: number): number =>
  Math.max(0.14, Math.min(1, progress));

const resolveRunRecency = (run: TriggerButtonLastRun): number => {
  const timestamp = Date.parse(run.updatedAt ?? run.finishedAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const resolveRunTimestamp = (run: TriggerButtonLastRun): Date | null => {
  const timestamp = Date.parse(run.finishedAt ?? run.updatedAt ?? '');
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp);
};

const formatRunTimestampLabel = (run: TriggerButtonLastRun, now = Date.now()): string | null => {
  const timestamp = resolveRunTimestamp(run);
  if (!timestamp) return null;

  const elapsedMs = Math.max(0, now - timestamp.getTime());
  if (elapsedMs < 60_000) return 'Just now';

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
};

function ErrorDetailDialog({
  errorMessage,
  messageClassName,
}: {
  errorMessage: string;
  messageClassName: string;
}): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const preview = errorMessage.length > 60 ? `${errorMessage.slice(0, 60)}…` : errorMessage;

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(errorMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type='button'
          className={cn('min-w-0 truncate text-left hover:underline', messageClassName)}
          title='Click to see full error'
        >
          {preview}
        </button>
      </DialogTrigger>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle className='text-sm'>Run Error Detail</DialogTitle>
          <DialogDescription className='sr-only'>Full error message from the AI Path run</DialogDescription>
        </DialogHeader>
        <pre className='max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-900 p-3 font-mono text-[11px] text-red-300'>
          {errorMessage}
        </pre>
        <button
          type='button'
          onClick={handleCopy}
          className='self-start text-[11px] text-blue-300 hover:text-blue-200'
          aria-label='Copy error'
        >
          {copied ? 'Copied!' : 'Copy error'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function TriggerRunFeedback(props: {
  location: AiTriggerButtonLocation;
  run: TriggerButtonLastRun;
}): React.JSX.Element {
  const { location, run } = props;
  const presentation = resolveTriggerButtonRunFeedbackPresentation(run.status);
  const queueHref = `/admin/ai-paths/queue?tab=paths-all&query=${encodeURIComponent(run.runId)}&runId=${encodeURIComponent(run.runId)}&status=all`;
  const messageClassName =
    run.status === 'failed' || run.status === 'dead_lettered'
      ? 'text-amber-200'
      : 'text-gray-400';
  const summaryWidthClassName = location === 'product_row' ? 'max-w-[220px]' : 'max-w-[320px]';
  const timestamp = resolveRunTimestamp(run);
  const timestampLabel = formatRunTimestampLabel(run);
  const showQueueLink = run.status !== 'waiting';

  return (
    <div
      aria-live='polite'
      role='status'
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[10px] text-gray-300 backdrop-blur-sm',
        summaryWidthClassName
      )}
      data-run-id={run.runId}
    >
      <StatusBadge
        status={run.status}
        label={presentation.label}
        variant={presentation.variant}
        size='sm'
        className={cn('shrink-0', presentation.badgeClassName)}
      />
      {showQueueLink ? (
        <span
          className='shrink-0 font-mono text-[9px] text-gray-400'
          title={run.runId}
        >
          {truncateMiddle(run.runId)}
        </span>
      ) : null}
      {run.errorMessage ? (
        <ErrorDetailDialog errorMessage={run.errorMessage} messageClassName={messageClassName} />
      ) : null}
      {showQueueLink ? (
        <a
          href={queueHref}
          className='shrink-0 text-blue-300 underline underline-offset-2 hover:text-blue-200'
        >
          Job Queue
        </a>
      ) : null}
      {timestampLabel ? (
        <span
          className='shrink-0 text-[9px] text-gray-500'
          title={timestamp?.toLocaleString() ?? undefined}
        >
          {timestampLabel}
        </span>
      ) : null}
    </div>
  );
}

function TriggerButtonToggleControl(): React.JSX.Element {
  const { label, showLabel, isRunning, disabled, progress, checked, iconNode, onCheckedChange } =
    useTriggerButtonToggleRuntime();
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        isRunning ? 'cursor-wait' : null,
        disabled && !isRunning ? 'opacity-60' : null
      )}
    >
      {isRunning ? (
        <span
          aria-hidden
          className='pointer-events-none absolute inset-0 z-0 origin-left bg-emerald-500/10 transition-transform duration-200 ease-linear'
          style={{
            transform: `scaleX(${resolveInlineRunProgressScale(progress)})`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <ToggleRow
        label={showLabel ? label : ''}
        icon={iconNode}
        checked={checked}
        disabled={isRunning || disabled}
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
  disabled,
  showRunFeedback,
  onRunQueued,
  className,
}: TriggerButtonBarProps): React.JSX.Element | null {
  const { buttons, toggleMap, successMap, runStates, lastRuns, handleTrigger } = useTriggerButtons({
    location,
    entityType,
    entityId,
    getEntityJson,
    onRunQueued,
  });
  const feedbackLocation = location;
  const shouldShowRunFeedback =
    showRunFeedback ?? (entityType === 'product' && PRODUCT_RUN_FEEDBACK_LOCATIONS.has(location));
  const compactInlineLimit = resolveCompactInlineLimit(location);
  const barClassName = cn('flex flex-wrap items-center gap-2', className);

  if (buttons.length === 0) return null;

  const visibleButtons =
    compactInlineLimit === null ? buttons : buttons.slice(0, compactInlineLimit);
  const overflowButtons =
    compactInlineLimit === null ? [] : buttons.slice(compactInlineLimit);
  const overflowTrigger = (
    <span className='inline-flex items-center gap-1'>
      <MoreHorizontal className='size-3.5' aria-hidden='true' />
      <span>+{overflowButtons.length}</span>
    </span>
  );
  const latestOverflowRun = shouldShowRunFeedback
    ? overflowButtons
      .map((button) => lastRuns[button.id] ?? null)
      .filter((run): run is TriggerButtonLastRun => Boolean(run))
      .sort((left, right) => resolveRunRecency(right) - resolveRunRecency(left))[0] ?? null
    : null;

  const renderButtonIcon = (
    button: AiTriggerButtonRecord,
    showLabel: boolean,
    textOpacity: number
  ): React.ReactNode => {
    const Icon = button.iconId ? ICON_LIBRARY_MAP[button.iconId] : null;
    if (Icon) {
      return (
        <Icon
          className={cn(showLabel ? 'relative z-10 size-4' : 'size-4 text-gray-200')}
          style={{ opacity: showLabel ? 1 : textOpacity }}
        />
      );
    }
    return (
      <Settings2
        className={cn(showLabel ? 'relative z-10 size-4' : 'size-4 text-gray-500')}
        style={{ opacity: showLabel ? 1 : textOpacity }}
      />
    );
  };

  const renderInlineButton = (button: AiTriggerButtonRecord): React.JSX.Element => {
    const showLabel = button.display.showLabel !== false;
    const runState = runStates[button.id];
    const isRunning = runState?.status === 'running';
    const progress = isRunning ? Math.max(0, Math.min(1, runState?.progress ?? 0)) : 0;
    const hasSucceeded = Boolean(successMap[button.id]);
    const baseOpacity = hasSucceeded ? 1 : 0.7;
    const textOpacity = isRunning ? baseOpacity + (1 - baseOpacity) * progress : baseOpacity;
    const iconNode = button.iconId ? (
      (() => {
        const Icon = ICON_LIBRARY_MAP[button.iconId];
        return Icon ? (
          <Icon className='size-4 text-gray-200' style={{ opacity: textOpacity }} />
        ) : (
          <Settings2 className='size-4 text-gray-500' style={{ opacity: textOpacity }} />
        );
      })()
    ) : (
      <Settings2 className='size-4 text-gray-500' style={{ opacity: textOpacity }} />
    );

    if (button.mode === 'toggle') {
      const checked = Boolean(toggleMap[button.id]);
      const toggleControl = (
        <TriggerButtonToggleRuntimeContext.Provider
          value={{
            label: button.name,
            showLabel,
            isRunning,
            disabled: Boolean(disabled),
            progress,
            checked,
            iconNode,
            onCheckedChange: (nextChecked: boolean) => {
              if (disabled) return;
              void handleTrigger(button, { mode: 'toggle', checked: nextChecked });
            },
          }}
        >
          <TriggerButtonToggleControl />
        </TriggerButtonToggleRuntimeContext.Provider>
      );
      const control = !showLabel ? (
        <Tooltip content={button.name}>{toggleControl}</Tooltip>
      ) : (
        toggleControl
      );
      const lastRun = shouldShowRunFeedback ? lastRuns[button.id] : undefined;
      return (
        <div key={button.id} className='inline-flex min-w-0 flex-wrap items-center gap-2'>
          {control}
          {lastRun ? <TriggerRunFeedback location={feedbackLocation} run={lastRun} /> : null}
        </div>
      );
    }

    const clickControl = (
      <Button
        key={button.id}
        variant='outline'
        size={showLabel ? 'xs' : 'icon'}
        aria-label={button.name}
        aria-busy={isRunning || undefined}
        loading={isRunning}
        disabled={Boolean(disabled)}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (disabled) return;
          void handleTrigger(button, { mode: 'click', event });
        }}
        className={cn(
          'relative overflow-hidden text-gray-200',
          showLabel ? 'gap-2' : null,
          isRunning ? 'border-emerald-500/40 bg-emerald-500/10 disabled:opacity-100' : null,
          disabled && !isRunning ? 'opacity-60' : null,
          isRunning ? 'cursor-wait' : null
        )}
      >
        {isRunning ? (
          <span
            aria-hidden
            className='pointer-events-none absolute inset-0 z-0 origin-left bg-emerald-500/10 transition-transform duration-200 ease-linear'
            style={{ transform: `scaleX(${resolveInlineRunProgressScale(progress)})` }}
          />
        ) : null}
        {renderButtonIcon(button, showLabel, textOpacity)}
        {showLabel ? (
          <span
            className='relative z-10 max-w-[160px] truncate transition-opacity duration-200 ease-linear'
            style={{ opacity: textOpacity }}
          >
            {button.name}
          </span>
        ) : null}
        {showLabel && isRunning ? (
          <span className='relative z-10 shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-50'>
            Running...
          </span>
        ) : null}
      </Button>
    );

    const control = !showLabel ? <Tooltip content={button.name}>{clickControl}</Tooltip> : clickControl;
    const lastRun = shouldShowRunFeedback ? lastRuns[button.id] : undefined;

    return (
      <div key={button.id} className='inline-flex min-w-0 flex-wrap items-center gap-2'>
        {control}
        {lastRun ? <TriggerRunFeedback location={feedbackLocation} run={lastRun} /> : null}
      </div>
    );
  };

  const renderOverflowItem = (button: AiTriggerButtonRecord): React.JSX.Element => {
    const runState = runStates[button.id];
    const isRunning = runState?.status === 'running';
    const checked = Boolean(toggleMap[button.id]);
    const lastRun = lastRuns[button.id];

    return (
      <DropdownMenuItem
        key={button.id}
        onSelect={(event: Event) => {
          event.preventDefault();
          if (disabled) return;
          if (button.mode === 'toggle') {
            void handleTrigger(button, { mode: 'toggle', checked: !checked });
            return;
          }
          void handleTrigger(button, { mode: 'click' });
        }}
        className='flex min-w-[220px] items-center gap-2'
      >
        <span className='shrink-0'>{renderButtonIcon(button, false, 1)}</span>
        <span className='min-w-0 flex-1 truncate'>{button.name}</span>
        {button.mode === 'toggle' ? (
          <span className='shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground'>
            {checked ? 'On' : 'Off'}
          </span>
        ) : null}
        {isRunning ? (
          <span className='shrink-0 text-[10px] uppercase tracking-wide text-emerald-300'>
            Running
          </span>
        ) : lastRun ? (
          <span className='shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground'>
            {resolveTriggerButtonRunFeedbackPresentation(lastRun.status).label}
          </span>
        ) : null}
      </DropdownMenuItem>
    );
  };

  return (
    <div className={barClassName}>
      {visibleButtons.map(renderInlineButton)}
      {overflowButtons.length > 0 ? (
        <div className='inline-flex min-w-0 flex-wrap items-center gap-2'>
          <ActionMenu
            align='end'
            size='icon'
            variant='outline'
            ariaLabel={`Open ${overflowButtons.length} more AI actions`}
            triggerClassName='h-7 min-w-7 px-1.5 text-[10px] font-semibold text-gray-200'
            trigger={overflowTrigger}
          >
            {overflowButtons.map(renderOverflowItem)}
          </ActionMenu>
          {latestOverflowRun ? (
            <TriggerRunFeedback location={feedbackLocation} run={latestOverflowRun} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
