'use client';

import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { memo } from 'react';

import type {
  OrganizationAdvancedFilterCondition,
  OrganizationAdvancedFilterField,
  OrganizationAdvancedFilterGroup,
} from '../../filemaker-organization-advanced-filters';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  FIELD_OPTIONS,
  type OrganizationAdvancedFilterEditorRuntime,
  resolveValueForCondition,
} from './OrganizationAdvancedFilterBuilder.shared';
import {
  OrganizationConditionValueCell,
  OrganizationConditionValueToCell,
} from './OrganizationAdvancedConditionValueEditor';
import {
  ORGANIZATION_ADVANCED_OPERATOR_LABELS,
  buildOrganizationConditionForBooleanValueChange,
  buildOrganizationConditionForFieldChange,
  buildOrganizationConditionForOperatorChange,
  buildOrganizationConditionForValueChange,
  buildOrganizationConditionForValueToChange,
  buildOrganizationConditionValidationMessage,
  getOrganizationAdvancedFieldConfig,
  getOrganizationAdvancedInputType,
} from './organization-advanced-filter-utils';

interface OrganizationAdvancedConditionEditorProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  condition: OrganizationAdvancedFilterCondition;
  disableRemove?: boolean;
  parentGroup: OrganizationAdvancedFilterGroup;
  runtime: OrganizationAdvancedFilterEditorRuntime;
  updateParent: (next: OrganizationAdvancedFilterGroup) => void;
}

interface ConditionEditorFrameProps extends Required<OrganizationAdvancedConditionEditorProps> {
  handleFieldChange: (nextFieldValue: string) => void;
  handleOperatorChange: (nextOperatorValue: string) => void;
  onConditionChange: (nextCondition: OrganizationAdvancedFilterCondition) => void;
  operatorOptions: SelectSimpleOption[];
  validationMessage: string | null;
}

type OrganizationFieldConfig = ReturnType<typeof getOrganizationAdvancedFieldConfig>;

const buildOperatorOptions = (operators: OrganizationFieldConfig['operators']): SelectSimpleOption[] =>
  operators.map((operator) => ({
    label: ORGANIZATION_ADVANCED_OPERATOR_LABELS[operator],
    value: operator,
  }));

const RuleActionButton = (props: {
  disabled?: boolean;
  icon: React.JSX.Element;
  label: string;
  onClick: () => void;
  title: string;
}): React.JSX.Element => (
  <Button
    type='button'
    variant='outline'
    size='sm'
    onClick={props.onClick}
    disabled={props.disabled}
    className='h-8 px-2'
    aria-label={props.label}
    title={props.title}
  >
    {props.icon}
  </Button>
);

const OrganizationConditionActions = (
  props: Required<OrganizationAdvancedConditionEditorProps>
): React.JSX.Element => {
  const { canMoveDown, canMoveUp, condition, disableRemove, parentGroup, runtime, updateParent } =
    props;
  return (
    <div className='flex items-end gap-1'>
      <RuleActionButton
        icon={<ArrowUp className='h-3.5 w-3.5' />}
        label='Move organisation rule up'
        title='Move rule up'
        onClick={() => runtime.handleMoveRule(condition.id, -1, parentGroup, updateParent)}
        disabled={!canMoveUp}
      />
      <RuleActionButton
        icon={<ArrowDown className='h-3.5 w-3.5' />}
        label='Move organisation rule down'
        title='Move rule down'
        onClick={() => runtime.handleMoveRule(condition.id, 1, parentGroup, updateParent)}
        disabled={!canMoveDown}
      />
      <RuleActionButton
        icon={<Copy className='h-3.5 w-3.5' />}
        label='Duplicate organisation rule'
        title='Duplicate rule'
        onClick={() => runtime.handleDuplicateRule(condition.id, parentGroup, updateParent)}
      />
      <RuleActionButton
        icon={<Trash2 className='h-3.5 w-3.5' />}
        label='Remove organisation rule'
        title='Remove rule'
        onClick={() => runtime.handleRemoveRule(condition.id, parentGroup, updateParent)}
        disabled={disableRemove}
      />
    </div>
  );
};

