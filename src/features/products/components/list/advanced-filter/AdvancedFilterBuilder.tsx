'use client';

import { Plus, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';

import type {
  ProductAdvancedFilterCombinator,
  ProductAdvancedFilterCondition,
  ProductAdvancedFilterField,
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterRule,
} from '@/shared/contracts/products';
import { Button, Checkbox, Input, Label, SelectSimple } from '@/shared/ui';
import type { SelectSimpleOption } from '@/shared/ui/select-simple';

import {
  ADVANCED_FILTER_FIELD_CONFIGS,
  ADVANCED_OPERATOR_LABELS,
  createEmptyCondition,
  createEmptyGroup,
  getDefaultOperatorForField,
  getFieldConfig,
  isSecondValueRequired,
  isValueRequired,
  normalizeConditionValue,
  supportsOperator,
} from './advanced-filter-utils';

interface AdvancedFilterBuilderProps {
  group: ProductAdvancedFilterGroup;
  onChange: (group: ProductAdvancedFilterGroup) => void;
}

interface GroupEditorProps {
  group: ProductAdvancedFilterGroup;
  onChange: (group: ProductAdvancedFilterGroup) => void;
  onRemove?: (() => void) | undefined;
  isRoot?: boolean | undefined;
  depth?: number | undefined;
}

interface ConditionEditorProps {
  condition: ProductAdvancedFilterCondition;
  onChange: (condition: ProductAdvancedFilterCondition) => void;
  onRemove: () => void;
  disableRemove?: boolean | undefined;
}

const COMBINATOR_OPTIONS: SelectSimpleOption[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

const FIELD_OPTIONS: SelectSimpleOption[] = ADVANCED_FILTER_FIELD_CONFIGS.map(
  (config) => ({
    value: config.field,
    label: config.label,
  })
);

const stripConditionValues = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  const { value: _value, valueTo: _valueTo, ...rest } = condition;
  return rest as ProductAdvancedFilterCondition;
};

const stripConditionValueTo = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  const { valueTo: _valueTo, ...rest } = condition;
  return rest as ProductAdvancedFilterCondition;
};

