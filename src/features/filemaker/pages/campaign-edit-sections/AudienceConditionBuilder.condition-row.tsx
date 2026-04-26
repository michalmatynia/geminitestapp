'use client';

import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';

import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Input } from '@/shared/ui/primitives.public';
import type {
  FilemakerAudienceCondition,
  FilemakerAudienceField,
  FilemakerAudienceOperator,
} from '@/shared/contracts/filemaker';

import {
  AUDIENCE_FIELD_OPTIONS,
  buildAudienceConditionForFieldChange,
  buildAudienceConditionForOperatorChange,
  getAudienceOperatorOptionsForField,
  operatorTakesValue,
  resolveConditionValueOptions,
  type AudienceConditionValueOptions,
} from './AudienceConditionBuilder.options';

export type ConditionRowProps = {
  canMoveDown: boolean;
  canMoveUp: boolean;
  condition: FilemakerAudienceCondition;
  fieldValueOptions: AudienceConditionValueOptions;
  onChange: (next: FilemakerAudienceCondition) => void;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
};

type ConditionValueControlProps = Pick<ConditionRowProps, 'condition' | 'onChange'> & {
  valueOptions: ReturnType<typeof resolveConditionValueOptions>;
};

function ConditionValueControl({
  condition,
  onChange,
  valueOptions,
}: ConditionValueControlProps): React.JSX.Element {
  if (!operatorTakesValue(condition.operator)) {
    return <span className='text-[11px] text-gray-500'>(no value)</span>;
  }
  if (valueOptions.length > 0) {
    return (
      <SelectSimple
        ariaLabel='Condition value'
        onValueChange={(value) => onChange({ ...condition, value })}
        options={valueOptions}
        placeholder='Select value'
        size='sm'
        value={condition.value}
      />
    );
  }
  return (
    <Input
      aria-label='Condition value'
      onChange={(event) => onChange({ ...condition, value: event.target.value })}
      placeholder='value'
      value={condition.value}
    />
  );
}

function ConditionActionButtons(props: Pick<
  ConditionRowProps,
  'canMoveDown' | 'canMoveUp' | 'onDuplicate' | 'onMoveDown' | 'onMoveUp' | 'onRemove'
>): React.JSX.Element {
  const { canMoveDown, canMoveUp, onDuplicate, onMoveDown, onMoveUp, onRemove } = props;
  return (
    <div className='flex items-center gap-1'>
      <Button aria-label='Move condition up' disabled={!canMoveUp} onClick={onMoveUp} size='sm' title='Move condition up' type='button' variant='outline'>
        <ArrowUp className='size-3' />
      </Button>
      <Button aria-label='Move condition down' disabled={!canMoveDown} onClick={onMoveDown} size='sm' title='Move condition down' type='button' variant='outline'>
        <ArrowDown className='size-3' />
      </Button>
      <Button aria-label='Duplicate condition' onClick={onDuplicate} size='sm' title='Duplicate condition' type='button' variant='outline'>
        <Copy className='size-3' />
      </Button>
      <Button aria-label='Remove condition' onClick={onRemove} size='sm' title='Remove condition' type='button' variant='outline'>
        <Trash2 className='size-3' />
      </Button>
    </div>
  );
}

export function ConditionRow({
  canMoveDown,
  canMoveUp,
  condition,
  fieldValueOptions,
  onChange,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
}: ConditionRowProps): React.JSX.Element {
  const valueOptions = resolveConditionValueOptions(
    condition.value,
    fieldValueOptions[condition.field] ?? []
  );
  return (
    <div className='grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]'>
      <SelectSimple
        ariaLabel='Field'
        onValueChange={(value) =>
          onChange(buildAudienceConditionForFieldChange(condition, value as FilemakerAudienceField))
        }
        options={AUDIENCE_FIELD_OPTIONS}
        size='sm'
        value={condition.field}
      />
      <SelectSimple
        ariaLabel='Operator'
        onValueChange={(value) =>
          onChange(buildAudienceConditionForOperatorChange(condition, value as FilemakerAudienceOperator))
        }
        options={getAudienceOperatorOptionsForField(condition.field)}
        size='sm'
        value={condition.operator}
      />
      <ConditionValueControl
        condition={condition}
        onChange={onChange}
        valueOptions={valueOptions}
      />
      <ConditionActionButtons
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        onDuplicate={onDuplicate}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
      />
    </div>
  );
}
