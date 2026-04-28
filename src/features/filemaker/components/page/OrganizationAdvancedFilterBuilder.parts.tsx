'use client';
/* eslint-disable complexity, max-lines, max-lines-per-function, no-nested-ternary */

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';

import type {
  OrganizationAdvancedFilterCombinator,
  OrganizationAdvancedFilterCondition,
  OrganizationAdvancedFilterField,
  OrganizationAdvancedFilterGroup,
  OrganizationAdvancedFilterRule,
} from '../../filemaker-organization-advanced-filters';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS,
  ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIGS,
  ORGANIZATION_ADVANCED_OPERATOR_LABELS,
  appendConditionToOrganizationGroup,
  appendGroupToOrganizationGroup,
  buildOrganizationConditionForBooleanValueChange,
  buildOrganizationConditionForFieldChange,
  buildOrganizationConditionForOperatorChange,
  buildOrganizationConditionForValueChange,
  buildOrganizationConditionForValueToChange,
  buildOrganizationConditionValidationMessage,
  canAddNestedOrganizationGroup,
  getOrganizationAdvancedFieldConfig,
  getOrganizationAdvancedInputType,
  isOrganizationAdvancedMultiValueOperator,
  isOrganizationAdvancedSecondValueRequired,
  isOrganizationAdvancedValueRequired,
  serializeOrganizationMultiValue,
} from './organization-advanced-filter-utils';

interface OrganizationAdvancedFilterValueOption {
  value: string;
  label: string;
}

export type OrganizationAdvancedFilterBuilderFieldValueOptions =
  | Partial<Record<OrganizationAdvancedFilterField, OrganizationAdvancedFilterValueOption[]>>
  | undefined;

