'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AiPathRuntimeEvent, AiPathRuntimeEventLevel } from '@/features/ai/ai-paths/lib';
import { Button, StatusBadge } from '@/shared/ui';

import { useRuntimeState, useRuntimeActions } from '../context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEVEL_OPTIONS: { value: AiPathRuntimeEventLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
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
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RuntimeEventLogPanel(): React.JSX.Element {
  const { runtimeEvents } = useRuntimeState();
  const { clearRuntimeEvents } = useRuntimeActions();

  const [collapsed, setCollapsed] = useState(true);
  const [levelFilter, setLevelFilter] = useState<AiPathRuntimeEventLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const filteredEvents = useMemo(
    (): AiPathRuntimeEvent[] =>
      levelFilter === 'all'
        ? runtimeEvents
        : runtimeEvents.filter((e) => e.level === levelFilter),
    [runtimeEvents, levelFilter],
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
    [runtimeEvents],
  );

  const warningCount = useMemo(
    () => runtimeEvents.filter((e) => e.level === 'warning').length,
    [runtimeEvents],
  );

  return (
    <div className='rounded-lg border border-border/60 bg-card/50'>
      {/* Header */}
      <div className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='text-xs text-gray-400 hover:text-white'
            onClick={() => setCollapsed((p) => !p)}
            title={collapsed ? 'Expand event log' : 'Collapse event log'}
          >
            <svg
              className={`h-3 w-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              viewBox='0 0 16 16'
              fill='currentColor'
            >
              <path d='M6 4l4 4-4 4' />
            </svg>
          </button>
          <span className='text-xs font-medium text-white'>Runtime Events</span>
          <span className='text-[10px] text-gray-500'>{runtimeEvents.length}</span>
          {errorCount > 0 && (
            <StatusBadge status={`${errorCount} err`} variant='error' size='sm' className='font-bold h-4' />
          )}
          {warningCount > 0 && (
            <StatusBadge status={`${warningCount} warn`} variant='warning' size='sm' className='font-bold h-4' />
          )}
        </div>
        <div className='flex items-center gap-1.5'>
          {/* Level filter */}
          <select
            className='rounded border border-border/40 bg-transparent px-1.5 py-0.5 text-[10px] text-gray-300 outline-none'
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value as AiPathRuntimeEventLevel | 'all')
            }
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Export */}
          <Button
            type='button'
            className='rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-card/70'
            onClick={handleExport}
            disabled={runtimeEvents.length === 0}
            title='Export events as JSON'
          >
            Export
          </Button>
          {/* Clear */}
          <Button
            type='button'
            className='rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-card/70'
            onClick={clearRuntimeEvents}
            disabled={runtimeEvents.length === 0}
            title='Clear all events'
          >
            Clear
          </Button>
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
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className='flex items-start gap-2 rounded px-2 py-1 text-[11px] hover:bg-card/70'
              >
                <span className='shrink-0 text-gray-500'>{formatTime(event.timestamp)}</span>
                <StatusBadge 
                  status='' 
                  variant={event.level === 'error' ? 'error' : event.level === 'warning' ? 'warning' : 'neutral'} 
                  size='sm' 
                  hideLabel 
                  className='mt-[5px] size-1.5 min-w-0 p-0 rounded-full' 
                />
                <StatusBadge 
                  status={event.kind} 
                  variant={event.kind.startsWith('run_') ? 'info' : event.kind.startsWith('node_') ? 'success' : 'neutral'} 
                  size='sm' 
                  className='h-4 px-1 font-mono' 
                />
                {event.source === 'server' && (
                  <StatusBadge status='server' variant='processing' size='sm' className='h-4 px-1' />
                )}
                {event.nodeTitle && (
                  <span className='shrink-0 text-gray-300'>[{event.nodeTitle}]</span>
                )}
                <span className='truncate text-gray-200'>{event.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
