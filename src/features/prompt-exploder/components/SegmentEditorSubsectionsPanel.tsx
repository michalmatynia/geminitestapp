'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import {
  Button,
  Input,
  SelectSimple,
  FormField,
  SectionHeader,
  Card,
} from '@/shared/ui';

import { PromptExploderHierarchyTreeProvider } from './PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from './PromptExploderHierarchyTreeEditor';
import { useDocumentState, useDocumentActions } from '../context/hooks/useDocument';
import {
  PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS,
  buildSubsectionConditionText,
  formatLogicalValueText,
  isLogicalComparator,
  parseLogicalValueText,
  parseSubsectionConditionText,
} from '../helpers/logical-conditions';
import { promptExploderCreateSubsection } from '../helpers/segment-helpers';
import { moveByDelta } from '../parser';

import type {
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalOperator,
  PromptExploderSegment,
  PromptExploderSubsection,
} from '../types';

export function SegmentEditorSubsectionsPanel(args: {
  segment: PromptExploderSegment;
  renderListItemLogicalEditor: (args: {
    item: PromptExploderListItem;
    onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
  }) => React.JSX.Element;
}): React.JSX.Element | null {
  const {
    segment,
    renderListItemLogicalEditor,
  } = args;
  
  const { listParamOptions, listParamEntryByPath } = useDocumentState();
  const { updateSegment } = useDocumentActions();

  if (segment.type !== 'sequence' && segment.type !== 'qa_matrix') {
    return null;
  }

  const onUpdateSegment = (updater: (current: PromptExploderSegment) => PromptExploderSegment) => {
    updateSegment(segment.id, updater);
  };

  return (
    <div className='space-y-3'>
      <SectionHeader
        title={segment.type === 'qa_matrix' ? 'QA Subsections' : 'Sequence Subsections'}
        size='xxs'
        actions={
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              onUpdateSegment((current) => ({
                ...current,
                subsections: [...current.subsections, promptExploderCreateSubsection()],
              }));
            }}
          >
            <Plus className='mr-2 size-3.5' />
            Add Subsection
          </Button>
        }
      />
      {segment.subsections.length === 0 ? (
        <div className='text-xs text-gray-500'>No subsections detected.</div>
      ) : null}
      {segment.subsections.map((subsection: PromptExploderSubsection, subsectionIndex: number) => (
        <Card key={subsection.id} variant='subtle-compact' padding='md' className='space-y-2 border-border/50 bg-card/20'>
          <SectionHeader
            title={`Subsection ${subsectionIndex + 1}`}
            size='xxs'
            actions={
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={subsectionIndex === 0}
                  onClick={() => {
                    onUpdateSegment((current) => ({
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
                  disabled={subsectionIndex === segment.subsections.length - 1}
                  onClick={() => {
                    onUpdateSegment((current) => ({
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
                    onUpdateSegment((current) => ({
                      ...current,
                      subsections: current.subsections.filter(
                        (_: PromptExploderSubsection, index: number) => index !== subsectionIndex
                      ),
                    }));
                  }}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            }
          />
          <div className='grid gap-2 md:grid-cols-2'>
            <Input
              value={subsection.title}
              onChange={(event) => {
                onUpdateSegment((current) => {
                  const nextSubsections = current.subsections.map((candidate: PromptExploderSubsection, candidateIndex: number) =>
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
                onUpdateSegment((current) => {
                  const nextSubsections = current.subsections.map((candidate: PromptExploderSubsection, candidateIndex: number) =>
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
              onUpdateSegment((current) => {
                const nextSubsections = current.subsections.map((candidate: PromptExploderSubsection, candidateIndex: number) =>
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
              onUpdateSegment((current) => {
                const nextSubsections = current.subsections.map((candidate: PromptExploderSubsection, candidateIndex: number) =>
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
                <FormField label='Operator'>
                  <SelectSimple size='sm'
                    value={operatorValue}
                    onValueChange={(next: string) => {
                      if (next === 'none') {
                        onUpdateSegment((current) => {
                          const nextSubsections = current.subsections.map((candidate: PromptExploderSubsection, candidateIndex: number) =>
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
                </FormField>

                <FormField label='Referenced Param'>
                  <SelectSimple size='sm'
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
                </FormField>

                <FormField label='Comparator'>
                  <SelectSimple size='sm'
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
                </FormField>

                <FormField label='Value'>
                  {needsValue ? (
                    selectedParamEntry?.spec?.kind === 'boolean' ? (
                      <SelectSimple size='sm'
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
                </FormField>
              </div>
            );
          })()}
          <PromptExploderHierarchyTreeProvider
            value={{
              items: subsection.items || [],              onChange: (nextItems) => {
                onUpdateSegment((current) => {
                  const nextSubsections = current.subsections.map((candidate: PromptExploderSubsection, candidateIndex: number) => {
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
        </Card>
      ))}
    </div>
  );
}
