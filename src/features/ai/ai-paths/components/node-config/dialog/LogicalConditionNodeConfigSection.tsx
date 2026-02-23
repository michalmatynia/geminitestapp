'use client';

import React from 'react';

import type { LogicalConditionConfig, LogicalConditionItem, LogicalConditionOperator } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, SelectSimple } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const operatorOptions = [
  { value: 'truthy', label: 'Truthy' },
  { value: 'falsy', label: 'Falsy' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Not contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'isEmpty', label: 'Is empty' },
  { value: 'notEmpty', label: 'Not empty' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'greaterThanOrEqual', label: 'Greater or equal' },
  { value: 'lessThanOrEqual', label: 'Less or equal' },
];

const inputPortOptions = [
  { value: 'value', label: 'value' },
  { value: 'result', label: 'result' },
  { value: 'context', label: 'context' },
  { value: 'bundle', label: 'bundle' },
];

const combinatorOptions = [
  { value: 'and', label: 'AND (all must pass)' },
  { value: 'or', label: 'OR (any must pass)' },
];

const NO_COMPARE_TO_OPERATORS = new Set<string>([
  'truthy',
  'falsy',
  'isEmpty',
  'notEmpty',
]);

const STRING_OPERATORS = new Set<string>([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
]);

function generateConditionId(): string {
  return `cond-${Math.random().toString(36).slice(2, 9)}`;
}

export function LogicalConditionNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'logical_condition') return null;

  const config: LogicalConditionConfig = selectedNode.config?.logicalCondition ?? {
    combinator: 'and',
    conditions: [],
  };

  const updateConfig = (patch: Partial<LogicalConditionConfig>): void => {
    updateSelectedNodeConfig({ logicalCondition: { ...config, ...patch } });
  };

  const updateCondition = (index: number, patch: Partial<LogicalConditionItem>): void => {
    const next = config.conditions.map((c, i) =>
      i === index ? { ...c, ...patch } : c
    );
    updateConfig({ conditions: next });
  };

  const removeCondition = (index: number): void => {
    updateConfig({ conditions: config.conditions.filter((_, i) => i !== index) });
  };

  const addCondition = (): void => {
    const newCondition: LogicalConditionItem = {
      id: generateConditionId(),
      inputPort: 'value',
      operator: 'notEmpty',
    };
    updateConfig({ conditions: [...config.conditions, newCondition] });
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Combinator</Label>
        <SelectSimple
          size='sm'
          value={config.combinator}
          onValueChange={(value: string): void =>
            updateConfig({ combinator: value as LogicalConditionConfig['combinator'] })
          }
          options={combinatorOptions}
          placeholder='Select combinator'
          className='mt-2'
        />
      </div>

      <div className='space-y-3'>
        <Label className='text-xs text-gray-400'>Conditions</Label>
        {config.conditions.length === 0 && (
          <div className='rounded-md border border-border bg-card/30 px-3 py-2 text-xs text-gray-500'>
            No conditions — node always passes (valid: true).
          </div>
        )}
        {config.conditions.map((condition, index) => {
          const showCompareTo = !NO_COMPARE_TO_OPERATORS.has(condition.operator);
          const showCaseSensitive = STRING_OPERATORS.has(condition.operator);
          return (
            <div
              key={condition.id ?? index}
              className='rounded-md border border-border bg-card/40 p-3 space-y-2'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='text-xs font-medium text-gray-400'>
                  Condition {index + 1}
                </span>
                <Button
                  type='button'
                  className='rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10'
                  onClick={(): void => removeCondition(index)}
                >
                  Remove
                </Button>
              </div>

              <div>
                <Label className='text-xs text-gray-500'>Input port</Label>
                <SelectSimple
                  size='sm'
                  value={condition.inputPort}
                  onValueChange={(value: string): void =>
                    updateCondition(index, {
                      inputPort: value as LogicalConditionItem['inputPort'],
                    })
                  }
                  options={inputPortOptions}
                  placeholder='Select input port'
                  className='mt-1'
                />
              </div>

              <div>
                <Label className='text-xs text-gray-500'>Field path (optional)</Label>
                <Input
                  className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                  placeholder='e.g. parameters or data.count'
                  value={condition.fieldPath ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateCondition(index, { fieldPath: e.target.value || undefined })
                  }
                />
              </div>

              <div>
                <Label className='text-xs text-gray-500'>Operator</Label>
                <SelectSimple
                  size='sm'
                  value={condition.operator}
                  onValueChange={(value: string): void =>
                    updateCondition(index, { operator: value as LogicalConditionOperator })
                  }
                  options={operatorOptions}
                  placeholder='Select operator'
                  className='mt-1'
                />
              </div>

              {showCompareTo && (
                <div>
                  <Label className='text-xs text-gray-500'>Compare to</Label>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={condition.compareTo ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      updateCondition(index, { compareTo: e.target.value })
                    }
                  />
                </div>
              )}

              {showCaseSensitive && (
                <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
                  <span>Case sensitive</span>
                  <Button
                    type='button'
                    className={`rounded border px-3 py-1 text-xs ${
                      condition.caseSensitive
                        ? 'text-emerald-200 hover:bg-emerald-500/10'
                        : 'text-gray-300 hover:bg-muted/50'
                    }`}
                    onClick={(): void =>
                      updateCondition(index, {
                        caseSensitive: !condition.caseSensitive,
                      })
                    }
                  >
                    {condition.caseSensitive ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <Button
          type='button'
          className='w-full rounded-md border border-border px-3 py-1.5 text-xs text-gray-300 hover:bg-muted/50'
          onClick={addCondition}
        >
          + Add Condition
        </Button>
      </div>
    </div>
  );
}