const OrganizationConditionFieldCell = (props: {
  condition: OrganizationAdvancedFilterCondition;
  handleFieldChange: (nextFieldValue: string) => void;
}): React.JSX.Element => (
  <div className='space-y-1'>
    <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Field</Label>
    <SelectSimple
      size='sm'
      value={props.condition.field}
      onValueChange={props.handleFieldChange}
      options={FIELD_OPTIONS}
      ariaLabel='Organisation condition field'
      title='Organisation condition field'
    />
  </div>
);

const OrganizationConditionOperatorCell = (props: {
  condition: OrganizationAdvancedFilterCondition;
  handleOperatorChange: (nextOperatorValue: string) => void;
  operatorOptions: SelectSimpleOption[];
}): React.JSX.Element => (
  <div className='space-y-1'>
    <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Operator</Label>
    <SelectSimple
      size='sm'
      value={props.condition.operator}
      onValueChange={props.handleOperatorChange}
      options={props.operatorOptions}
      ariaLabel='Organisation condition operator'
      title='Organisation condition operator'
    />
  </div>
);

const OrganizationConditionEditorFrame = (props: ConditionEditorFrameProps): React.JSX.Element => {
  const { condition, onConditionChange, runtime, validationMessage } = props;
  const fieldConfig = getOrganizationAdvancedFieldConfig(condition.field);
  const inputType = getOrganizationAdvancedInputType(condition.field);
  const valueTo =
    condition.valueTo === undefined || condition.valueTo === null ? '' : String(condition.valueTo);
  return (
    <div className='rounded-md border border-border/50 bg-card/20 p-3'>
      <div className='grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <OrganizationConditionFieldCell {...props} />
        <OrganizationConditionOperatorCell {...props} />
        <OrganizationConditionValueCell
          condition={condition}
          dataListId={`organization-advanced-filter-value-options-${condition.id}`}
          inputType={inputType}
          onBooleanValueChange={(nextValue) =>
            onConditionChange(buildOrganizationConditionForBooleanValueChange(condition, nextValue))
          }
          onValueChange={(rawValue) =>
            onConditionChange(
              buildOrganizationConditionForValueChange(condition, fieldConfig.kind, rawValue)
            )
          }
          value={resolveValueForCondition(condition)}
          valueOptions={runtime.fieldValueOptions?.[condition.field]}
        />
        <OrganizationConditionValueToCell
          condition={condition}
          inputType={inputType}
          onValueToChange={(rawValue) =>
            onConditionChange(
              buildOrganizationConditionForValueToChange(condition, fieldConfig.kind, rawValue)
            )
          }
          valueTo={valueTo}
        />
        <OrganizationConditionActions {...props} />
      </div>
      {validationMessage !== null ? (
        <p className='mt-2 text-xs text-destructive'>{validationMessage}</p>
      ) : null}
    </div>
  );
};

export const OrganizationAdvancedConditionEditor = memo(
  (props: OrganizationAdvancedConditionEditorProps): React.JSX.Element => {
    const { condition, disableRemove = false, parentGroup, runtime, updateParent } = props;
    const fieldConfig = getOrganizationAdvancedFieldConfig(condition.field);
    const onConditionChange = (nextCondition: OrganizationAdvancedFilterCondition): void =>
      runtime.handleRuleChange(condition.id, nextCondition, parentGroup, updateParent);
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
    return (
      <OrganizationConditionEditorFrame
        {...props}
        disableRemove={disableRemove}
        handleFieldChange={handleFieldChange}
        handleOperatorChange={handleOperatorChange}
        onConditionChange={onConditionChange}
        operatorOptions={buildOperatorOptions(fieldConfig.operators)}
        validationMessage={buildOrganizationConditionValidationMessage(condition)}
      />
    );
  }
);

OrganizationAdvancedConditionEditor.displayName = 'OrganizationAdvancedConditionEditor';
