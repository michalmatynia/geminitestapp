'use client';

import React, { useMemo, useState } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';
import { Button, Card, SelectSimple } from '@/shared/ui';

import {
  type UseAiPathsObjectAnalysisReturn,
  type AiPathsObjectAnalysisStatus,
} from '../../../hooks/useAiPathsObjectAnalysis';
import type { AiPathsObjectAnalysisAutoApplyTarget } from '@/features/ai/image-studio/utils/ai-paths-object-analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiPathAnalysisTriggerSectionProps {
  variant: 'full' | 'compact';
  analysis?: UseAiPathsObjectAnalysisReturn;
}

const {
  Context: AiPathAnalysisTriggerContext,
  useStrictContext: useAiPathAnalysisTriggerContext,
  useOptionalContext: useOptionalAiPathAnalysisTriggerContext,
} = createStrictContext<UseAiPathsObjectAnalysisReturn>({
  hookName: 'useAiPathAnalysisTriggerContext',
  providerName: 'AiPathAnalysisTriggerProvider',
  displayName: 'AiPathAnalysisTriggerContext',
});

export function AiPathAnalysisTriggerProvider({
  value,
  children,
}: {
  value: UseAiPathsObjectAnalysisReturn;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AiPathAnalysisTriggerContext.Provider value={value}>
      {children}
    </AiPathAnalysisTriggerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Status display helpers
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<AiPathsObjectAnalysisStatus, string> = {
  idle: 'Idle',
  fetching_path: 'Loading path…',
  queuing: 'Queuing run…',
  running: 'Running analysis…',
  completed: 'Completed',
  error: 'Error',
};

const STATUS_COLOR: Record<AiPathsObjectAnalysisStatus, string> = {
  idle: 'text-gray-500',
  fetching_path: 'text-blue-400',
  queuing: 'text-blue-400',
  running: 'text-yellow-400',
  completed: 'text-green-400',
  error: 'text-red-400',
};

const isActive = (status: AiPathsObjectAnalysisStatus): boolean =>
  status === 'fetching_path' || status === 'queuing' || status === 'running';

// ---------------------------------------------------------------------------
// Auto-apply target options
// ---------------------------------------------------------------------------

const AUTO_APPLY_OPTIONS: Array<{ value: AiPathsObjectAnalysisAutoApplyTarget; label: string }> = [
  { value: 'both', label: 'Object Layout + Auto Scaler' },
  { value: 'object_layout', label: 'Object Layout only' },
  { value: 'auto_scaler', label: 'Auto Scaler only' },
  { value: 'none', label: 'Preview only (no tool apply)' },
];

// ---------------------------------------------------------------------------
// Field mapping row
// ---------------------------------------------------------------------------

function FieldMappingRow({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <span className='w-24 shrink-0 text-right text-[10px] text-gray-400'>{label}</span>
      <input
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-6 flex-1 rounded border border-border/60 bg-background/50 px-2',
          'text-xs text-gray-200 placeholder:text-gray-600',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full variant — shown in the Analysis tab
// ---------------------------------------------------------------------------

function AiPathAnalysisTriggerFull(): React.JSX.Element {
  const analysis = useAiPathAnalysisTriggerContext();
  const [fieldMappingOpen, setFieldMappingOpen] = useState(false);
  const {
    status,
    errorMessage,
    lastResult,
    config,
    pathMetas,
    pathMetasLoading,
    setConfig,
    triggerAnalysis,
    cancelAnalysis,
  } = analysis;

  const pathOptions = useMemo(
    () =>
      pathMetasLoading
        ? [{ value: '__loading__', label: 'Loading paths…', disabled: true }]
        : pathMetas.length === 0
          ? [{ value: '__empty__', label: 'No AI Paths found', disabled: true }]
          : pathMetas.map((m) => ({ value: m.id, label: m.name })),
    [pathMetas, pathMetasLoading]
  );

  const autoApplyOptions = useMemo(
    () => AUTO_APPLY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const busy = isActive(status);

  return (
    <div className='space-y-3'>
      <div>
        <div className='text-sm font-medium text-gray-200'>AI-Path Object Analysis</div>
        <div className='text-xs text-gray-500'>
          Trigger an AI-Path workflow (e.g. Gemma vision) to detect the object and centre it on the
          canvas. Configure your path in the AI-Paths feature, then select it here.
        </div>
      </div>

      {/* Path selector */}
      <div className='space-y-1'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>AI Path</div>
        <SelectSimple
          size='sm'
          value={config.pathId || undefined}
          onValueChange={(v) =>
            setConfig((prev) => ({
              ...prev,
              pathId: v === '__loading__' || v === '__empty__' ? '' : v,
            }))
          }
          options={pathOptions}
          placeholder='Select a path…'
          ariaLabel='AI Path for object analysis'
          disabled={busy}
        />
      </div>

      {/* Trigger button */}
      <div className='flex items-center gap-2'>
        {!busy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={() => void triggerAnalysis()}
            disabled={!config.pathId?.trim()}
          >
            Trigger AI Analysis
          </Button>
        ) : (
          <Button size='xs' type='button' variant='outline' onClick={cancelAnalysis}>
            Cancel
          </Button>
        )}

        <span className={cn('text-xs', STATUS_COLOR[status])}>
          {busy && (
            <span className='mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current' />
          )}
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <div className='rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400'>
          {errorMessage}
        </div>
      )}

      {/* Last result summary */}
      {lastResult && status === 'completed' && (
        <div className='rounded border border-green-900/40 bg-green-950/10 px-3 py-2 text-xs text-gray-400'>
          <div className='font-medium text-green-400'>Analysis complete</div>
          {lastResult.bounds && (
            <div className='mt-1 space-y-0.5 font-mono'>
              <div>
                Left: {Math.round(lastResult.bounds.left)}px &nbsp; Top:{' '}
                {Math.round(lastResult.bounds.top)}px
              </div>
              <div>
                Width: {Math.round(lastResult.bounds.width)}px &nbsp; Height:{' '}
                {Math.round(lastResult.bounds.height)}px
              </div>
            </div>
          )}
          {lastResult.appliedPreviewOffset && (
            <div className='mt-1 text-green-300'>Canvas repositioned to object centre.</div>
          )}
          {lastResult.appliedToTargets !== 'none' && (
            <div className='mt-0.5'>
              Applied layout to:{' '}
              <span className='text-gray-300'>{lastResult.appliedToTargets}</span>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      <div className='space-y-2'>
        {/* Apply preview offset toggle */}
        <label className='flex cursor-pointer items-center gap-2'>
          <input
            type='checkbox'
            checked={config.applyPreviewOffset}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, applyPreviewOffset: e.target.checked }))
            }
            className='h-3 w-3 rounded border-gray-600 accent-primary'
          />
          <span className='text-xs text-gray-400'>Reposition canvas preview to object centre</span>
        </label>

        {/* Run after apply toggle */}
        <label className='flex cursor-pointer items-center gap-2'>
          <input
            type='checkbox'
            checked={config.runAfterApply}
            onChange={(e) => setConfig((prev) => ({ ...prev, runAfterApply: e.target.checked }))}
            className='h-3 w-3 rounded border-gray-600 accent-primary'
          />
          <span className='text-xs text-gray-400'>Auto-run tool after applying settings</span>
        </label>

        {/* Auto-apply target */}
        <div className='space-y-1'>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>Apply results to</div>
          <SelectSimple
            size='sm'
            value={config.autoApplyTarget}
            onValueChange={(v) =>
              setConfig((prev) => ({
                ...prev,
                autoApplyTarget: v as AiPathsObjectAnalysisAutoApplyTarget,
              }))
            }
            options={autoApplyOptions}
            ariaLabel='Auto-apply target'
          />
        </div>
      </div>

      {/* Field mapping — collapsible */}
      <div className='border-t border-border/40 pt-2'>
        <button
          type='button'
          className='flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300'
          onClick={() => setFieldMappingOpen((o) => !o)}
        >
          <span>{fieldMappingOpen ? '▾' : '▸'}</span>
          Output Field Mapping
        </button>

        {fieldMappingOpen && (
          <div className='mt-2 space-y-2'>
            <div className='text-[10px] text-gray-600'>
              Enter dot-notation paths into your path's run.result (e.g.{' '}
              <code className='text-gray-400'>objectBounds.left</code>). Leave blank if using centre
              fields.
            </div>

            {/* Trigger node ID */}
            <FieldMappingRow
              label='Trigger Node'
              placeholder='node-id (optional)'
              value={config.triggerNodeId ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  triggerNodeId: v.trim() || undefined,
                }))
              }
            />

            {/* Trigger event */}
            <FieldMappingRow
              label='Trigger Event'
              placeholder='event name (optional)'
              value={config.triggerEvent ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  triggerEvent: v.trim() || undefined,
                }))
              }
            />

            <div className='border-t border-border/30 pt-2 text-[10px] text-gray-600'>
              Bounding box fields (in source image pixels):
            </div>

            <FieldMappingRow
              label='bounds.left'
              placeholder='e.g. objectBounds.left'
              value={config.fieldMapping.boundsLeft ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, boundsLeft: v.trim() || undefined },
                }))
              }
            />
            <FieldMappingRow
              label='bounds.top'
              placeholder='e.g. objectBounds.top'
              value={config.fieldMapping.boundsTop ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, boundsTop: v.trim() || undefined },
                }))
              }
            />
            <FieldMappingRow
              label='bounds.width'
              placeholder='e.g. objectBounds.width'
              value={config.fieldMapping.boundsWidth ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, boundsWidth: v.trim() || undefined },
                }))
              }
            />
            <FieldMappingRow
              label='bounds.height'
              placeholder='e.g. objectBounds.height'
              value={config.fieldMapping.boundsHeight ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, boundsHeight: v.trim() || undefined },
                }))
              }
            />

            <div className='border-t border-border/30 pt-2 text-[10px] text-gray-600'>
              Or use centre coordinates (alternative to bounds):
            </div>

            <FieldMappingRow
              label='centre.x'
              placeholder='e.g. center.x'
              value={config.fieldMapping.centerX ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, centerX: v.trim() || undefined },
                }))
              }
            />
            <FieldMappingRow
              label='centre.y'
              placeholder='e.g. center.y'
              value={config.fieldMapping.centerY ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, centerY: v.trim() || undefined },
                }))
              }
            />

            <FieldMappingRow
              label='confidence'
              placeholder='e.g. confidence (optional)'
              value={config.fieldMapping.confidence ?? ''}
              onChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  fieldMapping: { ...prev.fieldMapping, confidence: v.trim() || undefined },
                }))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact variant — shown in the Controls tab