const AdvancedFilterConditionEditor = memo(function AdvancedFilterConditionEditor({
  condition,
  onChange,
  onRemove,
  disableRemove = false,
}: ConditionEditorProps): React.JSX.Element {
  const fieldConfig = getFieldConfig(condition.field);
  const operatorOptions = useMemo<SelectSimpleOption[]>(
    () =>
      fieldConfig.operators.map((operator) => ({
        value: operator,
        label: ADVANCED_OPERATOR_LABELS[operator],
      })),
    [fieldConfig.operators]
  );
  const inputType = fieldConfig.kind === 'number' ? 'number' : fieldConfig.kind === 'date' ? 'date' : 'text';
  const value = condition.value === undefined || condition.value === null ? '' : String(condition.value);
  const valueTo =
    condition.valueTo === undefined || condition.valueTo === null ? '' : String(condition.valueTo);

  const handleFieldChange = (nextFieldValue: string): void => {
    if (!nextFieldValue) return;
    const nextField = nextFieldValue as ProductAdvancedFilterField;
    const nextOperator = supportsOperator(nextField, condition.operator)
      ? condition.operator
      : getDefaultOperatorForField(nextField);

    let nextCondition: ProductAdvancedFilterCondition = {
      ...condition,
      field: nextField,
      operator: nextOperator,
    };
    if (!isValueRequired(nextOperator)) {
      nextCondition = stripConditionValues(nextCondition);
    } else if (!isSecondValueRequired(nextOperator)) {
      nextCondition = stripConditionValueTo(nextCondition);
    }
    onChange(nextCondition);
  };

  const handleOperatorChange = (nextOperatorValue: string): void => {
    if (!nextOperatorValue) return;
    const nextOperator = nextOperatorValue as ProductAdvancedFilterCondition['operator'];
    let nextCondition: ProductAdvancedFilterCondition = {
      ...condition,
      operator: nextOperator,
    };
    if (!isValueRequired(nextOperator)) {
      nextCondition = stripConditionValues(nextCondition);
    } else if (!isSecondValueRequired(nextOperator)) {
      nextCondition = stripConditionValueTo(nextCondition);
    }
    onChange(nextCondition);
  };

  const handleValueChange = (rawValue: string): void => {
    if (rawValue === '') {
      const { value: _value, ...rest } = condition;
      onChange(rest as ProductAdvancedFilterCondition);
      return;
    }
    onChange({
      ...condition,
      value: normalizeConditionValue(fieldConfig.kind, rawValue),
    });
  };

  const handleValueToChange = (rawValue: string): void => {
    if (rawValue === '') {
      const { valueTo: _valueTo, ...rest } = condition;
      onChange(rest as ProductAdvancedFilterCondition);
      return;
    }
    onChange({
      ...condition,
      valueTo: normalizeConditionValue(fieldConfig.kind, rawValue),
    });
  };

  return (
    <div className='rounded-md border border-border/50 bg-card/20 p-3'>
      <div className='grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Field</Label>
          <SelectSimple
            size='sm'
            value={condition.field}
            onValueChange={handleFieldChange}
            options={FIELD_OPTIONS}
            ariaLabel='Condition field'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Operator</Label>
          <SelectSimple
            size='sm'
            value={condition.operator}
            onValueChange={handleOperatorChange}
            options={operatorOptions}
            ariaLabel='Condition operator'
          />
        </div>

        {isValueRequired(condition.operator) ? (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
              Value
            </Label>
            <Input
              type={inputType}
              value={value}
              onChange={(event) => handleValueChange(event.target.value)}
              className='h-8'
              placeholder='Value'
            />
          </div>
        ) : (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
              Value
            </Label>
            <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
          </div>
        )}

        {isSecondValueRequired(condition.operator) ? (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
              Value To
            </Label>
            <Input
              type={inputType}
              value={valueTo}
              onChange={(event) => handleValueToChange(event.target.value)}
              className='h-8'
              placeholder='Second value'
            />
          </div>
        ) : (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
              Value To
            </Label>
            <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
          </div>
        )}

        <div className='flex items-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRemove}
            disabled={disableRemove}
            className='h-8 px-2'
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
});

const AdvancedFilterGroupEditor = memo(function AdvancedFilterGroupEditor({
  group,
  onChange,
  onRemove,
  isRoot = false,
  depth = 0,
}: GroupEditorProps): React.JSX.Element {
  const handleRuleChange = (ruleId: string, nextRule: ProductAdvancedFilterRule): void => {
    onChange({
      ...group,
      rules: group.rules.map((rule: ProductAdvancedFilterRule) =>
        rule.id === ruleId ? nextRule : rule
      ),
    });
  };

  const handleRemoveRule = (ruleId: string): void => {
    const nextRules = group.rules.filter((rule: ProductAdvancedFilterRule) => rule.id !== ruleId);
    if (nextRules.length > 0) {
      onChange({ ...group, rules: nextRules });
      return;
    }
    onChange({ ...group, rules: [createEmptyCondition()] });
  };

  const handleAddCondition = (): void => {
    onChange({
      ...group,
      rules: [...group.rules, createEmptyCondition()],
    });
  };

  const handleAddGroup = (): void => {
    onChange({
      ...group,
      rules: [...group.rules, createEmptyGroup()],
    });
  };

  const canRemoveLeaf = group.rules.length > 1 || !isRoot;

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/30 p-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='w-28'>
          <SelectSimple
            size='sm'
            value={group.combinator}
            onValueChange={(value: string) =>
              onChange({
                ...group,
                combinator: value as ProductAdvancedFilterCombinator,
              })
            }
            options={COMBINATOR_OPTIONS}
            ariaLabel='Group combinator'
          />
        </div>

        <label className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
          <Checkbox
            checked={group.not}
            onCheckedChange={(checked) =>
              onChange({
                ...group,
                not: checked === true,
              })
            }
          />
          Negate group (NOT)
        </label>

        {!isRoot && onRemove ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={onRemove}
            className='ml-auto h-8 px-2'
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        ) : null}
      </div>

      <div className='space-y-2'>
        {group.rules.map((rule: ProductAdvancedFilterRule) =>
          rule.type === 'condition' ? (
            <AdvancedFilterConditionEditor
              key={rule.id}
              condition={rule}
              onChange={(nextCondition: ProductAdvancedFilterCondition) =>
                handleRuleChange(rule.id, nextCondition)
              }
              onRemove={() => handleRemoveRule(rule.id)}
              disableRemove={!canRemoveLeaf}
            />
          ) : (
            <AdvancedFilterGroupEditor
              key={rule.id}
              group={rule}
              depth={depth + 1}
              onChange={(nextGroup: ProductAdvancedFilterGroup) =>
                handleRuleChange(rule.id, nextGroup)
              }
              onRemove={() => handleRemoveRule(rule.id)}
            />
          )
        )}
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={handleAddCondition}>
          <Plus className='mr-1 h-3.5 w-3.5' />
          Add Condition
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={handleAddGroup}>
          <Plus className='mr-1 h-3.5 w-3.5' />
          Add Group
        </Button>
      </div>
    </div>
  );
});

export const AdvancedFilterBuilder = memo(function AdvancedFilterBuilder({
  group,
  onChange,
}: AdvancedFilterBuilderProps): React.JSX.Element {
  return (
    <AdvancedFilterGroupEditor
      group={group}
      onChange={onChange}
      isRoot
    />
  );
});

AdvancedFilterBuilder.displayName = 'AdvancedFilterBuilder';
