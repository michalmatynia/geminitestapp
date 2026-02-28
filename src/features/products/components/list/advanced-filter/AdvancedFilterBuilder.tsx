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
import { Button, Checkbox, Input, Label, SelectSimple } from '@/shared/ui';
import type { SelectSimpleOption } from '@/shared/ui/select-simple';

import {
  ADVANCED_BOOLEAN_OPTIONS,
  ADVANCED_FILTER_FIELD_CONFIGS,
  ADVANCED_OPERATOR_LABELS,
  createEmptyCondition,
  createEmptyGroup,
  createRuleId,
  getDefaultOperatorForField,
  getFieldConfig,
  isMultiValueOperator,
  isSecondValueRequired,
  isValueRequired,
  normalizeConditionValue,
  normalizeMultiValueInput,
  serializeMultiValue,
  supportsOperator,
} from './advanced-filter-utils';

interface AdvancedFilterValueOption {
  value: string;
  label: string;
}

interface AdvancedFilterBuilderProps {
  group: ProductAdvancedFilterGroup;
  onChange: (group: ProductAdvancedFilterGroup) => void;
  fieldValueOptions?:
    | Partial<Record<ProductAdvancedFilterField, AdvancedFilterValueOption[]>>
    | undefined;
}

interface GroupEditorProps {
  group: ProductAdvancedFilterGroup;
  onChange: (group: ProductAdvancedFilterGroup) => void;
  onRemove?: (() => void) | undefined;
  onDuplicate?: (() => void) | undefined;
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  canMoveUp?: boolean | undefined;
  canMoveDown?: boolean | undefined;
  isRoot?: boolean | undefined;
  depth?: number | undefined;
  fieldValueOptions?:
    | Partial<Record<ProductAdvancedFilterField, AdvancedFilterValueOption[]>>
    | undefined;
}

interface ConditionEditorProps {
  condition: ProductAdvancedFilterCondition;
  onChange: (condition: ProductAdvancedFilterCondition) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disableRemove?: boolean | undefined;
  valueOptions?: AdvancedFilterValueOption[] | undefined;
}

const COMBINATOR_OPTIONS: SelectSimpleOption[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

const FIELD_OPTIONS: SelectSimpleOption[] = ADVANCED_FILTER_FIELD_CONFIGS.map((config) => ({
  value: config.field,
  label: config.label,
}));

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

const duplicateRuleWithNewIds = (rule: ProductAdvancedFilterRule): ProductAdvancedFilterRule => {
  if (rule.type === 'condition') {
    return {
      ...rule,
      id: createRuleId(),
    };
  }

  return {
    ...rule,
    id: createRuleId(),
    rules: rule.rules.map((child: ProductAdvancedFilterRule) => duplicateRuleWithNewIds(child)),
  };
};

const buildConditionValidationMessage = (
  condition: ProductAdvancedFilterCondition
): string | null => {
  if (!isValueRequired(condition.operator)) {
    return null;
  }

  const fieldConfig = getFieldConfig(condition.field);
  const valueKind = fieldConfig.kind;

  if (isMultiValueOperator(condition.operator)) {
    if (!Array.isArray(condition.value) || condition.value.length === 0) {
      return 'At least one value is required.';
    }
    if (
      valueKind === 'number' &&
      condition.value.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value))
    ) {
      return 'All values must be numbers.';
    }
    return null;
  }

  if (
    condition.value === undefined ||
    condition.value === null ||
    (typeof condition.value === 'string' && condition.value.trim().length === 0)
  ) {
    return 'Value is required.';
  }

  if (Array.isArray(condition.value)) {
    return 'Value must be a single item.';
  }

  if (
    valueKind === 'number' &&
    (typeof condition.value !== 'number' || !Number.isFinite(condition.value))
  ) {
    return 'Value must be a number.';
  }

  if (valueKind === 'boolean' && typeof condition.value !== 'boolean') {
    return 'Value must be true or false.';
  }

  if (isSecondValueRequired(condition.operator)) {
    if (
      condition.valueTo === undefined ||
      condition.valueTo === null ||
      (typeof condition.valueTo === 'string' && condition.valueTo.trim().length === 0)
    ) {
      return 'Second value is required.';
    }

    if (Array.isArray(condition.valueTo)) {
      return 'Second value must be a single item.';
    }

    if (
      valueKind === 'number' &&
      (typeof condition.valueTo !== 'number' || !Number.isFinite(condition.valueTo))
    ) {
      return 'Second value must be a number.';
    }

    if (valueKind === 'boolean' && typeof condition.valueTo !== 'boolean') {
      return 'Second value must be true or false.';
    }
  }

  return null;
};

