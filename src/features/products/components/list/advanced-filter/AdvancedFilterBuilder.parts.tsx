'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';

import {
  PRODUCT_ADVANCED_FILTER_MAX_DEPTH,
  type ProductAdvancedFilterCombinator,
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterField,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterRule,
} from '@/shared/contracts/products';
import type { SelectSimpleOption } from '@/shared/contracts/ui';
import { Button, Checkbox, Input, Label, SelectSimple } from '@/shared/ui';

import {
  ADVANCED_BOOLEAN_OPTIONS,
  ADVANCED_FILTER_FIELD_CONFIGS,
  ADVANCED_OPERATOR_LABELS,
  appendConditionToGroup,
  appendGroupToGroup,
  buildConditionForBooleanValueChange,
  buildConditionForFieldChange,
  buildConditionForOperatorChange,
  buildConditionForValueChange,
  buildConditionForValueToChange,
  buildConditionValidationMessage,
  getFieldConfig,
  isMultiValueOperator,
  isSecondValueRequired,
  isValueRequired,
  serializeMultiValue,
} from './advanced-filter-utils';

interface AdvancedFilterValueOption {
  value: string;
  label: string;
}

export type AdvancedFilterBuilderFieldValueOptions =
  | Partial<Record<ProductAdvancedFilterField, AdvancedFilterValueOption[]>>
  | undefined;

export type AdvancedFilterEditorRuntime = {
  onChange: (group: ProductAdvancedFilterGroup) => void;
  fieldValueOptions: AdvancedFilterBuilderFieldValueOptions;
  handleRuleChange: (
    ruleId: string,
    nextRule: ProductAdvancedFilterRule,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: (next: ProductAdvancedFilterGroup) => void
  ) => void;
  handleRemoveRule: (
    ruleId: string,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: (next: ProductAdvancedFilterGroup) => void
  ) => void;
  handleMoveRule: (
    ruleId: string,
    direction: -1 | 1,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: (next: ProductAdvancedFilterGroup) => void
  ) => void;
  handleDuplicateRule: (
    ruleId: string,
    parentGroup: ProductAdvancedFilterGroup,
    updateParent: (next: ProductAdvancedFilterGroup) => void
  ) => void;
};

