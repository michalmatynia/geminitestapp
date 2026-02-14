'use client';

import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import {
  Button,
  EmptyState,
  FormSection,
  Input,
  Label,
  StatusToggle,
  Textarea,
  UnifiedSelect,
} from '@/shared/ui';

import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';

import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';
import { useSettingsState } from '../context/hooks/useSettings';
import {
  useSegmentEditorState,
  useSegmentEditorActions,
} from '../context/hooks/useSegmentEditor';
import { PromptExploderHierarchyTreeProvider } from './PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from './PromptExploderHierarchyTreeEditor';
import {
  promptExploderClampNumber,
  promptExploderSafeJsonStringify,
  promptExploderIsFiniteNumber,
  promptExploderInferParamTypeLabel,
} from '../helpers/formatting';
import {
  createLogicalCondition,
  PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS,
  isLogicalComparator,
  isLogicalJoin,
  parseLogicalValueText,
  formatLogicalValueText,
  parseSubsectionConditionText,
  buildSubsectionConditionText,
} from '../helpers/logical-conditions';
import { extractRgbLiteral, rgbToHex, hexToRgb, replaceRgbLiteral } from '../helpers/rgb';
import {
  promptExploderAddBlankListItem,
  promptExploderCreateSubsection,
  createApprovalDraftFromSegment,
} from '../helpers/segment-helpers';
import { moveByDelta } from '../parser';
import {
  buildPromptExploderParamEntries,
  isParamArrayTupleLength,
  promptExploderParamUiControlLabel,
  sanitizeParamJsonValue,
} from '../params-editor';

import type { TemplateMergeMode } from '../template-learning';
import type {
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalOperator,
  PromptExploderSegment,
} from '../types';

// ── Logical condition helpers ────────────────────────────────────────────────

function normalizeLogicalConditionList(
  item: PromptExploderListItem,
  sourceConditions: PromptExploderLogicalCondition[],
  logicalOperator: PromptExploderLogicalOperator
): PromptExploderLogicalCondition[] {
  const fallbackComparator: PromptExploderLogicalComparator =
    logicalOperator === 'unless' ? 'falsy' : 'truthy';
  const baseConditions = sourceConditions.length
    ? sourceConditions
    : [
      createLogicalCondition({
        id: `${item.id}_condition_1`,
        comparator: fallbackComparator,
        value: null,
      }),
    ];

  return baseConditions.map((condition, index) => {
    const comparator = condition.comparator ?? fallbackComparator;
    return createLogicalCondition({
      id: condition.id || `${item.id}_condition_${index + 1}`,
      paramPath: (condition.paramPath ?? '').trim(),
      comparator,
      value:
        comparator === 'truthy' || comparator === 'falsy'
          ? null
          : condition.value ?? null,
      joinWithPrevious:
        index === 0
          ? null
          : (condition.joinWithPrevious === 'or' ? 'or' : 'and'),
    });
  });
}

function deriveLegacyLogicalConditions(
  item: PromptExploderListItem
): PromptExploderLogicalCondition[] {
  const legacyPath = (item.referencedParamPath ?? '').trim();
  if (!legacyPath) return [];
  return [
    createLogicalCondition({
      id: `${item.id}_legacy`,
      paramPath: legacyPath,
      comparator:
        item.referencedComparator ??
        (item.logicalOperator === 'unless' ? 'falsy' : 'truthy'),
      value: item.referencedValue ?? null,
      joinWithPrevious: null,
    }),
  ];
}

function getEditableLogicalConditions(
  item: PromptExploderListItem
): PromptExploderLogicalCondition[] {
  if ((item.logicalConditions ?? []).length > 0) {
    return item.logicalConditions ?? [];
  }
  const legacy = deriveLegacyLogicalConditions(item);
  if (legacy.length > 0) return legacy;
  if (item.logicalOperator) {
    return [
      createLogicalCondition({
        id: `${item.id}_condition_1`,
        comparator: item.logicalOperator === 'unless' ? 'falsy' : 'truthy',
        joinWithPrevious: null,
      }),
    ];
  }
  return [];
}

function normalizeListItemLogicalState(
  item: PromptExploderListItem,
  override: Partial<PromptExploderListItem>
): PromptExploderListItem {
  const next = {
    ...item,
    ...override,
  };
  const logicalOperator = next.logicalOperator ?? null;
  if (!logicalOperator) {
    return {
      ...next,
      logicalOperator: null,
      logicalConditions: [],
      referencedParamPath: null,
      referencedComparator: null,
      referencedValue: null,
    };
  }

  const sourcedConditions =
    override.logicalConditions !== undefined
      ? (override.logicalConditions ?? [])
      : ((next.logicalConditions ?? []).length > 0
        ? (next.logicalConditions ?? [])
        : deriveLegacyLogicalConditions(next));

  const logicalConditions = normalizeLogicalConditionList(
    next,
    sourcedConditions,
    logicalOperator
  );

  const firstConfiguredCondition =
    logicalConditions.find((condition) => condition.paramPath.trim().length > 0) ?? null;

  return {
    ...next,
    logicalOperator,
    logicalConditions,
    referencedParamPath: firstConfiguredCondition?.paramPath ?? null,
    referencedComparator: firstConfiguredCondition?.comparator ?? null,
    referencedValue:
      firstConfiguredCondition &&
        firstConfiguredCondition.comparator !== 'truthy' &&
        firstConfiguredCondition.comparator !== 'falsy'
        ? firstConfiguredCondition.value
        : null,
  };
}

