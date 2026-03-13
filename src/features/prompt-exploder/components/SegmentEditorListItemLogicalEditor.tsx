'use client';

import { Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { Button, Input, Label, SelectSimple, Card } from '@/shared/ui';

import { useDocumentState } from '../context/hooks/useDocument';
import { promptExploderSafeJsonStringify } from '../helpers/formatting';
import {
  createLogicalCondition,
  PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS,
  isLogicalComparator,
  isLogicalJoin,
} from '../helpers/logical-conditions';
import { sanitizeParamJsonValue } from '../params-editor';

import type {
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalOperator,
} from '../types';

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
      value: comparator === 'truthy' || comparator === 'falsy' ? null : (condition.value ?? null),
      joinWithPrevious: index === 0 ? null : condition.joinWithPrevious === 'or' ? 'or' : 'and',
    });
  });
}

function getEditableLogicalConditions(
  item: PromptExploderListItem
): PromptExploderLogicalCondition[] {
  if ((item.logicalConditions ?? []).length > 0) {
    return item.logicalConditions ?? [];
  }
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
      : (next.logicalConditions ?? []);

  const logicalConditions = normalizeLogicalConditionList(next, sourcedConditions, logicalOperator);

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

export function SegmentEditorListItemLogicalEditor(args: {
  item: PromptExploderListItem;
  onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
}): React.JSX.Element {
  const { item, onChange } = args;
  const { listParamOptions, listParamEntryByPath } = useDocumentState();
  const operatorValue = item.logicalOperator ?? 'none';
  const logicalConditions = operatorValue === 'none' ? [] : getEditableLogicalConditions(item);

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
    <Card
      variant='subtle-compact'
      padding='sm'
      className='mt-2 space-y-2 border-border/50 bg-card/20'
    >
      <div className='space-y-1'>
        <Label className='text-[10px] text-gray-500'>Logical Operator</Label>
        <SelectSimple
          size='sm'
          value={operatorValue}
          ariaLabel='Logical operator'
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
                    <Card
                      variant='subtle-compact'
                      padding='none'
                      className='h-9 flex items-center border-dashed border-border/60 bg-card/20 px-2 text-[11px] text-gray-500'
                    >
                      START
                    </Card>
                  ) : (
                    <SelectSimple
                      size='sm'
                      value={condition.joinWithPrevious === 'or' ? 'or' : 'and'}
                      ariaLabel='Condition join'
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
                  <SelectSimple
                    size='sm'
                    value={selectedParamPath}
                    ariaLabel='Referenced parameter'
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
                  <SelectSimple
                    size='sm'
                    value={comparatorValue}
                    ariaLabel='Comparator'
                    onValueChange={(next: string) => {
                      if (!isLogicalComparator(next)) return;
                      updateCondition(conditionIndex, {
                        comparator: next,
                        value:
                          next === 'truthy' || next === 'falsy' ? null : (condition.value ?? null),
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
                      <SelectSimple
                        size='sm'
                        value={String(Boolean(condition.value))}
                        ariaLabel='Condition value'
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
                        <SelectSimple
                          size='sm'
                          value={String(
                            condition.value ?? selectedParamEntry.spec.enumOptions[0] ?? ''
                          )}
                          ariaLabel='Condition value'
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
                          aria-label='Condition value'
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
                          aria-label='Condition value'
                          onChange={(event) => {
                            const rawValue = event.target.value;
                            if (
                              selectedParamEntry?.spec?.kind === 'rgb' ||
                            selectedParamEntry?.spec?.kind === 'tuple2' ||
                            selectedParamEntry?.spec?.kind === 'json'
                            ) {
                              updateCondition(conditionIndex, {
                                value: sanitizeParamJsonValue(rawValue, condition.value),
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
                    <Card
                      variant='subtle-compact'
                      padding='none'
                      className='h-9 flex items-center border-dashed border-border/60 bg-card/20 px-2 text-[11px] text-gray-500'
                    >
                      {selectedParamPath ? 'Value not needed' : 'Select parameter'}
                    </Card>
                  )}
                </div>

                <div className='space-y-1'>
                  <Label className='text-[10px] text-gray-500'>Actions</Label>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-9 w-full px-2'
                    aria-label='Remove condition'
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
        <Card
          variant='subtle-compact'
          padding='none'
          className='h-9 flex items-center border-dashed border-border/60 bg-card/20 px-2 text-[11px] text-gray-500'
        >
          No condition
        </Card>
      )}
    </Card>
  );
}