// ---------------------------------------------------------------------------

function AiPathAnalysisTriggerCompact(): React.JSX.Element {
  const analysis = useAiPathAnalysisTriggerContext();
  const {
    status,
    config,
    pathMetas,
    pathMetasLoading,
    setConfig,
    triggerAnalysis,
    cancelAnalysis,
  } = analysis;

  const pathOptions = useMemo(
    () =>
      pathMetasLoading
        ? [{ value: '__loading__', label: 'Loading…', disabled: true }]
        : pathMetas.length === 0
          ? [{ value: '__empty__', label: 'No paths', disabled: true }]
          : pathMetas.map((m) => ({ value: m.id, label: m.name })),
    [pathMetas, pathMetasLoading]
  );

  const busy = isActive(status);

  return (
    <div className='space-y-2'>
      <SelectSimple
        size='xs'
        value={config.pathId || undefined}
        onValueChange={(v) =>
          setConfig((prev) => ({
            ...prev,
            pathId: v === '__loading__' || v === '__empty__' ? '' : v,
          }))
        }
        options={pathOptions}
        placeholder='Select AI Path…'
        ariaLabel='AI Path for object analysis'
        disabled={busy}
      />

      <div className='flex items-center gap-2'>
        {!busy ? (
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={() => void triggerAnalysis()}
            disabled={!config.pathId?.trim()}
            loading={false}
          >
            Trigger AI Analysis
          </Button>
        ) : (
          <Button size='xs' type='button' variant='outline' onClick={cancelAnalysis}>
            Cancel
          </Button>
        )}

        {status !== 'idle' && (
          <span className={cn('text-[10px]', STATUS_COLOR[status])}>
            {busy && (
              <span className='mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current' />
            )}
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function AiPathAnalysisTriggerSection({
  variant,
  analysis,
}: AiPathAnalysisTriggerSectionProps): React.JSX.Element {
  const inheritedAnalysis = useOptionalAiPathAnalysisTriggerContext();
  const contextValue = useMemo(
    () => analysis ?? inheritedAnalysis,
    [analysis, inheritedAnalysis]
  );

  if (!contextValue) {
    throw new Error(
      'AiPathAnalysisTriggerSection must be used within AiPathAnalysisTriggerProvider or receive explicit analysis'
    );
  }

  const content =
    variant === 'compact' ? (
      <AiPathAnalysisTriggerCompact />
    ) : (
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <AiPathAnalysisTriggerFull />
      </Card>
    );

  if (analysis) {
    return (
      <AiPathAnalysisTriggerProvider value={contextValue}>
        {content}
      </AiPathAnalysisTriggerProvider>
    );
  }

  return content;
}
