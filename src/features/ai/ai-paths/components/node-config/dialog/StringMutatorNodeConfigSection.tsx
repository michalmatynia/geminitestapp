'use client';

import React, { useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { StringMutatorOperation } from '@/shared/lib/ai-paths';
import {
  Button,
  Input,
  SelectSimple,
  ToggleRow,
  FormField,
  CompactEmptyState,
  insetPanelVariants,
} from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const OPERATION_LABELS: Record<StringMutatorOperation['type'], string> = {
  trim: 'Trim',
  replace: 'Replace',
  remove: 'Remove',
  case: 'Case',
  append: 'Append',
  slice: 'Slice',
};

const OPERATION_OPTIONS: Array<LabeledOptionDto<StringMutatorOperation['type']>> = Object.entries(
  OPERATION_LABELS
).map(([value, label]) => ({
  value: value as StringMutatorOperation['type'],
  label,
}));

const TRIM_MODE_OPTIONS: Array<LabeledOptionDto<'both' | 'left' | 'right'>> = [
  { value: 'both', label: 'Both' },
  { value: 'left', label: 'Start (Left)' },
  { value: 'right', label: 'End (Right)' },
];

const MATCH_MODE_OPTIONS: Array<LabeledOptionDto<'first' | 'all'>> = [
  { value: 'first', label: 'First Match' },
  { value: 'all', label: 'All Matches' },
];

const CASE_MODE_OPTIONS: Array<LabeledOptionDto<'lower' | 'upper'>> = [
  { value: 'lower', label: 'Lowercase' },
  { value: 'upper', label: 'Uppercase' },
];

const APPEND_POSITION_OPTIONS: Array<LabeledOptionDto<'prefix' | 'suffix'>> = [
  { value: 'prefix', label: 'Prefix' },
  { value: 'suffix', label: 'Suffix' },
];

const createOperation = (type: StringMutatorOperation['type']): StringMutatorOperation => {
  switch (type) {
    case 'trim':
      return { type: 'trim', mode: 'both' };
    case 'replace':
      return {
        type: 'replace',
        search: '',
        replace: '',
        matchMode: 'all',
        useRegex: false,
        flags: '',
      };
    case 'remove':
      return { type: 'remove', search: '', matchMode: 'all', useRegex: false, flags: '' };
    case 'case':
      return { type: 'case', mode: 'lower' };
    case 'append':
      return { type: 'append', value: '', position: 'suffix' };
    case 'slice':
      return { type: 'slice', start: 0 };
    default:
      return {
        type: 'replace',
        search: '',
        replace: '',
        matchMode: 'all',
        useRegex: false,
        flags: '',
      };
  }
};

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

type StringMutatorOperationDraft = StringMutatorOperation & { id?: string };

export function StringMutatorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'string_mutator') return null;

  const stringConfig = selectedNode.config?.stringMutator ?? { operations: [] };
  const operations: StringMutatorOperationDraft[] = Array.isArray(stringConfig.operations)
    ? stringConfig.operations
    : [];
  const [newType, setNewType] = useState<StringMutatorOperation['type']>('replace');

  const updateOperations = (nextOperations: StringMutatorOperationDraft[]): void => {
    updateSelectedNodeConfig({
      stringMutator: {
        ...stringConfig,
        operations: nextOperations,
      },
    });
  };

  const updateOperation = (index: number, patch: Partial<StringMutatorOperation>): void => {
    const next = operations.map((operation, idx) =>
      idx === index ? ({ ...operation, ...patch } as StringMutatorOperation) : operation
    );
    updateOperations(next);
  };

  const replaceOperation = (index: number, type: StringMutatorOperation['type']): void => {
    const next = operations.map((operation, idx) => {
      if (idx !== index) return operation;
      const base = createOperation(type);
      return typeof operation.id === 'string' ? { ...base, id: operation.id } : base;
    });
    updateOperations(next);
  };

  const removeOperation = (index: number): void => {
    const next = operations.filter((_, idx) => idx !== index);
    updateOperations(next);
  };

  return (
    <div className='space-y-4'>
      <div
        className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border bg-card/50`}
      >
        <div className='text-[11px] text-gray-400'>Operations</div>
        <div className='mt-3 space-y-3'>
          {operations.length === 0 ? (
            <CompactEmptyState
              title='No operations'
              description='No operations yet. Add a step to transform the incoming string.'
              className='bg-card/30 border-dashed border-border/70 py-4'
             />
          ) : (
            operations.map((operation: StringMutatorOperation, index: number) => (
              <div
                key={`${operation.type}-${index}`}
                className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border`}
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <FormField
                      label={`Operation ${index + 1}`}
                      className='flex-row items-center gap-2 space-y-0'
                    >
                      <SelectSimple
                        size='sm'
                        variant='subtle'
                        value={operation.type}
                        onValueChange={(value: string): void =>
                          replaceOperation(index, value as StringMutatorOperation['type'])
                        }
                        options={OPERATION_OPTIONS}
                        triggerClassName='w-[160px]'
                       ariaLabel={`Operation ${index + 1}`} title={`Operation ${index + 1}`}/>
                    </FormField>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    className='h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10'
                    onClick={() => removeOperation(index)}
                  >
                    Remove
                  </Button>
                </div>

                {operation.type === 'trim' && (
                  <div className='mt-3'>
                    <FormField label='Trim Mode'>
                      <SelectSimple
                        size='sm'
                        variant='subtle'
                        value={operation.mode ?? 'both'}
                        onValueChange={(value: string): void =>
                          updateOperation(index, { mode: value as 'both' | 'left' | 'right' })
                        }
                        options={TRIM_MODE_OPTIONS}
                        triggerClassName='w-[200px]'
                       ariaLabel='Trim Mode' title='Trim Mode'/>
                    </FormField>
                  </div>
                )}

                {(operation.type === 'replace' || operation.type === 'remove') && (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    <FormField label={operation.type === 'remove' ? 'Search' : 'Find'}>
                      <Input
                        variant='subtle'
                        size='sm'
                        value={operation.search ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateOperation(index, { search: event.target.value })
                        }
                        placeholder='Text or pattern'
                       aria-label='Text or pattern' title='Text or pattern'/>
                    </FormField>
                    {operation.type === 'replace' && (
                      <FormField label='Replace With'>
                        <Input
                          variant='subtle'
                          size='sm'
                          value={operation.replace ?? ''}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            updateOperation(index, { replace: event.target.value })
                          }
                          placeholder='Replacement text'
                         aria-label='Replacement text' title='Replacement text'/>
                      </FormField>
                    )}
                    <FormField label='Match Mode'>
                      <SelectSimple
                        size='sm'
                        variant='subtle'
                        value={operation.matchMode ?? 'all'}
                        onValueChange={(value: string): void =>
                          updateOperation(index, { matchMode: value as 'first' | 'all' })
                        }
                        options={MATCH_MODE_OPTIONS}
                        triggerClassName='w-full'
                       ariaLabel='Match Mode' title='Match Mode'/>
                    </FormField>

                    <ToggleRow
                      label='Use Regex'
                      description='Interpret the search field as a RegExp pattern.'
                      checked={Boolean(operation.useRegex)}
                      onCheckedChange={(checked: boolean): void =>
                        updateOperation(index, { useRegex: checked })
                      }
                      className='bg-card/70 border-border/40'
                    />

                    {operation.useRegex && (
                      <FormField label='Regex Flags'>
                        <Input
                          variant='subtle'
                          size='sm'
                          value={operation.flags ?? ''}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            updateOperation(index, { flags: event.target.value })
                          }
                          placeholder='gim'
                          className='font-mono'
                         aria-label='gim' title='gim'/>
                      </FormField>
                    )}
                  </div>
                )}

                {operation.type === 'case' && (
                  <div className='mt-3'>
                    <FormField label='Case Mode'>
                      <SelectSimple
                        size='sm'
                        variant='subtle'
                        value={operation.mode ?? 'lower'}
                        onValueChange={(value: string): void =>
                          updateOperation(index, { mode: value as 'upper' | 'lower' })
                        }
                        options={CASE_MODE_OPTIONS}
                        triggerClassName='w-[200px]'
                       ariaLabel='Case Mode' title='Case Mode'/>
                    </FormField>
                  </div>
                )}

                {operation.type === 'append' && (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    <FormField label='Append Value'>
                      <Input
                        variant='subtle'
                        size='sm'
                        value={operation.value ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateOperation(index, { value: event.target.value })
                        }
                        placeholder='Text to append'
                       aria-label='Text to append' title='Text to append'/>
                    </FormField>
                    <FormField label='Position'>
                      <SelectSimple
                        size='sm'
                        variant='subtle'
                        value={operation.position ?? 'suffix'}
                        onValueChange={(value: string): void =>
                          updateOperation(index, { position: value as 'prefix' | 'suffix' })
                        }
                        options={APPEND_POSITION_OPTIONS}
                        triggerClassName='w-full'
                       ariaLabel='Position' title='Position'/>
                    </FormField>
                  </div>
                )}

                {operation.type === 'slice' && (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    <FormField label='Start Index'>
                      <Input
                        variant='subtle'
                        size='sm'
                        value={operation.start ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          const val = parseOptionalNumber(event.target.value);
                          updateOperation(index, val !== undefined ? { start: val } : {});
                        }}
                        placeholder='0'
                       aria-label='0' title='0'/>
                    </FormField>
                    <FormField label='End Index'>
                      <Input
                        variant='subtle'
                        size='sm'
                        value={operation.end ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          const val = parseOptionalNumber(event.target.value);
                          updateOperation(index, val !== undefined ? { end: val } : {});
                        }}
                        placeholder='Leave blank for end'
                       aria-label='Leave blank for end' title='Leave blank for end'/>
                    </FormField>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={newType}
            onValueChange={(value: string): void =>
              setNewType(value as StringMutatorOperation['type'])
            }
            options={OPERATION_OPTIONS}
            ariaLabel='New operation type'
            triggerClassName='w-[180px]'
           title='Select option'/>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => updateOperations([...operations, createOperation(newType)])}
          >
            Add Operation
          </Button>
        </div>

        <p className='mt-2 text-[11px] text-gray-500'>
          Operations run top to bottom. The output is emitted on the{' '}
          <span className='text-gray-300'>value</span> port.
        </p>
      </div>
    </div>
  );
}
