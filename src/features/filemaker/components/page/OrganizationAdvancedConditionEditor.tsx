'use client';

import React, { memo, useMemo } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS, ORGANIZATION_ADVANCED_OPERATOR_LABELS, buildOrganizationConditionForBooleanValueChange, buildOrganizationConditionForFieldChange, buildOrganizationConditionForOperatorChange, buildOrganizationConditionForValueChange, buildOrganizationConditionForValueToChange, buildOrganizationConditionValidationMessage, getOrganizationAdvancedFieldConfig, getOrganizationAdvancedInputType, isOrganizationAdvancedMultiValueOperator, isOrganizationAdvancedSecondValueRequired, isOrganizationAdvancedValueRequired, serializeOrganizationMultiValue } from './organization-advanced-filter-utils';
import type { OrganizationAdvancedFilterCondition, OrganizationAdvancedFilterGroup, OrganizationAdvancedFilterField, OrganizationAdvancedFilterRule } from '../../filemaker-organization-advanced-filters';
import type { OrganizationAdvancedFilterEditorRuntime } from './OrganizationAdvancedFilterBuilder.parts';
import { useConditionMetadata } from './useConditionMetadata';

export const OrganizationAdvancedConditionEditor = memo((props: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  condition: OrganizationAdvancedFilterCondition;
  disableRemove?: boolean;
  parentGroup: OrganizationAdvancedFilterGroup;
  runtime: OrganizationAdvancedFilterEditorRuntime;
  updateParent: (next: OrganizationAdvancedFilterGroup) => void;
}): React.JSX.Element => {
  const {
    canMoveDown, canMoveUp, condition, disableRemove = false, parentGroup, runtime, updateParent,
  } = props;
  const { handleDuplicateRule, handleMoveRule, handleRemoveRule, handleRuleChange, fieldValueOptions } = runtime;

  const { fieldConfig, useMultiValueInput } = useConditionMetadata(condition);
  const valueOptions = fieldValueOptions?.[condition.field];
  const operatorOptions = useMemo(() => fieldConfig.operators.map((op) => ({
    label: ORGANIZATION_ADVANCED_OPERATOR_LABELS[op],
    value: op,
  })), [fieldConfig.operators]);
  
  const inputType = getOrganizationAdvancedInputType(condition.field);
  const dataListId = `val-opts-${condition.id}`;
  const value = useMultiValueInput ? serializeOrganizationMultiValue(Array.isArray(condition.value) ? condition.value : undefined) : (condition.value ?? '');
  const valueTo = condition.valueTo ?? '';
  const validationMessage = useMemo(() => buildOrganizationConditionValidationMessage(condition), [condition]);

  const onConditionChange = (next: OrganizationAdvancedFilterCondition) => handleRuleChange(condition.id, next, parentGroup, updateParent);

  return (
    <div className='rounded-md border border-border/50 bg-card/20 p-3'>
      <div className='grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Field</Label>
          <SelectSimple size='sm' value={condition.field} onValueChange={(f) => onConditionChange(buildOrganizationConditionForFieldChange(condition, f as OrganizationAdvancedFilterField))} options={[]} />
        </div>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Operator</Label>
          <SelectSimple size='sm' value={condition.operator} onValueChange={(o) => onConditionChange(buildOrganizationConditionForOperatorChange(condition, o as any))} options={operatorOptions} />
        </div>
        
        {isOrganizationAdvancedValueRequired(condition.operator) ? (
          <ValueInput 
            condition={condition} 
            inputType={inputType} 
            useMultiValueInput={useMultiValueInput} 
            fieldConfig={fieldConfig}
            value={value}
            dataListId={dataListId}
            valueOptions={valueOptions}
            onBooleanChange={(v) => onConditionChange(buildOrganizationConditionForBooleanValueChange(condition, v))}
            onValueChange={(v) => onConditionChange(buildOrganizationConditionForValueChange(condition, fieldConfig.kind, v))}
          />
        ) : (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value</Label>
            <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
          </div>
        )}

        {isOrganizationAdvancedSecondValueRequired(condition.operator) ? (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value To</Label>
            <Input type={inputType} value={valueTo} onChange={(e) => onConditionChange(buildOrganizationConditionForValueToChange(condition, fieldConfig.kind, e.target.value))} className='h-8' />
          </div>
        ) : (
          <div className='space-y-1'>
            <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value To</Label>
            <div className='h-8 rounded-md border border-dashed border-border/60 bg-card/30' />
          </div>
        )}

        <ConditionActions 
          canMoveDown={canMoveDown} canMoveUp={canMoveUp} disableRemove={disableRemove}
          onMoveUp={() => handleMoveRule(condition.id, -1, parentGroup, updateParent)}
          onMoveDown={() => handleMoveRule(condition.id, 1, parentGroup, updateParent)}
          onDuplicate={() => handleDuplicateRule(condition.id, parentGroup, updateParent)}
          onRemove={() => handleRemoveRule(condition.id, parentGroup, updateParent)}
        />
      </div>
      {validationMessage && <p className='mt-2 text-xs text-destructive'>{validationMessage}</p>}
    </div>
  );
});

function ValueInput(props: any) {
  const { condition, inputType, useMultiValueInput, fieldConfig, value, dataListId, valueOptions, onBooleanChange, onValueChange } = props;
  if (fieldConfig.kind === 'boolean' && !useMultiValueInput) {
    return (
      <div className='space-y-1'>
        <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value</Label>
        <SelectSimple size='sm' value={condition.value === true ? 'true' : 'false'} onValueChange={onBooleanChange} options={ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS} />
      </div>
    );
  }
  return (
    <div className='space-y-1'>
      <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>Value</Label>
      <Input
        type={inputType}
        list={valueOptions && valueOptions.length > 0 && fieldConfig.kind === 'string' ? dataListId : undefined}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className='h-8'
      />
    </div>
  );
}

function ConditionActions(props: any) {
  return (
    <div className='flex items-end gap-1'>
      <Button size='sm' variant='outline' onClick={props.onMoveUp} disabled={!props.canMoveUp} className='h-8 px-2'><ArrowUp className='h-3.5 w-3.5' /></Button>
      <Button size='sm' variant='outline' onClick={props.onMoveDown} disabled={!props.canMoveDown} className='h-8 px-2'><ArrowDown className='h-3.5 w-3.5' /></Button>
      <Button size='sm' variant='outline' onClick={props.onDuplicate} className='h-8 px-2'><Copy className='h-3.5 w-3.5' /></Button>
      <Button size='sm' variant='outline' onClick={props.onRemove} disabled={props.disableRemove} className='h-8 px-2'><Trash2 className='h-3.5 w-3.5' /></Button>
    </div>
  );
}
