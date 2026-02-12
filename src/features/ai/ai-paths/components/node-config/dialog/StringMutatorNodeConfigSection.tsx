'use client';

import React, { useState } from 'react';

import type { StringMutatorOperation } from '@/features/ai/ai-paths/lib';
import {
  Button,
  Input,
  Label,
  UnifiedSelect,
  Switch,
} from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const OPERATION_LABELS: Record<StringMutatorOperation['type'], string> = {
  trim: 'Trim',
  replace: 'Replace',
  remove: 'Remove',
  case: 'Case',
  append: 'Append',
  slice: 'Slice',
};

const createOperation = (
  type: StringMutatorOperation['type']
): StringMutatorOperation => {
  switch (type) {
    case 'trim':
      return { type: 'trim', mode: 'both' };
    case 'replace':
      return { type: 'replace', search: '', replace: '', matchMode: 'all', useRegex: false, flags: '' };
    case 'remove':
      return { type: 'remove', search: '', matchMode: 'all', useRegex: false, flags: '' };
    case 'case':
      return { type: 'case', mode: 'lower' };
    case 'append':
      return { type: 'append', value: '', position: 'suffix' };
    case 'slice':
      return { type: 'slice', start: 0 };
    default:
      return { type: 'replace', search: '', replace: '', matchMode: 'all', useRegex: false, flags: '' };
  }
};

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function StringMutatorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode || selectedNode.type !== 'string_mutator') return null;

  const stringConfig = selectedNode.config?.stringMutator ?? { operations: [] };
  const operations = Array.isArray(stringConfig.operations)
    ? stringConfig.operations
    : [];
  const [newType, setNewType] = useState<StringMutatorOperation['type']>('replace');

  const updateOperations = (nextOperations: StringMutatorOperation[]): void => {
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
      return operation.id ? { ...base, id: operation.id } : base;
    });
    updateOperations(next);
  };

  const removeOperation = (index: number): void => {
    const next = operations.filter((_, idx) => idx !== index);
    updateOperations(next);
  };

  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border bg-card/50 p-3'>
        <div className='text-[11px] text-gray-400'>Operations</div>
        <div className='mt-3 space-y-3'>
          {operations.length === 0 ? (
            <div className='rounded-md border border-dashed border-border/70 bg-card/30 px-3 py-2 text-xs text-gray-500'>
              No operations yet. Add a step to transform the incoming string.
            </div>
          ) : (
            operations.map((operation: StringMutatorOperation, index: number) => (
              <div key={`${operation.type}-${index}`} className='rounded-md border border-border bg-card/40 p-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <Label className='text-xs text-gray-400'>Operation {index + 1}</Label>
                    <UnifiedSelect
                      value={operation.type}
                      onValueChange={(value: string): void =>
                        replaceOperation(index, value as StringMutatorOperation['type'])
                      }
                      options={Object.entries(OPERATION_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      triggerClassName='h-8 w-[160px] border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                    />
                  </div>
                  <Button
                    type='button'
                    className='rounded-md border border-rose-500/40 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/10'
                    onClick={() => removeOperation(index)}
                  >
                    Remove
                  </Button>
                </div>

                {operation.type === 'trim' && (
                  <div className='mt-3'>
                    <Label className='text-xs text-gray-400'>Trim Mode</Label>
                    <UnifiedSelect
                      value={operation.mode ?? 'both'}
                      onValueChange={(value: string): void =>
                        updateOperation(index, { mode: value as 'both' | 'start' | 'end' })
                      }
                      options={[
                        { value: 'both', label: 'Both' },
                        { value: 'start', label: 'Start' },
                        { value: 'end', label: 'End' },
                      ]}
                      triggerClassName='mt-2 h-8 w-[200px] border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                    />
                  </div>
                )}

                {(operation.type === 'replace' || operation.type === 'remove') && (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    <div>
                      <Label className='text-xs text-gray-400'>
                        {operation.type === 'remove' ? 'Search' : 'Find'}
                      </Label>
                      <Input
                        className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                        value={operation.search ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateOperation(index, { search: event.target.value })
                        }
                        placeholder='Text or pattern'
                      />
                    </div>
                    {operation.type === 'replace' && (
                      <div>
                        <Label className='text-xs text-gray-400'>Replace With</Label>
                        <Input
                          className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                          value={operation.replace ?? ''}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            updateOperation(index, { replace: event.target.value })
                          }
                          placeholder='Replacement text'
                        />
                      </div>
                    )}
                    <div>
                      <Label className='text-xs text-gray-400'>Match Mode</Label>
                      <UnifiedSelect
                        value={operation.matchMode ?? 'all'}
                        onValueChange={(value: string): void =>
                          updateOperation(index, { matchMode: value as 'first' | 'all' })
                        }
                        options={[
                          { value: 'first', label: 'First Match' },
                          { value: 'all', label: 'All Matches' },
                        ]}
                        triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                        contentClassName='border-border bg-gray-900'
                      />
                    </div>
                    <div className='flex items-center justify-between rounded-md border border-border bg-card/70 px-3 py-2'>
                      <div>
                        <div className='text-[11px] text-gray-200'>Use Regex</div>
                        <div className='text-[11px] text-gray-500'>
                          Interpret the search field as a RegExp pattern.
                        </div>
                      </div>
                      <Switch
                        checked={Boolean(operation.useRegex)}
                        onCheckedChange={(checked: boolean): void =>
                          updateOperation(index, { useRegex: checked })
                        }
                      />
                    </div>
                    {operation.useRegex && (
                      <div>
                        <Label className='text-xs text-gray-400'>Regex Flags</Label>
                        <Input
                          className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                          value={operation.flags ?? ''}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            updateOperation(index, { flags: event.target.value })
                          }
                          placeholder='gim'
                        />
                      </div>
                    )}
                  </div>
                )}

                {operation.type === 'case' && (
                  <div className='mt-3'>
                    <Label className='text-xs text-gray-400'>Case Mode</Label>
                    <UnifiedSelect
                      value={operation.mode ?? 'lower'}
                      onValueChange={(value: string): void =>
                        updateOperation(index, { mode: value as 'upper' | 'lower' | 'title' })
                      }
                      options={[
                        { value: 'lower', label: 'Lowercase' },
                        { value: 'upper', label: 'Uppercase' },
                        { value: 'title', label: 'Title Case' },
                      ]}
                      triggerClassName='mt-2 h-8 w-[200px] border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                    />
                  </div>
                )}

                {operation.type === 'append' && (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    <div>
                      <Label className='text-xs text-gray-400'>Append Value</Label>
                      <Input
                        className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                        value={operation.value ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateOperation(index, { value: event.target.value })
                        }
                        placeholder='Text to append'
                      />
                    </div>
                    <div>
                      <Label className='text-xs text-gray-400'>Position</Label>
                      <UnifiedSelect
                        value={operation.position ?? 'suffix'}
                        onValueChange={(value: string): void =>
                          updateOperation(index, { position: value as 'prefix' | 'suffix' })
                        }
                        options={[
                          { value: 'prefix', label: 'Prefix' },
                          { value: 'suffix', label: 'Suffix' },
                        ]}
                        triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                        contentClassName='border-border bg-gray-900'
                      />
                    </div>
                  </div>
                )}

                {operation.type === 'slice' && (
                  <div className='mt-3 grid gap-3 md:grid-cols-2'>
                    <div>
                      <Label className='text-xs text-gray-400'>Start Index</Label>
                      <Input
                        className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                        value={operation.start ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          const val = parseOptionalNumber(event.target.value);
                          updateOperation(index, val !== undefined ? { start: val } : {});
                        }}
                        placeholder='0'
                      />
                    </div>
                    <div>
                      <Label className='text-xs text-gray-400'>End Index</Label>
                      <Input
                        className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
                        value={operation.end ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          const val = parseOptionalNumber(event.target.value);
                          updateOperation(index, val !== undefined ? { end: val } : {});
                        }}
                        placeholder='Leave blank for end'
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <UnifiedSelect
            value={newType}
            onValueChange={(value: string): void =>
              setNewType(value as StringMutatorOperation['type'])
            }
            options={Object.entries(OPERATION_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            triggerClassName='h-8 w-[180px] border-border bg-card/70 text-xs text-white'
            contentClassName='border-border bg-gray-900'
          />
          <Button
            type='button'
            className='rounded-md border text-xs text-white hover:bg-muted/60'
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
