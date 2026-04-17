'use client';

import { AlertTriangle, ChevronDown, ChevronRight, Copy, Layers, Play, RotateCcw, Trash2, User } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { PLAYWRIGHT_STEP_TYPE_LABELS, normalizePlaywrightAction, type PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { ACTION_SEQUENCES, type ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import {
  analyzePlaywrightRuntimeActionRepairPreview,
  selectPlaywrightRuntimeActionRepairPreview,
} from '@/shared/lib/browser-execution/playwright-runtime-action-repair';
import { buildPlaywrightRuntimeActionRepairImpact } from '@/shared/lib/browser-execution/playwright-runtime-action-repair-impact';
import { STEP_REGISTRY } from '@/shared/lib/browser-execution/step-registry';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { StepTypeIcon } from './StepTypeIcon';

// ---------------------------------------------------------------------------
// Single action row (expandable)
// ---------------------------------------------------------------------------

const SavedActionRow = memo(({
  action,
}: {
  action: PlaywrightAction;
}): React.JSX.Element => {
  const {
    steps,
    stepSets,
    handleDeleteAction,
    handleDuplicateAction,
    handleLoadActionIntoConstructor,
    handleResetRuntimeActionToSeed,
    handleCloneRuntimeActionAsDraft,
    orphanedActionStepIds,
    orphanedStepSetIds,
    runtimeActionLoadErrorsById,
    editingActionId,
  } =
    usePlaywrightStepSequencer();
  const normalizedAction = normalizePlaywrightAction(action);
  const hasOrphanedSets = normalizedAction.blocks.some(
    (block) =>
      (block.kind === 'step_set' && orphanedStepSetIds.has(block.refId)) ||
      (block.kind === 'step' && orphanedActionStepIds.has(block.refId))
  );
  const runtimeLoadError = runtimeActionLoadErrorsById[action.id] ?? null;
  const canRepairRuntimeAction =
    runtimeLoadError !== null &&
    normalizedAction.runtimeKey !== null &&
    normalizedAction.runtimeKey in ACTION_SEQUENCES;
  const isBeingEdited = editingActionId === action.id;
  const { data: personas = [] } = usePlaywrightPersonas();
  const [expanded, setExpanded] = useState(false);

  const totalStepSets = normalizedAction.blocks.filter((block) => block.kind === 'step_set').length;
  const totalRuntimeSteps = normalizedAction.blocks.filter((block) => block.kind === 'runtime_step').length;
  const totalSteps = normalizedAction.blocks.reduce((sum, block) => {
    if (block.kind === 'step') return sum + 1;
    if (block.kind === 'runtime_step') return sum + 1;
    return sum + (stepSets.find((set) => set.id === block.refId)?.stepIds.length ?? 0);
  }, 0);

  return (
    <div className={cn(
      'rounded border',
      isBeingEdited
        ? 'border-sky-500/40 bg-sky-900/10 ring-1 ring-inset ring-sky-500/20'
        : 'border-border/40 bg-card/20'
    )}>
      {/* Header row */}
      <button
        type='button'
        onClick={() => setExpanded((prev) => !prev)}
        className='flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/20'
      >
        {expanded ? (
          <ChevronDown className='size-3.5 shrink-0 text-muted-foreground' />
        ) : (
          <ChevronRight className='size-3.5 shrink-0 text-muted-foreground' />
        )}

        <Play className='size-3.5 shrink-0 text-sky-400' />

        <span className='min-w-0 flex-1 truncate text-sm font-medium'>{action.name}</span>
        {hasOrphanedSets ? (
          <span
            className='inline-flex items-center gap-0.5 text-[10px] text-amber-400'
            title='Some referenced step sets have been deleted'
          >
            <AlertTriangle className='size-3' />
          </span>
        ) : null}
        {runtimeLoadError !== null ? (
          <span
            className='inline-flex items-center gap-0.5 text-[10px] text-destructive'
            title={runtimeLoadError}
          >
            <AlertTriangle className='size-3' />
          </span>
        ) : null}

        <div className='flex items-center gap-1.5'>
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            {normalizedAction.blocks.length} block{normalizedAction.blocks.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            {totalStepSets} set{totalStepSets !== 1 ? 's' : ''}
          </Badge>
          {totalRuntimeSteps > 0 ? (
            <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
              {totalRuntimeSteps} runtime
            </Badge>
          ) : null}
          {normalizedAction.runtimeKey !== null ? (
            <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
              {normalizedAction.runtimeKey}
            </Badge>
          ) : null}
          {runtimeLoadError !== null ? (
            <Badge variant='neutral' className='h-5 px-1.5 text-[10px] border-destructive/40 text-destructive'>
              fallback active
            </Badge>
          ) : null}
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            {totalSteps} step{totalSteps !== 1 ? 's' : ''}
          </Badge>
          {action.personaId !== null ? (
            <Badge variant='neutral' className='h-5 gap-0.5 px-1.5 text-[10px]'>
              <User className='size-2.5' />
              {personas.find((p) => p.id === action.personaId)?.name ?? 'Persona'}
            </Badge>
          ) : null}
          <Button
            variant='ghost'
            size='sm'
            className={cn(
              'h-6 gap-1 px-1.5 text-[11px]',
              isBeingEdited
                ? 'text-sky-300 opacity-50 cursor-default'
                : 'text-sky-400 hover:text-sky-300'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!isBeingEdited) handleLoadActionIntoConstructor(action.id);
            }}
            aria-label={isBeingEdited ? 'Currently editing' : `Load action ${action.name} into constructor`}
            title={isBeingEdited ? 'Currently loaded for editing' : 'Load into constructor'}
          >
            <RotateCcw className='size-3' />
            {isBeingEdited ? 'Editing' : 'Load'}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='size-6 p-0 text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateAction(action.id).catch(() => undefined);
            }}
            aria-label={`Duplicate action ${action.name}`}
            title='Duplicate action'
          >
            <Copy className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='size-6 p-0 text-muted-foreground hover:text-destructive'
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAction(action.id).catch(() => undefined);
            }}
            aria-label={`Delete action ${action.name}`}
            title='Delete action'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded ? (
        <div className='space-y-1 border-t border-border/30 px-4 py-2'>
          {action.description !== null ? (
            <p className='text-xs text-muted-foreground'>{action.description}</p>
          ) : null}
          {runtimeLoadError !== null ? (
            <div className='rounded border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive'>
              <p className='font-medium'>Runtime fallback is active for this action.</p>
              <p>{runtimeLoadError}</p>
              {canRepairRuntimeAction ? (
                <div className='mt-2 flex items-center gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-6 gap-1 text-[11px]'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetRuntimeActionToSeed(action.id).catch(() => undefined);
                    }}
                  >
                    <RotateCcw className='size-3' />
                    Reset to seed
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-6 gap-1 text-[11px]'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloneRuntimeActionAsDraft(action.id).catch(() => undefined);
                    }}
                  >
                    <Copy className='size-3' />
                    Draft + restore
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <ol className='space-y-1'>
            {normalizedAction.blocks.map((block, idx) => {
              const set = block.kind === 'step_set'
                ? (stepSets.find((item) => item.id === block.refId) ?? null)
                : null;
              const step = block.kind === 'step'
                ? (steps.find((item) => item.id === block.refId) ?? null)
                : null;
              const runtimeStepLabel =
                block.kind === 'runtime_step' && block.refId in STEP_REGISTRY
                  ? STEP_REGISTRY[block.refId as keyof typeof STEP_REGISTRY].label
                  : null;
              const isMissing =
                block.kind === 'runtime_step'
                  ? runtimeStepLabel === null
                  : block.kind === 'step'
                    ? step === null
                    : set === null;
              return (
                <li
                  key={block.id}
                  className={cn(
                    'flex items-center gap-2 rounded px-2 py-1 text-xs',
                    isMissing ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'
                  )}
                >
                  <span className='shrink-0 w-5 text-right font-mono text-[10px] text-muted-foreground'>
                    {idx + 1}.
                  </span>
                  {block.kind === 'runtime_step' ? (
                    <Play className='size-3 shrink-0 text-sky-300' />
                  ) : block.kind === 'step' ? (
                    step ? (
                      <StepTypeIcon type={step.type} className='size-3 shrink-0' />
                    ) : (
                      <AlertTriangle className='size-3 shrink-0 text-amber-400' />
                    )
                  ) : (
                    <Layers className='size-3 shrink-0 text-sky-400/70' />
                  )}
                  <span className='min-w-0 flex-1 truncate'>
                    {block.label ?? runtimeStepLabel ?? step?.name ?? set?.name ?? `(deleted: ${block.refId})`}
                  </span>
                  {block.kind === 'runtime_step' && runtimeStepLabel !== null ? (
                    <span className='shrink-0 text-[10px] text-muted-foreground'>
                      runtime
                    </span>
                  ) : null}
                  {block.kind === 'step' && step ? (
                    <span className='shrink-0 text-[10px] text-muted-foreground'>
                      {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
                    </span>
                  ) : null}
                  {block.kind === 'step_set' && set ? (
                    <span className='shrink-0 text-[10px] text-muted-foreground'>
                      {set.stepIds.length} steps
                    </span>
                  ) : null}
                  {!block.enabled ? (
                    <span className='shrink-0 text-[10px] text-amber-300'>
                      disabled
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function SavedActionsPanel(): React.JSX.Element {
  const {
    actions,
    runtimeActionLoadErrorsById,
    handleResetAllRuntimeActionsToSeed,
    handleCloneAllRuntimeActionsAsDrafts,
  } = usePlaywrightStepSequencer();
  const repairPreview = analyzePlaywrightRuntimeActionRepairPreview({
    actions,
    runtimeActionLoadErrorsById,
  });
  const availableRuntimeKeys = repairPreview.repairedRuntimeKeys;
  const [selectedRuntimeKeys, setSelectedRuntimeKeys] = useState<ActionSequenceKey[] | null>(null);
  const [isImpactExpanded, setIsImpactExpanded] = useState(false);
  const availableRuntimeKeySignature = availableRuntimeKeys.join('|');
  useEffect(() => {
    setSelectedRuntimeKeys((currentSelection) => {
      if (availableRuntimeKeys.length === 0) {
        return [];
      }
      if (currentSelection === null) {
        return [...availableRuntimeKeys];
      }
      return currentSelection.filter((runtimeKey) => availableRuntimeKeys.includes(runtimeKey));
    });
  }, [availableRuntimeKeySignature]);
  const activeRuntimeKeys = selectedRuntimeKeys ?? availableRuntimeKeys;
  const selectedRepairPreview = useMemo(
    () =>
      selectPlaywrightRuntimeActionRepairPreview({
        actions,
        preview: repairPreview,
        runtimeKeys: activeRuntimeKeys.filter((key) => availableRuntimeKeys.includes(key)),
      }),
    [actions, activeRuntimeKeys, availableRuntimeKeys, repairPreview]
  );
  const repairImpact = useMemo(
    () =>
      buildPlaywrightRuntimeActionRepairImpact({
        actions,
        preview: selectedRepairPreview,
      }),
    [actions, selectedRepairPreview]
  );
  const quarantinedActionCount = Object.keys(runtimeActionLoadErrorsById).length;
  const totalRepairableRuntimeActionCount = repairPreview.repairableActionIds.length;
  const repairableRuntimeActionCount = selectedRepairPreview.repairableActionIds.length;
  const replacementCount = selectedRepairPreview.replacedActionIds.length;
  const repairedRuntimeKeyCount = selectedRepairPreview.repairedRuntimeKeys.length;
  const nonRepairableQuarantinedCount = repairPreview.nonRepairableQuarantinedActionIds.length;
  useEffect(() => {
    if (repairImpact.groups.length === 0 && isImpactExpanded) {
      setIsImpactExpanded(false);
    }
  }, [isImpactExpanded, repairImpact.groups.length]);

  if (actions.length === 0) return <></>;

  return (
    <section className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h2 className='text-sm font-semibold'>Saved Actions</h2>
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            {actions.length}
          </Badge>
          {quarantinedActionCount > 0 ? (
            <Badge
              variant='neutral'
              className='h-5 gap-1 border-destructive/40 px-1.5 text-[10px] text-destructive'
            >
              <AlertTriangle className='size-3' />
              {quarantinedActionCount} quarantined
            </Badge>
          ) : null}
        </div>
        {totalRepairableRuntimeActionCount > 0 ? (
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-7 gap-1 text-[11px]'
              onClick={() => {
                handleResetAllRuntimeActionsToSeed(activeRuntimeKeys).catch(() => undefined);
              }}
              disabled={repairedRuntimeKeyCount === 0}
            >
              <RotateCcw className='size-3' />
              Repair all
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-7 gap-1 text-[11px]'
              onClick={() => {
                handleCloneAllRuntimeActionsAsDrafts(activeRuntimeKeys).catch(() => undefined);
              }}
              disabled={repairedRuntimeKeyCount === 0}
            >
              <Copy className='size-3' />
              Draft + restore all
            </Button>
          </div>
        ) : null}
      </div>
      {totalRepairableRuntimeActionCount > 0 ? (
        <div className='rounded border border-destructive/20 bg-destructive/5 px-3 py-2'>
          <div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground'>
            <span>
              Selected {repairedRuntimeKeyCount} of {repairPreview.repairedRuntimeKeys.length} runtime key
              {repairPreview.repairedRuntimeKeys.length === 1 ? '' : 's'}
            </span>
            <span>
              Preview: restore {repairedRuntimeKeyCount} runtime key
              {repairedRuntimeKeyCount === 1 ? '' : 's'}
            </span>
            <span>
              replace {replacementCount} persisted runtime action
              {replacementCount === 1 ? '' : 's'}
            </span>
            <span>
              preserve {replacementCount} draft{replacementCount === 1 ? '' : 's'} with
              {' '}Draft + restore all
            </span>
            {nonRepairableQuarantinedCount > 0 ? (
              <span className='text-destructive'>
                {nonRepairableQuarantinedCount} quarantined action
                {nonRepairableQuarantinedCount === 1 ? '' : 's'} still need manual cleanup
              </span>
            ) : null}
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-6 text-[11px]'
              onClick={() => {
                setSelectedRuntimeKeys([...availableRuntimeKeys]);
              }}
            >
              Select all
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-6 text-[11px]'
              onClick={() => {
                setSelectedRuntimeKeys([]);
              }}
            >
              Clear
            </Button>
            {repairImpact.groups.length > 0 ? (
              <Button
                size='sm'
                variant='outline'
                className='h-6 text-[11px]'
                onClick={() => {
                  setIsImpactExpanded((currentValue) => !currentValue);
                }}
              >
                {isImpactExpanded ? 'Hide impacted actions' : 'Show impacted actions'}
              </Button>
            ) : null}
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-1.5'>
            {repairPreview.repairedRuntimeKeys.map((runtimeKey) => (
              <button
                key={runtimeKey}
                type='button'
                className={cn(
                  'inline-flex h-5 items-center rounded border px-1.5 text-[10px]',
                  activeRuntimeKeys.includes(runtimeKey)
                    ? 'border-destructive/40 text-destructive'
                    : 'border-border/40 text-muted-foreground opacity-60'
                )}
                onClick={() => {
                  setSelectedRuntimeKeys((currentSelection) => {
                    const baseSelection = currentSelection ?? [...availableRuntimeKeys];
                    return baseSelection.includes(runtimeKey)
                      ? baseSelection.filter((key) => key !== runtimeKey)
                      : [...baseSelection, runtimeKey];
                  });
                }}
              >
                {runtimeKey}
              </button>
            ))}
          </div>
          {isImpactExpanded ? (
            <div className='mt-3 space-y-2 rounded border border-destructive/20 bg-background/40 p-2'>
              {repairImpact.groups.map((group) => (
                <div key={group.runtimeKey} className='space-y-1.5'>
                  <div className='text-[11px] font-medium text-destructive'>
                    {group.runtimeKey}
                  </div>
                  <div className='space-y-1'>
                    {group.actions.map((entry) => (
                      <div
                        key={entry.actionId}
                        className='grid gap-2 rounded border border-border/40 bg-card/20 px-2 py-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
                      >
                        <div className='min-w-0'>
                          <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                            Replace
                          </div>
                          <div className='truncate text-xs'>{entry.actionName}</div>
                        </div>
                        <div className='min-w-0'>
                          <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                            Draft + restore creates
                          </div>
                          <div className='truncate text-xs text-muted-foreground'>
                            {entry.draftName}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className='space-y-1.5'>
        {actions.map((action) => (
          <SavedActionRow key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}