function updateListItemAt(
  items: PromptExploderListItem[],
  index: number,
  updater: (item: PromptExploderListItem) => PromptExploderListItem
): PromptExploderListItem[] {
  return items.map((item, itemIndex) =>
    itemIndex === index ? updater(item) : item
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function SegmentEditorPanel(): React.JSX.Element {
  const {
    documentState,
    selectedSegmentId,
    selectedSegment,
    selectedParamEntriesState,
    listParamOptions,
    listParamEntryByPath,
  } = useDocumentState();
  const {
    setSelectedSegmentId,
    updateSegment,
    updateParameterValue,
    updateParameterSelector,
    updateParameterComment,
    updateParameterDescription,
  } = useDocumentActions();
  const {
    effectiveLearnedTemplates,
    templateMergeThreshold,
    isBusy,
  } = useSettingsState();
  const {
    draggingSegmentId,
    segmentDropTargetId,
    segmentDropPosition,
    draggingListItemIndex,
    listItemDropTargetIndex,
    listItemDropPosition,
    approvalDraft,
    matchedRuleDetails,
    similarTemplateCandidates,
    templateTargetOptions,
  } = useSegmentEditorState();
  const {
    setApprovalDraft,
    handleSegmentDragStart,
    handleSegmentDragEnd,
    handleSegmentDragOver,
    handleSegmentDrop,
    handleListItemDragStart,
    handleListItemDragEnd,
    handleListItemDragOver,
    handleListItemDrop,
    handleApproveSelectedSegmentPattern,
  } = useSegmentEditorActions();

  const updateTopLevelListItem = (
    segmentId: string,
    index: number,
    updater: (item: PromptExploderListItem) => PromptExploderListItem
  ): void => {
    updateSegment(segmentId, (current) => ({
      ...current,
      listItems: updateListItemAt(current.listItems, index, updater),
    }));
  };

  const renderListItemLogicalEditor = (args: {
    item: PromptExploderListItem;
    onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
  }): React.JSX.Element => {
    const { item, onChange } = args;
    const operatorValue = item.logicalOperator ?? 'none';
    const logicalConditions =
      operatorValue === 'none' ? [] : getEditableLogicalConditions(item);

    const applyPatch = (patch: Partial<PromptExploderListItem>): void => {
      onChange((current) => normalizeListItemLogicalState(current, patch));
    };

    const updateCondition = (
      conditionIndex: number,
      patch: Partial<PromptExploderLogicalCondition>
    ): void => {
      const nextConditions = logicalConditions.map((condition, index) =>
        index === conditionIndex ? createLogicalCondition({ ...condition, ...patch }) : condition
      );
      applyPatch({
        logicalConditions: nextConditions,
      });
    };

    const addCondition = (): void => {
      if (operatorValue === 'none') return;
      const fallbackComparator: PromptExploderLogicalComparator =
        operatorValue === 'unless' ? 'falsy' : 'truthy';
      applyPatch({
        logicalConditions: [
          ...logicalConditions,
          createLogicalCondition({
            comparator: fallbackComparator,
            joinWithPrevious: 'and',
          }),
        ],
      });
    };

    const removeCondition = (conditionIndex: number): void => {
      const nextConditions = logicalConditions.filter((_, index) => index !== conditionIndex);
      applyPatch({
        logicalConditions: nextConditions,
      });
    };

    return (
      <div className='mt-2 space-y-2 rounded border border-border/50 bg-card/20 p-2'>
        <div className='space-y-1'>
          <Label className='text-[10px] text-gray-500'>Logical Operator</Label>
          <UnifiedSelect
            value={operatorValue}
            onValueChange={(next: string) => {
              if (next === 'none') {
                applyPatch({
                  logicalOperator: null,
                  logicalConditions: [],
                  referencedParamPath: null,
                  referencedComparator: null,
                  referencedValue: null,
                });
                return;
              }
              const nextOperator = next as PromptExploderLogicalOperator;
              applyPatch({
                logicalOperator: nextOperator,
              });
            }}
            options={PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>

        {operatorValue !== 'none' ? (
          <div className='space-y-2'>
            {logicalConditions.map((condition, conditionIndex) => {
              const selectedParamPath = (condition.paramPath ?? '').trim();
              const selectedParamEntry = selectedParamPath
                ? (listParamEntryByPath.get(selectedParamPath) ?? null)
                : null;
              const comparatorValue =
                condition.comparator ?? (operatorValue === 'unless' ? 'falsy' : 'truthy');
              const needsValue =
                selectedParamPath.length > 0 &&
                comparatorValue !== 'truthy' &&
                comparatorValue !== 'falsy';
              const paramOptions =
                selectedParamPath &&
                  !listParamOptions.some((option) => option.value === selectedParamPath)
                  ? [{ value: selectedParamPath, label: selectedParamPath }, ...listParamOptions]
                  : listParamOptions;

              return (
                <div
                  key={condition.id}
                  className='grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_120px_minmax(0,1fr)_64px]'
                >
                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Join</Label>
                    {conditionIndex === 0 ? (
                      <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
                        START
                      </div>
                    ) : (
                      <UnifiedSelect
                        value={condition.joinWithPrevious === 'or' ? 'or' : 'and'}
                        onValueChange={(next: string) => {
                          if (!isLogicalJoin(next)) return;
                          updateCondition(conditionIndex, {
                            joinWithPrevious: next,
                          });
                        }}
                        options={PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                      />
                    )}
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Referenced Param</Label>
                    <UnifiedSelect
                      value={selectedParamPath}
                      onValueChange={(next: string) => {
                        updateCondition(conditionIndex, {
                          paramPath: next.trim(),
                        });
                      }}
                      options={
                        paramOptions.length > 0
                          ? paramOptions
                          : [{ value: '', label: 'No parameters available' }]
                      }
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Comparator</Label>
                    <UnifiedSelect
                      value={comparatorValue}
                      onValueChange={(next: string) => {
                        if (!isLogicalComparator(next)) return;
                        updateCondition(conditionIndex, {
                          comparator: next,
                          value:
                            next === 'truthy' || next === 'falsy'
                              ? null
                              : condition.value ?? null,
                        });
                      }}
                      options={PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Value</Label>
                    {needsValue ? (
                      selectedParamEntry?.spec?.kind === 'boolean' ? (
                        <UnifiedSelect
                          value={String(Boolean(condition.value))}
                          onValueChange={(next: string) => {
                            updateCondition(conditionIndex, {
                              value: next === 'true',
                            });
                          }}
                          options={[
                            { value: 'true', label: 'true' },
                            { value: 'false', label: 'false' },
                          ]}
                        />
                      ) : selectedParamEntry?.spec?.kind === 'enum' &&
                        selectedParamEntry.spec.enumOptions ? (
                          <UnifiedSelect
                            value={String(condition.value ?? selectedParamEntry.spec.enumOptions[0] ?? '')}
                            onValueChange={(next: string) => {
                              updateCondition(conditionIndex, {
                                value: next,
                              });
                            }}
                            options={selectedParamEntry.spec.enumOptions.map((value) => ({
                              value,
                              label: value,
                            }))}
                          />
                        ) : selectedParamEntry?.spec?.kind === 'number' ? (
                          <Input
                            type='number'
                            value={String(condition.value ?? '')}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (!Number.isFinite(next)) return;
                              updateCondition(conditionIndex, {
                                value: next,
                              });
                            }}
                          />
                        ) : (
                          <Input
                            value={
                              typeof condition.value === 'string'
                                ? condition.value
                                : promptExploderSafeJsonStringify(condition.value ?? '')
                            }
                            onChange={(event) => {
                              const rawValue = event.target.value;
                              if (
                                selectedParamEntry?.spec?.kind === 'rgb' ||
                                selectedParamEntry?.spec?.kind === 'tuple2' ||
                                selectedParamEntry?.spec?.kind === 'json'
                              ) {
                                updateCondition(conditionIndex, {
                                  value: sanitizeParamJsonValue(
                                    rawValue,
                                    condition.value
                                  ),
                                });
                                return;
                              }
                              updateCondition(conditionIndex, {
                                value: rawValue,
                              });
                            }}
                          />
                        )
                    ) : (
                      <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
                        {selectedParamPath ? 'Value not needed' : 'Select parameter'}
                      </div>
                    )}
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Actions</Label>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 w-full px-2'
                      onClick={() => {
                        removeCondition(conditionIndex);
                      }}
                      disabled={logicalConditions.length <= 1}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-8 px-2 text-xs'
                onClick={addCondition}
              >
                <Plus className='mr-1 size-3.5' />
                Add condition
              </Button>
            </div>
          </div>
        ) : (
          <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
            No condition
          </div>
        )}
      </div>
    );
  };

  return (
    <FormSection
      title='Segments'
      description='Edit segment content and ordering before reassembly.'
      variant='subtle'
      className='p-4'
    >
      {!documentState || documentState.segments.length === 0 ? (
        <EmptyState
          title='No segments yet'
          description='Run Prompt Exploder to generate editable segments.'
        />
      ) : (
        <div className='mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]'>
          {/* ── Segment list sidebar ─────────────────────────────────────── */}
          <div className='max-h-[65vh] space-y-2 overflow-auto rounded border border-border/60 bg-card/20 p-2'>
            {documentState.segments.map((segment) => {
              const isDropTarget = segmentDropTargetId === segment.id;
              const isDropBefore = isDropTarget && segmentDropPosition === 'before';
              const isDropAfter = isDropTarget && segmentDropPosition === 'after';
              return (
                <div
                  key={segment.id}
                  role='button'
                  tabIndex={0}
                  className={`relative w-full rounded border px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${selectedSegmentId === segment.id ? 'border-blue-400 bg-blue-500/10 text-gray-100' : 'border-border/50 bg-card/30 text-gray-300 hover:border-blue-300/50'} ${draggingSegmentId === segment.id ? 'opacity-60' : ''}`}
                  onClick={() => setSelectedSegmentId(segment.id)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setSelectedSegmentId(segment.id);
                  }}
                  onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                    handleSegmentDragOver(event, segment.id);
                  }}
                  onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                    handleSegmentDrop(event, segment.id);
                  }}
                >
                  {isDropBefore ? (
                    <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-blue-400' />
                  ) : null}
                  {isDropAfter ? (
                    <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-blue-400' />
                  ) : null}
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <button
                        type='button'
                        className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 transition-colors hover:bg-card/70 hover:text-gray-100 active:cursor-grabbing'
                        aria-label='Drag to reorder segment'
                        draggable
                        onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                        }}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                        }}
                        onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          handleSegmentDragStart(segment.id);
                        }}
                        onDragEnd={() => {
                          handleSegmentDragEnd();
                        }}
                      >
                        <GripVertical className='size-3.5' />
                      </button>
                      <span className='truncate font-medium'>{segment.title}</span>
                    </div>
                    <span className='rounded border border-border/50 bg-card/50 px-1 py-0.5 text-[10px] uppercase'>
                      {segment.type.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className='mt-1 flex items-center justify-between text-[10px] text-gray-500'>
                    <span>Confidence {(segment.confidence * 100).toFixed(0)}%</span>
                    <span>{segment.includeInOutput ? 'Included' : 'Omitted'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Segment detail editor ────────────────────────────────────── */}
          <div className='max-h-[65vh] space-y-3 overflow-auto rounded border border-border/60 bg-card/20 p-3'>
            {!selectedSegment ? (
              <div className='text-sm text-gray-500'>Select a segment to edit.</div>
            ) : (
              <>
                <div className='grid gap-3 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-gray-400'>Type</Label>
                    <UnifiedSelect
                      value={selectedSegment.type}
                      onValueChange={(value: string) => {
                        updateSegment(selectedSegment.id, (current) => ({
                          ...current,
                          type: value as PromptExploderSegment['type'],
                        }));
                      }}
                      options={[
                        { value: 'metadata', label: 'Metadata' },
                        { value: 'assigned_text', label: 'Assigned Text' },
                        { value: 'list', label: 'List' },
                        { value: 'parameter_block', label: 'Parameter Block' },
                        { value: 'referential_list', label: 'Referential List' },
                        { value: 'sequence', label: 'Sequence' },
                        { value: 'hierarchical_list', label: 'Hierarchical List' },
                        { value: 'conditional_list', label: 'Conditional List' },
                        { value: 'qa_matrix', label: 'QA Matrix' },
                      ]}
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-gray-400'>Include In Output</Label>
                    <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                      <StatusToggle
                        enabled={selectedSegment.includeInOutput}
                        onToggle={() => {
                          updateSegment(selectedSegment.id, (current) => ({
                            ...current,
                            includeInOutput: !current.includeInOutput,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Title</Label>
                  <Input
                    value={selectedSegment.title}
                    onChange={(event) => {
                      updateSegment(selectedSegment.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }));
                    }}
                  />
                </div>

                {selectedSegment.type === 'metadata' ? (
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-gray-400'>Metadata Mode</Label>
                    <UnifiedSelect
                      value={selectedSegment.includeInOutput ? 'include' : 'omit'}
                      onValueChange={(value: string) => {
                        updateSegment(selectedSegment.id, (current) => ({
                          ...current,
                          includeInOutput: value === 'include',
                        }));
                      }}
                      options={[
                        { value: 'omit', label: 'Omit from reassembly' },
                        { value: 'include', label: 'Include in reassembly' },
                      ]}
                    />
                  </div>
                ) : null}

                {/* ── Parameter block editor ──────────────────────────────── */}
                {selectedSegment.type === 'parameter_block' ? (
                  <div className='space-y-3'>
                    <div className='space-y-2 rounded border border-border/50 bg-card/20 p-3'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-[11px] uppercase tracking-wide text-gray-400'>
                          Parameters
                        </Label>
                        <span className='text-[10px] text-gray-500'>
                          {selectedParamEntriesState?.entries.length ?? 0} extracted
                        </span>
                      </div>

                      {selectedSegment.paramsObject && selectedParamEntriesState ? (
                        selectedParamEntriesState.entries.length > 0 ? (
                          <div className='max-h-[42vh] space-y-2 overflow-auto pr-1'>
                            {selectedParamEntriesState.entries.map((entry) => (
                              <div
                                key={entry.path}
                                className='space-y-2 rounded border border-border/50 bg-card/20 p-2'
                              >
                                <div className='flex items-center justify-between gap-2'>
                                  <div className='truncate font-mono text-[11px] text-gray-200'>
                                    {entry.path}
                                  </div>
                                  <div className='text-[10px] uppercase text-gray-500'>
                                    {promptExploderInferParamTypeLabel(entry)}
                                  </div>
                                </div>

                                <div className='grid gap-2 lg:grid-cols-[220px_minmax(0,1fr)]'>
                                  <div className='space-y-1'>
                                    <Label className='text-[10px] text-gray-500'>Selector</Label>
                                    <UnifiedSelect
                                      value={entry.selector}
                                      onValueChange={(next: string) => {
                                        updateParameterSelector(selectedSegment.id, entry.path, next);
                                      }}
                                      options={entry.selectorOptions.map((control) => ({
                                        value: control,
                                        label:
                                          control === 'auto'
                                            ? `Auto (${promptExploderParamUiControlLabel(
                                              entry.recommendation.recommended
                                            )})`
                                            : promptExploderParamUiControlLabel(control),
                                      }))}
                                    />
                                  </div>

                                  <div className='space-y-1'>
                                    <Label className='text-[10px] text-gray-500'>Value</Label>

                                    {entry.recommendation.baseKind === 'boolean' &&
                                    typeof entry.value === 'boolean' &&
                                    entry.resolvedSelector !== 'json' ? (
                                        entry.resolvedSelector === 'buttons' ? (
                                          <div className='flex items-center gap-2'>
                                            <Button
                                              type='button'
                                              variant={entry.value ? 'secondary' : 'outline'}
                                              size='sm'
                                              onClick={() => {
                                                updateParameterValue(selectedSegment.id, entry.path, true);
                                              }}
                                            >
                                            true
                                            </Button>
                                            <Button
                                              type='button'
                                              variant={!entry.value ? 'secondary' : 'outline'}
                                              size='sm'
                                              onClick={() => {
                                                updateParameterValue(selectedSegment.id, entry.path, false);
                                              }}
                                            >
                                            false
                                            </Button>
                                          </div>
                                        ) : (
                                          <UnifiedSelect
                                            value={entry.value ? 'true' : 'false'}
                                            onValueChange={(next: string) => {
                                              updateParameterValue(
                                                selectedSegment.id,
                                                entry.path,
                                                next === 'true'
                                              );
                                            }}
                                            options={[
                                              { value: 'true', label: 'true' },
                                              { value: 'false', label: 'false' },
                                            ]}
                                          />
                                        )
                                      ) : null}

                                    {entry.recommendation.baseKind === 'enum' &&
                                    typeof entry.value === 'string' &&
                                    entry.spec?.enumOptions &&
                                    entry.resolvedSelector !== 'json' ? (
                                        entry.resolvedSelector === 'buttons' ? (
                                          <div className='flex flex-wrap gap-2'>
                                            {entry.spec.enumOptions.map((option) => (
                                              <Button
                                                key={option}
                                                type='button'
                                                variant={
                                                  option === entry.value ? 'secondary' : 'outline'
                                                }
                                                size='sm'
                                                onClick={() => {
                                                  updateParameterValue(
                                                    selectedSegment.id,
                                                    entry.path,
                                                    option
                                                  );
                                                }}
                                              >
                                                {option}
                                              </Button>
                                            ))}
                                          </div>
                                        ) : entry.resolvedSelector === 'text' ? (
                                          <Input
                                            value={entry.value}
                                            onChange={(event) => {
                                              updateParameterValue(
                                                selectedSegment.id,
                                                entry.path,
                                                event.target.value
                                              );
                                            }}
                                          />
                                        ) : (
                                          <UnifiedSelect
                                            value={entry.value}
                                            onValueChange={(next: string) => {
                                              updateParameterValue(
                                                selectedSegment.id,
                                                entry.path,
                                                next
                                              );
                                            }}
                                            options={entry.spec.enumOptions.map((option) => ({
                                              value: option,
                                              label: option,
                                            }))}
                                          />
                                        )
                                      ) : null}

                                    {entry.recommendation.baseKind === 'number' &&
                                    promptExploderIsFiniteNumber(entry.value) &&
                                    entry.resolvedSelector !== 'json' ? (
                                        <div className='space-y-2'>
                                          {entry.resolvedSelector === 'slider' &&
                                        entry.recommendation.canSlider ? (
                                              <input
                                                type='range'
                                                min={entry.spec?.min ?? 0}
                                                max={entry.spec?.max ?? 1}
                                                step={entry.spec?.step ?? 0.01}
                                                value={entry.value}
                                                onChange={(event) => {
                                                  const next = Number(event.target.value);
                                                  if (!Number.isFinite(next)) return;
                                                  updateParameterValue(
                                                    selectedSegment.id,
                                                    entry.path,
                                                    next
                                                  );
                                                }}
                                                className='w-full'
                                              />
                                            ) : null}
                                          <Input
                                            type='number'
                                            value={String(entry.value)}
                                            min={entry.spec?.min}
                                            max={entry.spec?.max}
                                            step={entry.spec?.step}
                                            onChange={(event) => {
                                              const next = Number(event.target.value);
                                              if (!Number.isFinite(next)) return;
                                              updateParameterValue(
                                                selectedSegment.id,
                                                entry.path,
                                                next
                                              );
                                            }}
                                          />
                                        </div>
                                      ) : null}

                                    {entry.recommendation.baseKind === 'rgb' &&
                                    isParamArrayTupleLength(entry.value, 3) &&
                                    entry.resolvedSelector !== 'json' ? (
                                        <div className='grid grid-cols-3 gap-2'>
                                          {['R', 'G', 'B'].map((label, index) => (
                                            <div key={label} className='space-y-1'>
                                              <div className='text-[10px] text-gray-500'>{label}</div>
                                              <Input
                                                type='number'
                                                value={String((entry.value as any[])[index] ?? '')}
                                                min={entry.spec?.min ?? 0}
                                                max={entry.spec?.max ?? 255}
                                                step={entry.spec?.step ?? 1}
                                                onChange={(event) => {
                                                  const next = Number(event.target.value);
                                                  if (!Number.isFinite(next)) return;
                                                  const nextRgb = [...(entry.value as any[])];
                                                  nextRgb[index] = next;
                                                  updateParameterValue(
                                                    selectedSegment.id,
                                                    entry.path,
                                                    nextRgb
                                                  );
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}

                                    {entry.recommendation.baseKind === 'tuple2' &&
                                    isParamArrayTupleLength(entry.value, 2) &&
                                    entry.resolvedSelector !== 'json' ? (
                                        <div className='grid grid-cols-2 gap-2'>
                                          {['X', 'Y'].map((label, index) => (
                                            <div key={label} className='space-y-1'>
                                              <div className='text-[10px] text-gray-500'>{label}</div>
                                              <Input
                                                type='number'
                                                value={String((entry.value as any[])[index] ?? '')}
                                                min={entry.spec?.min}
                                                max={entry.spec?.max}
                                                step={entry.spec?.step ?? 1}
                                                onChange={(event) => {
                                                  const next = Number(event.target.value);
                                                  if (!Number.isFinite(next)) return;
                                                  const nextTuple = [...(entry.value as any[])];
                                                  nextTuple[index] = next;
                                                  updateParameterValue(
                                                    selectedSegment.id,
                                                    entry.path,
                                                    nextTuple
                                                  );
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}

                                    {entry.recommendation.baseKind === 'string' &&
                                    typeof entry.value === 'string' &&
                                    entry.resolvedSelector !== 'json' ? (
                                        entry.resolvedSelector === 'textarea' ? (
                                          <Textarea
                                            className='min-h-[86px] font-mono text-[11px]'
                                            value={entry.value}
                                            onChange={(event) => {
                                              updateParameterValue(
                                                selectedSegment.id,
                                                entry.path,
                                                event.target.value
                                              );
                                            }}
                                          />
                                        ) : (
                                          <Input
                                            value={entry.value}
                                            onChange={(event) => {
                                              updateParameterValue(
                                                selectedSegment.id,
                                                entry.path,
                                                event.target.value
                                              );
                                            }}
                                          />
                                        )
                                      ) : null}

                                    {entry.resolvedSelector === 'json' ||
                                    !(
                                      (entry.recommendation.baseKind === 'boolean' &&
                                        typeof entry.value === 'boolean') ||
                                      (entry.recommendation.baseKind === 'enum' &&
                                        typeof entry.value === 'string') ||
                                      (entry.recommendation.baseKind === 'number' &&
                                        promptExploderIsFiniteNumber(entry.value)) ||
                                      (entry.recommendation.baseKind === 'rgb' &&
                                        isParamArrayTupleLength(entry.value, 3)) ||
                                      (entry.recommendation.baseKind === 'tuple2' &&
                                        isParamArrayTupleLength(entry.value, 2)) ||
                                      (entry.recommendation.baseKind === 'string' &&
                                        typeof entry.value === 'string')
                                    ) ? (
                                        <Textarea
                                          className='min-h-[86px] font-mono text-[11px]'
                                          value={promptExploderSafeJsonStringify(entry.value)}
                                          onChange={(event) => {
                                            updateParameterValue(
                                              selectedSegment.id,
                                              entry.path,
                                              sanitizeParamJsonValue(event.target.value, entry.value)
                                            );
                                          }}
                                        />
                                      ) : null}
                                  </div>
                                </div>

                                <div className='grid gap-2 md:grid-cols-2'>
                                  <div className='space-y-1'>
                                    <Label className='text-[10px] text-gray-500'>Comment</Label>
                                    <Input
                                      value={entry.comment}
                                      placeholder='Inline comment'
                                      onChange={(event) => {
                                        updateParameterComment(
                                          selectedSegment.id,
                                          entry.path,
                                          event.target.value
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[10px] text-gray-500'>Description</Label>
                                    <Textarea
                                      className='min-h-[72px] text-[11px]'
                                      value={entry.description}
                                      placeholder='Description above this parameter'
                                      onChange={(event) => {
                                        updateParameterDescription(
                                          selectedSegment.id,
                                          entry.path,
                                          event.target.value
                                        );
                                      }}
                                    />
                                  </div>
                                </div>

                                {entry.selector === 'auto' && entry.recommendation.reason ? (
                                  <div className='text-[10px] text-gray-500'>
                                    Auto selector note: {entry.recommendation.reason}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className='text-xs text-gray-500'>
                            No leaf parameters detected in the current params object.
                          </div>
                        )
                      ) : (
                        <div className='text-xs text-gray-500'>
                          {'No parseable `params = { ... }` object detected yet.'}
                        </div>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-[11px] text-gray-400'>Parameters Text</Label>
                      <Textarea
                        className='min-h-[220px] font-mono text-[12px]'
                        value={selectedSegment.paramsText || selectedSegment.text}
                        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                          const nextText = event.target.value;
                          updateSegment(selectedSegment.id, (current) => {
                            const extracted = extractParamsFromPrompt(nextText);
                            if (!extracted.ok) {
                              return {
                                ...current,
                                paramsText: nextText,
                                text: nextText,
                                raw: nextText,
                                paramsObject: null,
                                paramUiControls: {},
                                paramComments: {},
                                paramDescriptions: {},
                              };
                            }
                            const nextParamState = buildPromptExploderParamEntries({
                              paramsObject: extracted.params,
                              paramsText: nextText,
                              paramUiControls: current.paramUiControls ?? null,
                              paramComments: current.paramComments ?? null,
                              paramDescriptions: current.paramDescriptions ?? null,
                            });
                            return {
                              ...current,
                              paramsText: nextText,
                              text: nextText,
                              raw: nextText,
                              paramsObject: extracted.params,
                              paramUiControls: nextParamState.paramUiControls,
                              paramComments: nextParamState.paramComments,
                              paramDescriptions: nextParamState.paramDescriptions,
                            };
                          });
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* ── List items editor ────────────────────────────────────── */}
                {['list', 'referential_list', 'conditional_list'].includes(
                  selectedSegment.type
                ) ? (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-[11px] text-gray-400'>List Items</Label>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            updateSegment(selectedSegment.id, (current) => ({
                              ...current,
                              listItems: promptExploderAddBlankListItem(current.listItems),
                            }));
                          }}
                        >
                          <Plus className='mr-2 size-3.5' />
                        Add Item
                        </Button>
                      </div>
                      {selectedSegment.listItems.length === 0 ? (
                        <div className='text-xs text-gray-500'>No list items detected.</div>
                      ) : null}
                      <div className='space-y-2'>
                        {selectedSegment.listItems.map((item, index) => (
                          <div
                            key={item.id}
                            className={`relative rounded border border-border/50 bg-card/20 p-2 ${draggingListItemIndex === index ? 'opacity-60' : ''}`}
                            onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                              handleListItemDragOver(event, index);
                            }}
                            onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                              handleListItemDrop(event, index);
                            }}
                          >
                            {listItemDropTargetIndex === index && listItemDropPosition === 'before' ? (
                              <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-blue-400' />
                            ) : null}
                            {listItemDropTargetIndex === index && listItemDropPosition === 'after' ? (
                              <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-blue-400' />
                            ) : null}
                            {(() => {
                              const rgbLiteral = extractRgbLiteral(item.text);
                              return (
                                <div className='flex items-center gap-1'>
                                  <button
                                    type='button'
                                    className='inline-flex size-9 items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 transition-colors hover:bg-card/70 hover:text-gray-100 active:cursor-grabbing'
                                    aria-label='Drag to reorder list item'
                                    draggable
                                    onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                                      event.stopPropagation();
                                    }}
                                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                      event.stopPropagation();
                                    }}
                                    onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                                      event.stopPropagation();
                                      handleListItemDragStart(index);
                                    }}
                                    onDragEnd={() => {
                                      handleListItemDragEnd();
                                    }}
                                  >
                                    <GripVertical className='size-3.5' />
                                  </button>
                                  <Input
                                    value={item.text}
                                    onChange={(event) => {
                                      updateTopLevelListItem(selectedSegment.id, index, (currentItem) => ({
                                        ...currentItem,
                                        text: event.target.value,
                                      }));
                                    }}
                                  />
                                  {rgbLiteral ? (
                                    <input
                                      type='color'
                                      className='h-9 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-1'
                                      value={rgbToHex(rgbLiteral)}
                                      onChange={(event) => {
                                        const parsed = hexToRgb(event.target.value);
                                        if (!parsed) return;
                                        updateTopLevelListItem(selectedSegment.id, index, (currentItem) => ({
                                          ...currentItem,
                                          text: replaceRgbLiteral(currentItem.text, parsed),
                                        }));
                                      }}
                                      aria-label='RGB color picker'
                                    />
                                  ) : null}
                                </div>
                              );
                            })()}
                            {renderListItemLogicalEditor({
                              item,
                              onChange: (updater) => {
                                updateTopLevelListItem(selectedSegment.id, index, updater);
                              },
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                {/* ── Hierarchical list editor ─────────────────────────────── */}
                {selectedSegment.type === 'hierarchical_list' ? (
                  <PromptExploderHierarchyTreeProvider
                    value={{
                      items: selectedSegment.listItems,
                      onChange: (nextItems) => {
                        updateSegment(selectedSegment.id, (current) => ({
                          ...current,
                          listItems: nextItems,
                        }));
                      },
                      renderLogicalEditor: ({ item, onChange }) =>
                        renderListItemLogicalEditor({
                          item,
                          onChange,
                        }),
                      emptyLabel: 'No hierarchy items detected.',
                    }}
                  >
                    <PromptExploderHierarchyTreeEditor />
                  </PromptExploderHierarchyTreeProvider>
                ) : null}

                {/* ── Sequence / QA matrix subsections ────────────────────── */}
                {selectedSegment.type === 'sequence' || selectedSegment.type === 'qa_matrix' ? (
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                        {selectedSegment.type === 'qa_matrix' ? 'QA Subsections' : 'Sequence Subsections'}
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          updateSegment(selectedSegment.id, (current) => ({
                            ...current,
                            subsections: [...current.subsections, promptExploderCreateSubsection()],
                          }));
                        }}
                      >
                        <Plus className='mr-2 size-3.5' />
                        Add Subsection
                      </Button>
                    </div>
                    {selectedSegment.subsections.length === 0 ? (
                      <div className='text-xs text-gray-500'>No subsections detected.</div>
                    ) : null}
                    {selectedSegment.subsections.map((subsection, subsectionIndex) => (
                      <div key={subsection.id} className='space-y-2 rounded border border-border/50 bg-card/20 p-2'>
                        <div className='flex items-center justify-between'>
                          <div className='text-[11px] text-gray-400'>
                            Subsection {subsectionIndex + 1}
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              disabled={subsectionIndex === 0}
                              onClick={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  subsections: moveByDelta(current.subsections, subsectionIndex, -1),
                                }));
                              }}
                            >
                              <ArrowUp className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              disabled={subsectionIndex === selectedSegment.subsections.length - 1}
                              onClick={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  subsections: moveByDelta(current.subsections, subsectionIndex, 1),
                                }));
                              }}
                            >
                              <ArrowDown className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  subsections: current.subsections.filter(
                                    (_, index) => index !== subsectionIndex
                                  ),
                                }));
                              }}
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                        <div className='grid gap-2 md:grid-cols-2'>
                          <Input
                            value={subsection.title}
                            onChange={(event) => {
                              updateSegment(selectedSegment.id, (current) => {
                                const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                  candidateIndex === subsectionIndex
                                    ? {
                                      ...candidate,
                                      title: event.target.value,
                                    }
                                    : candidate
                                );
                                return {
                                  ...current,
                                  subsections: nextSubsections,
                                };
                              });
                            }}
                            placeholder='Subsection title'
                          />
                          <Input
                            value={subsection.code ?? ''}
                            onChange={(event) => {
                              updateSegment(selectedSegment.id, (current) => {
                                const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                  candidateIndex === subsectionIndex
                                    ? {
                                      ...candidate,
                                      code: event.target.value.trim().toUpperCase() || null,
                                    }
                                    : candidate
                                );
                                return {
                                  ...current,
                                  subsections: nextSubsections,
                                };
                              });
                            }}
                            placeholder='Reference code (e.g. RL4)'
                          />
                        </div>
                        <Input
                          value={subsection.condition ?? ''}
                          onChange={(event) => {
                            updateSegment(selectedSegment.id, (current) => {
                              const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                candidateIndex === subsectionIndex
                                  ? {
                                    ...candidate,
                                    condition: event.target.value.trim() || null,
                                  }
                                  : candidate
                              );
                              return {
                                ...current,
                                subsections: nextSubsections,
                              };
                            });
                          }}
                          placeholder='Condition (optional)'
                        />
                        {(() => {
                          const parsedCondition = parseSubsectionConditionText(
                            subsection.condition
                          );
                          const operatorValue = parsedCondition?.operator ?? 'none';
                          const paramPath = parsedCondition?.paramPath ?? '';
                          const comparatorValue =
                            parsedCondition?.comparator ?? 'truthy';
                          const selectedParamEntry = paramPath
                            ? (listParamEntryByPath.get(paramPath) ?? null)
                            : null;
                          const needsValue =
                            operatorValue !== 'none' &&
                            paramPath.length > 0 &&
                            comparatorValue !== 'truthy' &&
                            comparatorValue !== 'falsy';
                          const paramOptions =
                            paramPath && !listParamOptions.some((option) => option.value === paramPath)
                              ? [{ value: paramPath, label: paramPath }, ...listParamOptions]
                              : listParamOptions;

                          const patchCondition = (
                            patch: Partial<{
                              operator: PromptExploderLogicalOperator | null;
                              paramPath: string;
                              comparator: PromptExploderLogicalComparator;
                              value: unknown;
                            }>
                          ): void => {
                            const nextOperator = patch.operator ?? parsedCondition?.operator ?? null;
                            const nextParamPath = patch.paramPath ?? parsedCondition?.paramPath ?? '';
                            const nextComparator =
                              patch.comparator ??
                              parsedCondition?.comparator ??
                              (nextOperator === 'unless' ? 'falsy' : 'truthy');
                            const nextValue =
                              patch.value ?? parsedCondition?.value ?? null;
                            const nextCondition = buildSubsectionConditionText({
                              operator: nextOperator,
                              paramPath: nextParamPath,
                              comparator: nextComparator,
                              value: nextValue,
                            });
                            updateSegment(selectedSegment.id, (current) => {
                              const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                candidateIndex === subsectionIndex
                                  ? {
                                    ...candidate,
                                    condition: nextCondition,
                                  }
                                  : candidate
                              );
                              return {
                                ...current,
                                subsections: nextSubsections,
                              };
                            });
                          };

                          return (
                            <div className='grid gap-2 md:grid-cols-4'>
                              <div className='space-y-1'>
                                <Label className='text-[10px] text-gray-500'>Operator</Label>
                                <UnifiedSelect
                                  value={operatorValue}
                                  onValueChange={(next: string) => {
                                    if (next === 'none') {
                                      updateSegment(selectedSegment.id, (current) => {
                                        const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                          candidateIndex === subsectionIndex
                                            ? {
                                              ...candidate,
                                              condition: null,
                                            }
                                            : candidate
                                        );
                                        return {
                                          ...current,
                                          subsections: nextSubsections,
                                        };
                                      });
                                      return;
                                    }
                                    patchCondition({
                                      operator: next as PromptExploderLogicalOperator,
                                    });
                                  }}
                                  options={PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }))}
                                />
                              </div>

                              <div className='space-y-1'>
                                <Label className='text-[10px] text-gray-500'>Referenced Param</Label>
                                <UnifiedSelect
                                  value={paramPath}
                                  onValueChange={(next: string) => {
                                    patchCondition({
                                      paramPath: next.trim(),
                                    });
                                  }}
                                  options={
                                    paramOptions.length > 0
                                      ? paramOptions
                                      : [{ value: '', label: 'No parameters available' }]
                                  }
                                />
                              </div>

                              <div className='space-y-1'>
                                <Label className='text-[10px] text-gray-500'>Comparator</Label>
                                <UnifiedSelect
                                  value={comparatorValue}
                                  onValueChange={(next: string) => {
                                    if (!isLogicalComparator(next)) return;
                                    patchCondition({
                                      comparator: next,
                                      value:
                                        next === 'truthy' || next === 'falsy'
                                          ? null
                                          : parsedCondition?.value ?? null,
                                    });
                                  }}
                                  options={PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }))}
                                />
                              </div>

                              <div className='space-y-1'>
                                <Label className='text-[10px] text-gray-500'>Value</Label>
                                {needsValue ? (
                                  selectedParamEntry?.spec?.kind === 'boolean' ? (
                                    <UnifiedSelect
                                      value={String(Boolean(parsedCondition?.value))}
                                      onValueChange={(next: string) => {
                                        patchCondition({
                                          value: next === 'true',
                                        });
                                      }}
                                      options={[
                                        { value: 'true', label: 'true' },
                                        { value: 'false', label: 'false' },
                                      ]}
                                    />
                                  ) : (
                                    <Input
                                      value={formatLogicalValueText(parsedCondition?.value ?? '')}
                                      onChange={(event) => {
                                        patchCondition({
                                          value: parseLogicalValueText(event.target.value),
                                        });
                                      }}
                                    />
                                  )
                                ) : (
                                  <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
                                    {paramPath ? 'Value not needed' : 'Select parameter'}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        <PromptExploderHierarchyTreeProvider
                          value={{
                            items: subsection.items,
                            onChange: (nextItems) => {
                              updateSegment(selectedSegment.id, (current) => {
                                const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                  if (candidateIndex !== subsectionIndex) return candidate;
                                  return {
                                    ...candidate,
                                    items: nextItems,
                                  };
                                });
                                return {
                                  ...current,
                                  subsections: nextSubsections,
                                };
                              });
                            },
                            renderLogicalEditor: ({ item, onChange }) =>
                              renderListItemLogicalEditor({
                                item,
                                onChange,
                              }),
                            emptyLabel: 'No subsection items detected.',
                          }}
                        >
                          <PromptExploderHierarchyTreeEditor />
                        </PromptExploderHierarchyTreeProvider>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* ── Assigned text body ───────────────────────────────────── */}
                {selectedSegment.type === 'assigned_text' ? (
                  <div className='space-y-2'>
                    <Label className='text-[11px] text-gray-400'>Body</Label>
                    <Textarea
                      className='min-h-[180px] font-mono text-[12px]'
                      value={selectedSegment.text}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                        updateSegment(selectedSegment.id, (current) => ({
                          ...current,
                          text: event.target.value,
                        }));
                      }}
                    />
                  </div>
                ) : null}

                {/* ── Matched rules + template + approval ─────────────────── */}
                <div className='space-y-3 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
                  <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                    Matched Rule Insights
                  </div>
                  {matchedRuleDetails.length === 0 ? (
                    <div className='text-[11px] text-gray-500'>
                      No matched patterns for this segment.
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {matchedRuleDetails.map((matchedRule) => (
                        <div
                          key={matchedRule.id}
                          className='rounded border border-border/50 bg-card/20 p-2'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <span className='truncate text-[11px] font-medium text-gray-200'>
                              {matchedRule.title}
                            </span>
                            <span className='rounded border border-border/50 bg-card/40 px-1 py-0.5 text-[10px] text-gray-300'>
                              {matchedRule.segmentType ?? 'no type hint'}
                            </span>
                          </div>
                          <div className='mt-1 text-[10px] text-gray-500'>
                            id: <span className='font-mono'>{matchedRule.id}</span> · priority{' '}
                            {matchedRule.priority} · boost{' '}
                            {matchedRule.confidenceBoost.toFixed(2)} · heading{' '}
                            {matchedRule.treatAsHeading ? 'yes' : 'no'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className='border-t border-border/60 pt-3'>
                    <div className='mb-1 text-[11px] uppercase tracking-wide text-gray-400'>
                      Similar Learned Templates
                    </div>
                    <div className='grid gap-2 md:grid-cols-2'>
                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Template Merge Mode</Label>
                        <UnifiedSelect
                          value={approvalDraft.templateMergeMode}
                          onValueChange={(value: string) => {
                            const nextMode = value as TemplateMergeMode;
                            setApprovalDraft((previous) => ({
                              ...previous,
                              templateMergeMode: nextMode,
                              templateTargetId:
                                nextMode === 'target'
                                  ? (previous.templateTargetId ||
                                    templateTargetOptions[0]?.value ||
                                    '')
                                  : '',
                            }));
                          }}
                          options={[
                            { value: 'auto', label: 'Auto (exact/similar)' },
                            { value: 'new', label: 'Force New Template' },
                            { value: 'target', label: 'Merge Into Selected Template' },
                          ]}
                        />
                      </div>
                      {approvalDraft.templateMergeMode === 'target' ? (
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Merge Target Template</Label>
                          <UnifiedSelect
                            value={approvalDraft.templateTargetId}
                            onValueChange={(value: string) => {
                              setApprovalDraft((previous) => ({
                                ...previous,
                                templateTargetId: value,
                              }));
                            }}
                            options={
                              templateTargetOptions.length > 0
                                ? templateTargetOptions
                                : [{ value: '', label: 'No templates for this type' }]
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className='mb-2 text-[10px] text-gray-500'>
                      Merge eligibility: same segment type + score &gt;=
                      {' '}{templateMergeThreshold.toFixed(2)}
                    </div>
                    {similarTemplateCandidates.length === 0 ? (
                      <div className='text-[11px] text-gray-500'>
                        No nearby learned templates for this segment yet.
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        {similarTemplateCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className='rounded border border-border/50 bg-card/20 p-2'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <span className='truncate text-[11px] font-medium text-gray-200'>
                                {candidate.title}
                              </span>
                              <span
                                className={`rounded border px-1 py-0.5 text-[10px] ${
                                  candidate.mergeEligible
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                    : 'border-border/50 bg-card/40 text-gray-300'
                                }`}
                              >
                                {candidate.mergeEligible ? 'merge target' : 'candidate'}
                              </span>
                            </div>
                            <div className='mt-1 text-[10px] text-gray-500'>
                              score {(candidate.score * 100).toFixed(1)}% ·
                              {' '}type {candidate.segmentType} ·
                              {' '}state {candidate.state} · approvals {candidate.approvals}
                            </div>
                            <div className='mt-1 flex justify-end'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    templateMergeMode: 'target',
                                    templateTargetId: candidate.id,
                                  }));
                                }}
                              >
                                Use Target
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='border-t border-border/60 pt-3'>
                    <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
                      Approval Rule Draft
                    </div>
                    <div className='grid gap-2 md:grid-cols-2'>
                      <div className='space-y-1 md:col-span-2'>
                        <Label className='text-[11px] text-gray-400'>Rule Title</Label>
                        <Input
                          value={approvalDraft.ruleTitle}
                          onChange={(event) => {
                            setApprovalDraft((previous) => ({
                              ...previous,
                              ruleTitle: event.target.value,
                            }));
                          }}
                        />
                      </div>
                      <div className='space-y-1 md:col-span-2'>
                        <Label className='text-[11px] text-gray-400'>Rule Pattern</Label>
                        <Textarea
                          className='min-h-[70px] font-mono text-[12px]'
                          value={approvalDraft.rulePattern}
                          onChange={(event) => {
                            setApprovalDraft((previous) => ({
                              ...previous,
                              rulePattern: event.target.value,
                            }));
                          }}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Segment Type Hint</Label>
                        <UnifiedSelect
                          value={approvalDraft.ruleSegmentType}
                          onValueChange={(value: string) => {
                            const nextSegmentType = value as PromptExploderSegment['type'];
                            setApprovalDraft((previous) => ({
                              ...previous,
                              ruleSegmentType: nextSegmentType,
                              templateTargetId:
                                previous.templateMergeMode === 'target'
                                  ? (effectiveLearnedTemplates.find(
                                    (template) =>
                                      template.id === previous.templateTargetId &&
                                      template.segmentType === nextSegmentType
                                  )?.id ??
                                    effectiveLearnedTemplates.find(
                                      (template) =>
                                        template.segmentType === nextSegmentType
                                    )?.id ??
                                    '')
                                  : previous.templateTargetId,
                              templateMergeMode:
                                previous.templateMergeMode === 'target' &&
                                !effectiveLearnedTemplates.some(
                                  (template) =>
                                    template.id === previous.templateTargetId &&
                                    template.segmentType === nextSegmentType
                                ) &&
                                !effectiveLearnedTemplates.some(
                                  (template) =>
                                    template.segmentType === nextSegmentType
                                )
                                  ? 'auto'
                                  : previous.templateMergeMode,
                            }));
                          }}
                          options={[
                            { value: 'metadata', label: 'Metadata' },
                            { value: 'assigned_text', label: 'Assigned Text' },
                            { value: 'list', label: 'List' },
                            { value: 'parameter_block', label: 'Parameter Block' },
                            { value: 'referential_list', label: 'Referential List' },
                            { value: 'sequence', label: 'Sequence' },
                            { value: 'hierarchical_list', label: 'Hierarchical List' },
                            { value: 'conditional_list', label: 'Conditional List' },
                            { value: 'qa_matrix', label: 'QA Matrix' },
                          ]}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Priority</Label>
                        <Input
                          type='number'
                          min={-50}
                          max={50}
                          step={1}
                          value={String(approvalDraft.rulePriority)}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (!Number.isFinite(value)) return;
                            setApprovalDraft((previous) => ({
                              ...previous,
                              rulePriority: promptExploderClampNumber(Math.floor(value), -50, 50),
                            }));
                          }}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Confidence Boost</Label>
                        <Input
                          type='number'
                          min={0}
                          max={0.5}
                          step={0.05}
                          value={approvalDraft.ruleConfidenceBoost.toFixed(2)}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (!Number.isFinite(value)) return;
                            setApprovalDraft((previous) => ({
                              ...previous,
                              ruleConfidenceBoost: promptExploderClampNumber(value, 0, 0.5),
                            }));
                          }}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Treat As Heading</Label>
                        <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                          <StatusToggle
                            enabled={approvalDraft.ruleTreatAsHeading}
                            onToggle={() => {
                              setApprovalDraft((previous) => ({
                                ...previous,
                                ruleTreatAsHeading: !previous.ruleTreatAsHeading,
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className='mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-500'>
                      <span>Approvals train fuzzy recognition and save this rule draft into validator patterns.</span>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setApprovalDraft(
                              createApprovalDraftFromSegment(selectedSegment)
                            );
                          }}
                        >
                          Reset Draft
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            void handleApproveSelectedSegmentPattern();
                          }}
                          disabled={isBusy}
                        >
                          Approve Pattern
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </FormSection>
  );
}
