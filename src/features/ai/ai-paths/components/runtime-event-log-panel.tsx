'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiPathRuntimeEvent, AiPathRunEventLevel } from '@/shared/lib/ai-paths';
import { Button, StatusBadge, SelectSimple, Card } from '@/shared/ui';

import { useRuntimeState, useRuntimeActions } from '../context';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { RuntimeEventEntry } from './runtime-event-entry';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RuntimeEventLevelFilter = NonNullable<AiPathRunEventLevel> | 'all';

const LEVEL_OPTIONS: Array<LabeledOptionDto<RuntimeEventLevelFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  } catch (error) {
    logClientError(error);
    return iso;
  }
}

type RuntimeEventLogActionButtonProps = Pick<
  React.ComponentProps<typeof Button>,
  'children' | 'disabled' | 'onClick' | 'title'
>;

type RuntimeEventLogCountBadgeProps = {
  count: number;
  label: string;
  variant: React.ComponentProps<typeof StatusBadge>['variant'];
};

type RuntimeEventLogEventRowProps = {
  event: AiPathRuntimeEvent;
};

function RuntimeEventLogActionButton({
  children,
  disabled,
  onClick,
  title,
}: RuntimeEventLogActionButtonProps): React.JSX.Element {
  return (
    <Button
      type='button'
      className='rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-card/70'
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}

function RuntimeEventLogCountBadge({
  count,
  label,
  variant,
}: RuntimeEventLogCountBadgeProps): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <StatusBadge status={`${count} ${label}`} variant={variant} size='sm' className='font-bold h-4' />
  );
}

function RuntimeEventLogEventRow({
  event,
}: RuntimeEventLogEventRowProps): React.JSX.Element {
  return (
    <RuntimeEventEntry
      timestamp={formatTime(event.timestamp)}
      level={event.level}
      kind={event.kind}
      message={event.message}
      className='flex items-start gap-2 rounded px-2 py-1 text-[11px] hover:bg-card/70'
      timeClassName='shrink-0 text-gray-500'
      levelClassName='mt-[5px] size-1.5 min-w-0 rounded-full p-0'
      kindClassName='h-4 px-1 font-mono'
      hideLevelLabel
      trailingMetadata={
        event.source === 'server' ? (
          <StatusBadge status='server' variant='processing' size='sm' className='h-4 px-1' />
        ) : null
      }
      inlinePrefix={
        event.nodeTitle ? <span className='shrink-0 text-gray-300'>[{event.nodeTitle}]</span> : null
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RuntimeEventLogPanel(): React.JSX.Element {
  const { runtimeEvents } = useRuntimeState();
  const { clearRuntimeEvents } = useRuntimeActions();

  const [collapsed, setCollapsed] = useState(true);
  const [levelFilter, setLevelFilter] = useState<RuntimeEventLevelFilter>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const filteredEvents = useMemo(
    (): AiPathRuntimeEvent[] =>
      levelFilter === 'all' ? runtimeEvents : runtimeEvents.filter((e) => e.level === levelFilter),
    [runtimeEvents, levelFilter]
  );

  // Auto-scroll to bottom when new events arrive (unless user scrolled up)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUpRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredEvents.length]);

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    userScrolledUpRef.current = !atBottom;
  }, []);

  const handleExport = useCallback((): void => {
    const blob = new Blob([JSON.stringify(runtimeEvents, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runtime-events-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [runtimeEvents]);

  const errorCount = useMemo(
    () => runtimeEvents.filter((e) => e.level === 'error').length,
    [runtimeEvents]
  );

  const warningCount = useMemo(
    () => runtimeEvents.filter((e) => e.level === 'warn').length,
    [runtimeEvents]
  );
  const summaryBadges: RuntimeEventLogCountBadgeProps[] = [
    { count: errorCount, label: 'err', variant: 'error' },
    { count: warningCount, label: 'warn', variant: 'warning' },
  ];

  return (
    <Card variant='subtle-compact' padding='none' className='bg-card/50'>
      {/* Header */}
      <div className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='text-xs text-gray-400 hover:text-white'
            onClick={() => setCollapsed((p) => !p)}
            title={collapsed ? 'Expand event log' : 'Collapse event log'}
            aria-label={collapsed ? 'Expand event log' : 'Collapse event log'}>
            <svg
              className={`h-3 w-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              viewBox='0 0 16 16'
              fill='currentColor'
            >
              <path d='M6 4l4 4-4 4' />
            </svg>
          </button>
          <span className='text-xs font-medium text-white'>Runtime Events</span>
          <span data-doc-id='runtime_events_count' className='text-[10px] text-gray-500'>
            {runtimeEvents.length}
          </span>
          {summaryBadges.map((badge) => (
            <RuntimeEventLogCountBadge
              key={badge.label}
              count={badge.count}
              label={badge.label}
              variant={badge.variant}
            />
          ))}
        </div>
        <div className='flex items-center gap-1.5'>
          {/* Level filter */}
          <SelectSimple
            size='xs'
            value={levelFilter}
            onValueChange={(value) => setLevelFilter(value as RuntimeEventLevelFilter)}
            options={LEVEL_OPTIONS}
           ariaLabel='Event level filter'
            triggerClassName='h-6 min-w-[70px] px-2 bg-transparent border-border/40 text-[10px]'
           title='Select option'/>
          {/* Export */}
          <RuntimeEventLogActionButton
            onClick={handleExport}
            disabled={runtimeEvents.length === 0}
            title='Export events as JSON'
          >
            Export
          </RuntimeEventLogActionButton>
          {/* Clear */}
          <RuntimeEventLogActionButton
            onClick={clearRuntimeEvents}
            disabled={runtimeEvents.length === 0}
            title='Clear all events'
          >
            Clear
          </RuntimeEventLogActionButton>
        </div>
      </div>

      {/* Event list */}
      {!collapsed && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className='max-h-[200px] overflow-y-auto p-2 space-y-0.5'
        >
          {filteredEvents.length === 0 ? (
            <div className='py-4 text-center text-[11px] text-gray-500'>
              No events{levelFilter !== 'all' ? ` matching "${levelFilter}"` : ''}
            </div>
          ) : (
            filteredEvents.map((event) => <RuntimeEventLogEventRow key={event.id} event={event} />)
          )}
        </div>
      )}
    </Card>
  );
}