const AdvancedFilterConditionEditor = memo(function AdvancedFilterConditionEditor({
  condition,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  disableRemove = false,
  valueOptions,
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

  const handleFieldChange = (nextFieldValue: string): void => {
    if (!nextFieldValue) return;
    const nextField = nextFieldValue as ProductAdvancedFilterField;
    const nextOperator = supportsOperator(nextField, condition.operator)
      ? condition.operator
      : getDefaultOperatorForField(nextField);

    onChange(
      stripConditionValues({
        ...condition,
        field: nextField,
        operator: nextOperator,
      })
    );
  };

  const handleOperatorChange = (nextOperatorValue: string): void => {
    if (!nextOperatorValue) return;
    const nextOperator = nextOperatorValue as ProductAdvancedFilterCondition['operator'];
    let nextCondition: ProductAdvancedFilterCondition = {
      ...condition,
      operator: nextOperator,
    };

    if (!isValueRequired(nextOperator)) {
      onChange(stripConditionValues(nextCondition));
      return;
    }

    if (isMultiValueOperator(nextOperator)) {
      if (!Array.isArray(nextCondition.value)) {
        if (
          nextCondition.value === undefined ||
          nextCondition.value === null ||
          nextCondition.value === ''
        ) {
          const { value: _value, ...rest } = nextCondition;
          nextCondition = rest as ProductAdvancedFilterCondition;
        } else {
          nextCondition = {
            ...nextCondition,
            value: [nextCondition.value],
          };
        }
      }
      onChange(stripConditionValueTo(nextCondition));
      return;
    }

    if (Array.isArray(nextCondition.value)) {
      const firstValue = nextCondition.value[0];
      if (firstValue === undefined) {
        const { value: _value, ...rest } = nextCondition;
        nextCondition = rest as ProductAdvancedFilterCondition;
      } else {
        nextCondition = {
          ...nextCondition,
          value: firstValue,
        };
      }
    }

    if (!isSecondValueRequired(nextOperator)) {
      nextCondition = stripConditionValueTo(nextCondition);
    }

    onChange(nextCondition);
  };

  const handleValueChange = (rawValue: string): void => {
    if (useMultiValueInput) {
      const normalized = normalizeMultiValueInput(fieldConfig.kind, rawValue);
      if (normalized.length === 0) {
        const { value: _value, ...rest } = condition;
        onChange(rest as ProductAdvancedFilterCondition);
        return;
      }
      onChange({
        ...condition,
        value: normalized,
      });
      return;
    }

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

  const handleBooleanValueChange = (nextValue: string): void => {
    if (!nextValue) {
      const { value: _value, ...rest } = condition;
      onChange(rest as ProductAdvancedFilterCondition);
      return;
    }

    onChange({
      ...condition,
      value: nextValue === 'true',
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
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
            Operator
          </Label>
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
                />
                {valueOptions && valueOptions.length > 0 && fieldConfig.kind === 'string' ? (
                  <datalist id={dataListId}>
                    {valueOptions.map((option: AdvancedFilterValueOption) => (
                      <option key={option.value} value={option.value} label={option.label} />
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
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className='h-8 px-2'
            aria-label='Move rule up'
          >
            <ArrowUp className='h-3.5 w-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className='h-8 px-2'
            aria-label='Move rule down'
          >
            <ArrowDown className='h-3.5 w-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onDuplicate}
            className='h-8 px-2'
            aria-label='Duplicate rule'
          >
            <Copy className='h-3.5 w-3.5' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRemove}
            disabled={disableRemove}
            className='h-8 px-2'
            aria-label='Remove rule'
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

const AdvancedFilterGroupEditor = memo(function AdvancedFilterGroupEditor({
  group,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  isRoot = false,
  depth = 1,
  fieldValueOptions,
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

  const handleMoveRule = (ruleId: string, direction: -1 | 1): void => {
    const currentIndex = group.rules.findIndex(
      (rule: ProductAdvancedFilterRule) => rule.id === ruleId
    );
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= group.rules.length) return;

    const nextRules = [...group.rules];
    const [movedRule] = nextRules.splice(currentIndex, 1);
    if (!movedRule) return;
    nextRules.splice(targetIndex, 0, movedRule);
    onChange({ ...group, rules: nextRules });
  };

  const handleDuplicateRule = (ruleId: string): void => {
    const currentIndex = group.rules.findIndex(
      (rule: ProductAdvancedFilterRule) => rule.id === ruleId
    );
    if (currentIndex < 0) return;

    const sourceRule = group.rules[currentIndex];
    if (!sourceRule) return;

    const duplicated = duplicateRuleWithNewIds(sourceRule);
    const nextRules = [...group.rules];
    nextRules.splice(currentIndex + 1, 0, duplicated);
    onChange({ ...group, rules: nextRules });
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
  const canAddNestedGroup = depth < PRODUCT_ADVANCED_FILTER_MAX_DEPTH;

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
              valueOptions={fieldValueOptions?.[rule.field]}
              onChange={(nextCondition: ProductAdvancedFilterCondition) =>
                handleRuleChange(rule.id, nextCondition)
              }
              onRemove={() => handleRemoveRule(rule.id)}
              onDuplicate={() => handleDuplicateRule(rule.id)}
              onMoveUp={() => handleMoveRule(rule.id, -1)}
              onMoveDown={() => handleMoveRule(rule.id, 1)}
              canMoveUp={canMoveRuleUp}
              canMoveDown={canMoveRuleDown}
              disableRemove={!canRemoveLeaf}
            />
          ) : (
            <AdvancedFilterGroupEditor
              key={rule.id}
              group={rule}
              depth={depth + 1}
              fieldValueOptions={fieldValueOptions}
              onChange={(nextGroup: ProductAdvancedFilterGroup) =>
                handleRuleChange(rule.id, nextGroup)
              }
              onRemove={() => handleRemoveRule(rule.id)}
              onDuplicate={() => handleDuplicateRule(rule.id)}
              onMoveUp={() => handleMoveRule(rule.id, -1)}
              onMoveDown={() => handleMoveRule(rule.id, 1)}
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

export const AdvancedFilterBuilder = memo(function AdvancedFilterBuilder({
  group,
  onChange,
  fieldValueOptions,
}: AdvancedFilterBuilderProps): React.JSX.Element {
  return (
    <AdvancedFilterGroupEditor
      group={group}
      onChange={onChange}
      fieldValueOptions={fieldValueOptions}
      isRoot
      depth={1}
    />
  );
});

AdvancedFilterBuilder.displayName = 'AdvancedFilterBuilder';