const COMBINATOR_OPTIONS: SelectSimpleOption[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

const FIELD_OPTIONS: SelectSimpleOption[] = ADVANCED_FILTER_FIELD_CONFIGS.map((config) => ({
  value: config.field,
  label: config.label,
}));

const AdvancedFilterConditionEditor = memo(function AdvancedFilterConditionEditor(props: {
  condition: ProductAdvancedFilterCondition;
  parentGroup: ProductAdvancedFilterGroup;
  updateParent: (next: ProductAdvancedFilterGroup) => void;
  runtime: AdvancedFilterEditorRuntime;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disableRemove?: boolean;
}): React.JSX.Element {
  const {
    condition,
    parentGroup,
    updateParent,
    runtime,
    canMoveUp,
    canMoveDown,
    disableRemove = false,
  } = props;

  const {
    fieldValueOptions,
    handleRuleChange,
    handleRemoveRule,
    handleMoveRule,
    handleDuplicateRule,
  } = runtime;

  const valueOptions = fieldValueOptions?.[condition.field];
  const fieldConfig = getFieldConfig(condition.field);
  const operatorOptions = useMemo<SelectSimpleOption[]>(
    () =>
      fieldConfig.operators.map((operator) => ({
        value: operator,
        label: ADVANCED_OPERATOR_LABELS[operator],
      })),
    [fieldConfig.operators]
  );
  const inputType =
    fieldConfig.kind === 'number' ? 'number' : fieldConfig.kind === 'date' ? 'date' : 'text';
  const useMultiValueInput = isMultiValueOperator(condition.operator);
  const dataListId = `advanced-filter-value-options-${condition.id}`;

  const value = useMultiValueInput
    ? serializeMultiValue(Array.isArray(condition.value) ? condition.value : undefined)
    : condition.value === undefined || condition.value === null
      ? ''
      : String(condition.value);

  const valueTo =
    condition.valueTo === undefined || condition.valueTo === null ? '' : String(condition.valueTo);

  const validationMessage = useMemo(() => buildConditionValidationMessage(condition), [condition]);

  const onConditionChange = (next: ProductAdvancedFilterCondition) =>
    handleRuleChange(condition.id, next, parentGroup, updateParent);

  const handleFieldChange = (nextFieldValue: string): void => {
    if (!nextFieldValue) return;
    onConditionChange(
      buildConditionForFieldChange(condition, nextFieldValue as ProductAdvancedFilterField)
    );
  };

  const handleOperatorChange = (nextOperatorValue: string): void => {
    if (!nextOperatorValue) return;
    onConditionChange(
      buildConditionForOperatorChange(
        condition,
        nextOperatorValue as ProductAdvancedFilterCondition['operator']
      )
    );
  };

  const handleValueChange = (rawValue: string): void =>
    onConditionChange(buildConditionForValueChange(condition, fieldConfig.kind, rawValue));

  const handleBooleanValueChange = (nextValue: string): void =>
    onConditionChange(buildConditionForBooleanValueChange(condition, nextValue));

  const handleValueToChange = (rawValue: string): void =>
    onConditionChange(buildConditionForValueToChange(condition, fieldConfig.kind, rawValue));

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
            title='Select option'
          />
        </div>

        <div className='space-y-1'>
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
            Operator
          </Label>
          <SelectSimple
            size='sm'
            value={condition.operator}
            onValueChange={handleOperatorChange}
            options={operatorOptions}
            ariaLabel='Condition operator'
            title='Select option'
          />
        </div>

        {isValueRequired(condition.operator) ? (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
              Value
            </Label>
            {fieldConfig.kind === 'boolean' && !useMultiValueInput ? (
              <SelectSimple
                size='sm'
                value={
                  condition.value === true
                    ? 'true'
                    : condition.value === false
                      ? 'false'
                      : undefined
                }
                onValueChange={handleBooleanValueChange}
                options={ADVANCED_BOOLEAN_OPTIONS}
                placeholder='Select value'
                ariaLabel='Condition boolean value'
                title='Select value'
              />
            ) : (
              <>
                <Input
                  type={inputType}
                  list={
                    valueOptions && valueOptions.length > 0 && fieldConfig.kind === 'string'
                      ? dataListId
                      : undefined
                  }
                  value={value}
                  onChange={(event) => handleValueChange(event.target.value)}
                  className='h-8'
                  placeholder={useMultiValueInput ? 'Value 1, value 2, ...' : 'Value'}
                  aria-label='Condition value'
                  title={useMultiValueInput ? 'Value 1, value 2, ...' : 'Value'}
                />
                {valueOptions && valueOptions.length > 0 && fieldConfig.kind === 'string' ? (
                  <datalist id={dataListId}>
                    {valueOptions.map((option: AdvancedFilterValueOption) => (
                      <option
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        aria-label={option.label || option.value}
                      />
                    ))}
                  </datalist>
                ) : null}
              </>
            )}
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
              aria-label='Condition value to'
              title='Second value'
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

        <div className='flex items-end gap-1'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleMoveRule(condition.id, -1, parentGroup, updateParent)}
            disabled={!canMoveUp}
            className='h-8 px-2'
            aria-label='Move rule up'
            title='Move rule up'
          >
            <ArrowUp className='h-3.5 w-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleMoveRule(condition.id, 1, parentGroup, updateParent)}
            disabled={!canMoveDown}
            className='h-8 px-2'
            aria-label='Move rule down'
            title='Move rule down'
          >
            <ArrowDown className='h-3.5 w-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleDuplicateRule(condition.id, parentGroup, updateParent)}
            className='h-8 px-2'
            aria-label='Duplicate rule'
            title='Duplicate rule'
          >
            <Copy className='h-3.5 w-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleRemoveRule(condition.id, parentGroup, updateParent)}
            disabled={disableRemove}
            className='h-8 px-2'
            aria-label='Remove rule'
            title='Remove rule'
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      {validationMessage ? (
        <p className='mt-2 text-xs text-destructive'>{validationMessage}</p>
      ) : null}
    </div>
  );
});

export const AdvancedFilterGroupEditor = memo(function AdvancedFilterGroupEditor(props: {
  group: ProductAdvancedFilterGroup;
  runtime: AdvancedFilterEditorRuntime;
  updateParent?: (next: ProductAdvancedFilterGroup) => void;
  onRemove?: (() => void) | undefined;
  onDuplicate?: (() => void) | undefined;
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  canMoveUp?: boolean | undefined;
  canMoveDown?: boolean | undefined;
  isRoot?: boolean | undefined;
  depth?: number | undefined;
}): React.JSX.Element {
  const {
    group,
    runtime,
    updateParent,
    onRemove,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    canMoveUp = false,
    canMoveDown = false,
    isRoot = false,
    depth = 1,
  } = props;

  const { handleRuleChange, handleRemoveRule, handleMoveRule, handleDuplicateRule, onChange } =
    runtime;

  const updateThisGroup = (next: ProductAdvancedFilterGroup) => {
    if (isRoot) {
      onChange(next);
    } else if (updateParent) {
      updateParent(next);
    }
  };

  const handleThisRemoveRule = (ruleId: string): void => {
    handleRemoveRule(ruleId, group, updateThisGroup);
  };

  const handleThisMoveRule = (ruleId: string, direction: -1 | 1): void => {
    handleMoveRule(ruleId, direction, group, updateThisGroup);
  };

  const handleThisDuplicateRule = (ruleId: string): void => {
    handleDuplicateRule(ruleId, group, updateThisGroup);
  };

  const handleAddCondition = (): void => {
    updateThisGroup(appendConditionToGroup(group));
  };

  const handleAddGroup = (): void => {
    updateThisGroup(appendGroupToGroup(group));
  };

  const canRemoveLeaf = group.rules.length > 1 || !isRoot;
  const canAddNestedGroup = depth < PRODUCT_ADVANCED_FILTER_MAX_DEPTH;

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/30 p-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='w-28'>
          <SelectSimple
            size='sm'
            value={group.combinator}
            onValueChange={(value: string) =>
              updateThisGroup({
                ...group,
                combinator: value as ProductAdvancedFilterCombinator,
              })
            }
            options={COMBINATOR_OPTIONS}
            ariaLabel='Group combinator'
            title='Select option'
          />
        </div>

        <div className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
          <Checkbox
            checked={group.not}
            aria-label='Negate group (NOT)'
            onCheckedChange={(checked) =>
              updateThisGroup({
                ...group,
                not: checked === true,
              })
            }
          />
          Negate group (NOT)
        </div>

        {!isRoot ? (
          <div className='ml-auto flex items-center gap-1'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className='h-8 px-2'
              aria-label='Move group up'
              title='Move group up'
            >
              <ArrowUp className='h-3.5 w-3.5' />
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className='h-8 px-2'
              aria-label='Move group down'
              title='Move group down'
            >
              <ArrowDown className='h-3.5 w-3.5' />
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={onDuplicate}
              className='h-8 px-2'
              aria-label='Duplicate group'
              title='Duplicate group'
            >
              <Copy className='h-3.5 w-3.5' />
            </Button>
            {onRemove ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={onRemove}
                className='h-8 px-2'
                aria-label='Remove group'
                title='Remove group'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className='space-y-2'>
        {group.rules.map((rule: ProductAdvancedFilterRule, index: number) => {
          const canMoveRuleUp = index > 0;
          const canMoveRuleDown = index < group.rules.length - 1;

          return rule.type === 'condition' ? (
            <AdvancedFilterConditionEditor
              key={rule.id}
              condition={rule}
              parentGroup={group}
              updateParent={updateThisGroup}
              runtime={runtime}
              canMoveUp={canMoveRuleUp}
              canMoveDown={canMoveRuleDown}
              disableRemove={!canRemoveLeaf}
            />
          ) : (
            <AdvancedFilterGroupEditor
              key={rule.id}
              group={rule}
              runtime={runtime}
              depth={depth + 1}
              updateParent={(nextGroup) =>
                handleRuleChange(rule.id, nextGroup, group, updateThisGroup)
              }
              onRemove={() => handleThisRemoveRule(rule.id)}
              onDuplicate={() => handleThisDuplicateRule(rule.id)}
              onMoveUp={() => handleThisMoveRule(rule.id, -1)}
              onMoveDown={() => handleThisMoveRule(rule.id, 1)}
              canMoveUp={canMoveRuleUp}
              canMoveDown={canMoveRuleDown}
            />
          );
        })}
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={handleAddCondition}>
          <Plus className='mr-1 h-3.5 w-3.5' />
          Add Condition
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleAddGroup}
          disabled={!canAddNestedGroup}
        >
          <Plus className='mr-1 h-3.5 w-3.5' />
          Add Group
        </Button>
      </div>
    </div>
  );
});
