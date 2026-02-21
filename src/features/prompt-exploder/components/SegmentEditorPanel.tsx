'use client';

import { GripVertical, Plus } from 'lucide-react';
import React from 'react';

import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';
import {
  Button,
  ActionMenu,
  EmptyState,
  FormSection,
  Input,
  Label,
  StatusToggle,
  Textarea,
  SelectSimple,
  FormField,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Card,
  Badge,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { PromptExploderHierarchyTreeProvider } from './PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from './PromptExploderHierarchyTreeEditor';
import { SegmentEditorInsightsPanel } from './SegmentEditorInsightsPanel';
import { SegmentEditorListItemLogicalEditor } from './SegmentEditorListItemLogicalEditor';
import { SegmentEditorSubsectionsPanel } from './SegmentEditorSubsectionsPanel';
import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';
import {
  useSegmentEditorState,
  useSegmentEditorActions,
} from '../context/hooks/useSegmentEditor';
import { useSettingsState } from '../context/hooks/useSettings';
import {
  promptExploderSafeJsonStringify,
  promptExploderIsFiniteNumber,
  promptExploderInferParamTypeLabel,
} from '../helpers/formatting';
import { extractRgbLiteral, rgbToHex, hexToRgb, replaceRgbLiteral } from '../helpers/rgb';
import {
  promptExploderAddBlankListItem,
} from '../helpers/segment-helpers';
import {
  buildPromptExploderParamEntries,
  isParamArrayTupleLength,
  promptExploderParamUiControlLabel,
  sanitizeParamJsonValue,
} from '../params-editor';

import type {
  PromptExploderListItem,
  PromptExploderSegment,
} from '../types';

function updateListItemAt(
  items: PromptExploderListItem[],
  index: number,
  updater: (item: PromptExploderListItem) => PromptExploderListItem
): PromptExploderListItem[] {
  return items.map((item, itemIndex) =>
    itemIndex === index ? updater(item) : item
  );
}

const promptExploderSupportsSegmentTextSplit = (
  segment: PromptExploderSegment | null
): boolean =>
  Boolean(
    segment &&
      (segment.type === 'assigned_text' ||
        segment.type === 'metadata' ||
        segment.type === 'parameter_block')
  );

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
    addSegmentRelative,
    removeSegment,
    splitSegment,
    mergeSegmentWithPrevious,
    mergeSegmentWithNext,
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
  }): React.JSX.Element => (
    <SegmentEditorListItemLogicalEditor
      item={args.item}
      onChange={args.onChange}
      listParamOptions={listParamOptions}
      listParamEntryByPath={listParamEntryByPath}
    />
  );

  const selectedSegmentIndex = selectedSegmentId
    ? documentState?.segments.findIndex((segment) => segment.id === selectedSegmentId) ?? -1
    : -1;
  const canMergeSelectedWithPrevious = selectedSegmentIndex > 0;
  const canMergeSelectedWithNext =
    selectedSegmentIndex >= 0 &&
    selectedSegmentIndex < (documentState?.segments.length ?? 0) - 1;
  const canSplitSelectedSegment = promptExploderSupportsSegmentTextSplit(selectedSegment);

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
          <Card variant='subtle' padding='sm' className='max-h-[65vh] space-y-2 overflow-auto bg-card/20'>
            {documentState.segments.map((segment: PromptExploderSegment, segmentIndex: number) => {
              const isDropTarget = segmentDropTargetId === segment.id;
              const isDropBefore = isDropTarget && segmentDropPosition === 'before';
              const isDropAfter = isDropTarget && segmentDropPosition === 'after';
              const canSplitSegment = promptExploderSupportsSegmentTextSplit(segment);
              return (
                <div
                  key={segment.id}
                  role='button'
                  tabIndex={0}
                  className={cn(
                    'relative w-full transition-all group',
                    draggingSegmentId === segment.id && 'opacity-60'
                  )}
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
                  <Card
                    variant={selectedSegmentId === segment.id ? 'info' : 'subtle-compact'}
                    padding='sm'
                    className={cn(
                      'text-left text-xs transition-colors',
                      selectedSegmentId === segment.id ? 'bg-primary/10 border-primary/40 text-gray-100' : 'border-border/50 bg-card/30 text-gray-300 hover:border-primary/30 hover:bg-card/50'
                    )}
                  >
                    {isDropBefore ? (
                      <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' />
                    ) : null}
                    {isDropAfter ? (
                      <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' />
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
                      <div className='flex items-center gap-1'>
                        <Badge variant='neutral' className='bg-card/50 px-1 py-0 text-[9px] font-normal uppercase'>
                          {segment.type.replaceAll('_', ' ')}
                        </Badge>
                        <ActionMenu
                          align='end'
                          ariaLabel='Segment actions'
                          triggerClassName='h-6 w-6 text-gray-400 hover:text-gray-100'
                        >
                          <DropdownMenuItem
                            onSelect={() => {
                              addSegmentRelative(segment.id, 'before');
                            }}
                          >
                            Add Segment Above
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              addSegmentRelative(segment.id, 'after');
                            }}
                          >
                            Add Segment Below
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!canSplitSegment}
                            onSelect={() => {
                              splitSegment(segment.id, segment.text.length, segment.text.length);
                            }}
                          >
                            Split at End
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={segmentIndex === 0}
                            onSelect={() => {
                              mergeSegmentWithPrevious(segment.id);
                            }}
                          >
                            Merge with Previous
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={segmentIndex === documentState.segments.length - 1}
                            onSelect={() => {
                              mergeSegmentWithNext(segment.id);
                            }}
                          >
                            Merge with Next
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-red-300 focus:text-red-200'
                            onSelect={() => {
                              removeSegment(segment.id);
                            }}
                          >
                            Remove Segment
                          </DropdownMenuItem>
                        </ActionMenu>
                      </div>
                    </div>
                    <div className='mt-1 flex items-center justify-between text-[10px] text-gray-500'>
                      <span>Confidence {(segment.confidence * 100).toFixed(0)}%</span>
                      <span>{segment.includeInOutput ? 'Included' : 'Omitted'}</span>
                    </div>
                  </Card>
                </div>
              );
            })}
          </Card>

          {/* ── Segment detail editor ────────────────────────────────────── */}
          <Card variant='subtle' padding='md' className='max-h-[65vh] space-y-3 overflow-auto bg-card/20'>
            {!selectedSegment ? (
              <div className='text-sm text-gray-500'>Select a segment to edit.</div>
            ) : (
              <>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      addSegmentRelative(selectedSegment.id, 'before');
                    }}
                  >
                    Add Above
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      addSegmentRelative(selectedSegment.id, 'after');
                    }}
                  >
                    Add Below
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={!canSplitSelectedSegment}
                    onClick={() => {
                      splitSegment(
                        selectedSegment.id,
                        selectedSegment.text.length,
                        selectedSegment.text.length
                      );
                    }}
                  >
                    Split at End
                    <span className='ml-2 text-[10px] text-gray-400'>Ctrl+Enter</span>
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={!canMergeSelectedWithPrevious}
                    onClick={() => {
                      mergeSegmentWithPrevious(selectedSegment.id);
                    }}
                  >
                    Merge Prev
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={!canMergeSelectedWithNext}
                    onClick={() => {
                      mergeSegmentWithNext(selectedSegment.id);
                    }}
                  >
                    Merge Next
                  </Button>
                  <Button
                    type='button'
                    variant='destructive'
                    size='sm'
                    onClick={() => {
                      removeSegment(selectedSegment.id);
                    }}
                  >
                    Remove
                    <span className='ml-2 text-[10px] text-red-100/80'>
                      Ctrl+Shift+Backspace
                    </span>
                  </Button>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <FormField label='Type'>
                    <SelectSimple size='sm'
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
                  </FormField>
                  <FormField label='Include In Output'>
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
                  </FormField>
                </div>

                <FormField label='Title'>
                  <Input
                    value={selectedSegment.title}
                    onChange={(event) => {
                      updateSegment(selectedSegment.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }));
                    }}
                  />
                </FormField>

                {selectedSegment.type === 'metadata' ? (
                  <FormField label='Metadata Mode'>
                    <SelectSimple size='sm'
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
                  </FormField>
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
                                  <FormField label='Selector' className='space-y-1'>
                                    <SelectSimple size='sm'
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
                                  </FormField>

                                  <FormField label='Value' className='space-y-1'>

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
                                          <SelectSimple size='sm'
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
                                          <SelectSimple size='sm'
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
                                                value={String((entry.value as unknown[])[index] ?? '')}
                                                min={entry.spec?.min ?? 0}
                                                max={entry.spec?.max ?? 255}
                                                step={entry.spec?.step ?? 1}
                                                onChange={(event) => {
                                                  const next = Number(event.target.value);
                                                  if (!Number.isFinite(next)) return;
                                                  const nextRgb = [...(entry.value as unknown[])];
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
                                                value={String((entry.value as unknown[])[index] ?? '')}
                                                min={entry.spec?.min}
                                                max={entry.spec?.max}
                                                step={entry.spec?.step ?? 1}
                                                onChange={(event) => {
                                                  const next = Number(event.target.value);
                                                  if (!Number.isFinite(next)) return;
                                                  const nextTuple = [...(entry.value as unknown[])];
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
                                  </FormField>
                                </div>

                                <div className='grid gap-2 md:grid-cols-2'>
                                  <FormField label='Comment' className='space-y-1'>
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
                                  </FormField>
                                  <FormField label='Description' className='space-y-1'>
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
                                  </FormField>
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

                    <FormField label='Parameters Text'>
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
                    </FormField>
                  </div>
                ) : null}

                {/* ── List items editor ────────────────────────────────────── */}
                {['list', 'referential_list', 'conditional_list'].includes(
                  selectedSegment.type
                ) ? (
                    <FormField
                      label='List Items'
                      actions={
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
                      }
                    >
                      {selectedSegment.listItems.length === 0 ? (
                        <div className='text-xs text-gray-500'>No list items detected.</div>
                      ) : null}
                      <div className='space-y-2'>
                        {selectedSegment.listItems.map((item: PromptExploderListItem, index: number) => (
                          <div
                            key={item.id}
                            className={cn(
                              'relative transition-all',
                              draggingListItemIndex === index && 'opacity-60'
                            )}
                            onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                              handleListItemDragOver(event, index);
                            }}
                            onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                              handleListItemDrop(event, index);
                            }}
                          >
                            <Card
                              variant='subtle-compact'
                              padding='sm'
                              className='border-border/50 bg-card/20'
                            >
                              {listItemDropTargetIndex === index && listItemDropPosition === 'before' ? (
                                <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' />
                              ) : null}
                              {listItemDropTargetIndex === index && listItemDropPosition === 'after' ? (
                                <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' />
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
                            </Card>
                          </div>
                        ))}
                      </div>
                    </FormField>
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
                  <SegmentEditorSubsectionsPanel
                    segment={selectedSegment}
                    listParamOptions={listParamOptions}
                    listParamEntryByPath={listParamEntryByPath}
                    onUpdateSegment={(updater) => {
                      updateSegment(selectedSegment.id, updater);
                    }}
                    renderListItemLogicalEditor={renderListItemLogicalEditor}
                  />
                ) : null}

                {/* ── Assigned text body ───────────────────────────────────── */}
                {selectedSegment.type === 'assigned_text' ? (
                  <FormField label='Body'>
                    <Textarea
                      className='min-h-[180px] font-mono text-[12px]'
                      value={selectedSegment.text}
                      onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                        const isModifier = event.metaKey || event.ctrlKey;
                        if (
                          isModifier &&
                          event.shiftKey &&
                          event.key === 'Backspace'
                        ) {
                          event.preventDefault();
                          removeSegment(selectedSegment.id);
                          return;
                        }
                        if (isModifier && event.key === 'Enter') {
                          event.preventDefault();
                          const element = event.currentTarget;
                          const start = element.selectionStart ?? 0;
                          const end = element.selectionEnd ?? start;
                          splitSegment(selectedSegment.id, start, end);
                        }
                      }}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const nextText = event.target.value;
                        updateSegment(selectedSegment.id, (current) => ({
                          ...current,
                          text: nextText,
                          raw: nextText,
                        }));
                      }}
                    />
                  </FormField>
                ) : null}

                {/* ── Matched rules + template + approval ─────────────────── */}
                <SegmentEditorInsightsPanel
                  selectedSegment={selectedSegment}
                />
              </>
            )}
          </Card>
        </div>
      )}
    </FormSection>
  );
}