export type OrganizationAdvancedFilterEditorRuntime = {
  fieldValueOptions: OrganizationAdvancedFilterBuilderFieldValueOptions;
  onChange: (group: OrganizationAdvancedFilterGroup) => void;
  handleDuplicateRule: (
    ruleId: string,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
  handleMoveRule: (
    ruleId: string,
    direction: -1 | 1,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
  handleRemoveRule: (
    ruleId: string,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
  handleRuleChange: (
    ruleId: string,
    nextRule: OrganizationAdvancedFilterRule,
    parentGroup: OrganizationAdvancedFilterGroup,
    updateParent: (next: OrganizationAdvancedFilterGroup) => void
  ) => void;
};

const COMBINATOR_OPTIONS: SelectSimpleOption[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

const FIELD_OPTIONS: SelectSimpleOption[] = ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIGS.map(
  (config) => ({
    label: config.label,
    value: config.field,
  })
);

const OrganizationAdvancedConditionEditor = memo((props: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  condition: OrganizationAdvancedFilterCondition;
  disableRemove?: boolean;
  parentGroup: OrganizationAdvancedFilterGroup;
  runtime: OrganizationAdvancedFilterEditorRuntime;
  updateParent: (next: OrganizationAdvancedFilterGroup) => void;
}): React.JSX.Element => {
  const {
    canMoveDown,
    canMoveUp,
    condition,
    disableRemove = false,
    parentGroup,
    runtime,
    updateParent,
  } = props;
  const {
    fieldValueOptions,
    handleDuplicateRule,
    handleMoveRule,
    handleRemoveRule,
    handleRuleChange,
  } = runtime;

  const fieldConfig = getOrganizationAdvancedFieldConfig(condition.field);
  const valueOptions = fieldValueOptions?.[condition.field];
  const operatorOptions = useMemo<SelectSimpleOption[]>(
    () =>
      fieldConfig.operators.map((operator) => ({
        label: ORGANIZATION_ADVANCED_OPERATOR_LABELS[operator],
        value: operator,
      })),
    [fieldConfig.operators]
  );
  const inputType = getOrganizationAdvancedInputType(condition.field);
  const useMultiValueInput = isOrganizationAdvancedMultiValueOperator(condition.operator);
  const dataListId = `organization-advanced-filter-value-options-${condition.id}`;
  const value = useMultiValueInput
    ? serializeOrganizationMultiValue(Array.isArray(condition.value) ? condition.value : undefined)
    : condition.value === undefined || condition.value === null
      ? ''
      : String(condition.value);
  const valueTo =
    condition.valueTo === undefined || condition.valueTo === null ? '' : String(condition.valueTo);
  const validationMessage = useMemo(
    () => buildOrganizationConditionValidationMessage(condition),
    [condition]
  );

  const onConditionChange = (nextCondition: OrganizationAdvancedFilterCondition): void =>
    handleRuleChange(condition.id, nextCondition, parentGroup, updateParent);

  const handleFieldChange = (nextFieldValue: string): void => {
    if (nextFieldValue.length === 0) return;
    onConditionChange(
      buildOrganizationConditionForFieldChange(
        condition,
        nextFieldValue as OrganizationAdvancedFilterField
      )
    );
  };

  const handleOperatorChange = (nextOperatorValue: string): void => {
    if (nextOperatorValue.length === 0) return;
    onConditionChange(
      buildOrganizationConditionForOperatorChange(
        condition,
        nextOperatorValue as OrganizationAdvancedFilterCondition['operator']
      )
    );
  };

  const handleValueChange = (rawValue: string): void =>
    onConditionChange(
      buildOrganizationConditionForValueChange(condition, fieldConfig.kind, rawValue)
    );

  const handleBooleanValueChange = (nextValue: string): void =>
    onConditionChange(buildOrganizationConditionForBooleanValueChange(condition, nextValue));

  const handleValueToChange = (rawValue: string): void =>
    onConditionChange(
      buildOrganizationConditionForValueToChange(condition, fieldConfig.kind, rawValue)
    );

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
            ariaLabel='Organisation condition field'
            title='Organisation condition field'
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
            ariaLabel='Organisation condition operator'
            title='Organisation condition operator'
          />
        </div>
        {isOrganizationAdvancedValueRequired(condition.operator) ? (
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
                options={ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS}
                placeholder='Select value'
                ariaLabel='Organisation condition boolean value'
                title='Select value'
              />
            ) : (
              <>
                <Input
                  type={inputType}
                  list={
                    valueOptions !== undefined &&
                    valueOptions.length > 0 &&
                    fieldConfig.kind === 'string'
                      ? dataListId
                      : undefined
                  }
                  value={value}
                  onChange={(event) => handleValueChange(event.target.value)}
                  className='h-8'
                  placeholder={useMultiValueInput ? 'Value 1, value 2, ...' : 'Value'}
                  aria-label='Organisation condition value'
                  title={useMultiValueInput ? 'Value 1, value 2, ...' : 'Value'}
                />
                {valueOptions !== undefined &&
                valueOptions.length > 0 &&
                fieldConfig.kind === 'string' ? (
                  <datalist id={dataListId}>
                    {valueOptions.map((option: OrganizationAdvancedFilterValueOption) => (
                      <option
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        aria-label={option.label.length > 0 ? option.label : option.value}
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
        {isOrganizationAdvancedSecondValueRequired(condition.operator) ? (
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
              aria-label='Organisation condition value to'
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
            aria-label='Move organisation rule up'
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
            aria-label='Move organisation rule down'
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
            aria-label='Duplicate organisation rule'
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
            aria-label='Remove organisation rule'
            title='Remove rule'
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
      {validationMessage !== null ? (
        <p className='mt-2 text-xs text-destructive'>{validationMessage}</p>
      ) : null}
    </div>
  );
});

OrganizationAdvancedConditionEditor.displayName = 'OrganizationAdvancedConditionEditor';

export const OrganizationAdvancedFilterGroupEditor = memo(
  function OrganizationAdvancedFilterGroupEditor(props: {
    canMoveDown?: boolean;
    canMoveUp?: boolean;
    depth?: number;
    group: OrganizationAdvancedFilterGroup;
    isRoot?: boolean;
    onDuplicate?: () => void;
    onMoveDown?: () => void;
    onMoveUp?: () => void;
    onRemove?: () => void;
    runtime: OrganizationAdvancedFilterEditorRuntime;
    updateParent?: (next: OrganizationAdvancedFilterGroup) => void;
  }): React.JSX.Element {
    const {
      canMoveDown = false,
      canMoveUp = false,
      depth = 1,
      group,
      isRoot = false,
      onDuplicate,
      onMoveDown,
      onMoveUp,
      onRemove,
      runtime,
      updateParent,
    } = props;
    const { handleDuplicateRule, handleMoveRule, handleRemoveRule, handleRuleChange, onChange } =
      runtime;

    const updateThisGroup = (next: OrganizationAdvancedFilterGroup): void => {
      if (isRoot) {
        onChange(next);
      } else {
        updateParent?.(next);
      }
    };
    const canRemoveLeaf = group.rules.length > 1 || !isRoot;

    const handleThisRemoveRule = (ruleId: string): void => {
      handleRemoveRule(ruleId, group, updateThisGroup);
    };
    const handleThisMoveRule = (ruleId: string, direction: -1 | 1): void => {
      handleMoveRule(ruleId, direction, group, updateThisGroup);
    };
    const handleThisDuplicateRule = (ruleId: string): void => {
      handleDuplicateRule(ruleId, group, updateThisGroup);
    };

    return (
      <div className='space-y-3 rounded-md border border-border/60 bg-card/30 p-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='w-28'>
            <SelectSimple
              size='sm'
              value={group.combinator}
              onValueChange={(value: string): void =>
                updateThisGroup({
                  ...group,
                  combinator: value as OrganizationAdvancedFilterCombinator,
                })
              }
              options={COMBINATOR_OPTIONS}
              ariaLabel='Organisation group combinator'
              title='Select option'
            />
          </div>
          <div className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
            <Checkbox
              checked={group.not}
              aria-label='Negate organisation group'
              onCheckedChange={(checked): void =>
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
                aria-label='Move organisation group up'
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
                aria-label='Move organisation group down'
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
                aria-label='Duplicate organisation group'
                title='Duplicate group'
              >
                <Copy className='h-3.5 w-3.5' />
              </Button>
              {onRemove !== undefined ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={onRemove}
                  className='h-8 px-2'
                  aria-label='Remove organisation group'
                  title='Remove group'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className='space-y-2'>
          {group.rules.map((rule: OrganizationAdvancedFilterRule, index: number) => {
            const canMoveRuleUp = index > 0;
            const canMoveRuleDown = index < group.rules.length - 1;
            return rule.type === 'condition' ? (
              <OrganizationAdvancedConditionEditor
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
              <OrganizationAdvancedFilterGroupEditor
                key={rule.id}
                group={rule}
                runtime={runtime}
                depth={depth + 1}
                updateParent={(nextGroup: OrganizationAdvancedFilterGroup): void =>
                  handleRuleChange(rule.id, nextGroup, group, updateThisGroup)
                }
                onRemove={(): void => handleThisRemoveRule(rule.id)}
                onDuplicate={(): void => handleThisDuplicateRule(rule.id)}
                onMoveUp={(): void => handleThisMoveRule(rule.id, -1)}
                onMoveDown={(): void => handleThisMoveRule(rule.id, 1)}
                canMoveUp={canMoveRuleUp}
                canMoveDown={canMoveRuleDown}
              />
            );
          })}
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(): void => updateThisGroup(appendConditionToOrganizationGroup(group))}
          >
            <Plus className='mr-1 h-3.5 w-3.5' />
            Add Condition
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(): void => updateThisGroup(appendGroupToOrganizationGroup(group))}
            disabled={!canAddNestedOrganizationGroup(depth)}
          >
            <Plus className='mr-1 h-3.5 w-3.5' />
            Add Group
          </Button>
        </div>
      </div>
    );
  }
);
