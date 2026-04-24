'use client';

import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button, Input } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  buildDefaultAudienceConditionGroup,
  normalizeAudienceCondition,
  normalizeAudienceConditionGroup,
} from '../../settings/campaign-audience-conditions';
import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
  FilemakerAudienceField,
  FilemakerAudienceOperator,
} from '@/shared/contracts/filemaker';

type FieldOption = { value: FilemakerAudienceField; label: string };

const FIELD_OPTIONS: FieldOption[] = [
  { value: 'organization.name', label: 'Organisation → Name' },
  { value: 'organization.tradingName', label: 'Organisation → Trading name / Title' },
  { value: 'organization.taxId', label: 'Organisation → Tax ID' },
  { value: 'organization.krs', label: 'Organisation → KRS' },
  { value: 'organization.city', label: 'Organisation → City' },
  { value: 'organization.country', label: 'Organisation → Country' },
  { value: 'organization.postalCode', label: 'Organisation → Postal code' },
  { value: 'organization.street', label: 'Organisation → Street' },
  { value: 'person.firstName', label: 'Person → First name' },
  { value: 'person.lastName', label: 'Person → Last name' },
  { value: 'person.city', label: 'Person → City' },
  { value: 'person.country', label: 'Person → Country' },
  { value: 'person.postalCode', label: 'Person → Postal code' },
  { value: 'person.street', label: 'Person → Street' },
  { value: 'person.nip', label: 'Person → NIP' },
  { value: 'person.regon', label: 'Person → REGON' },
  { value: 'person.phoneNumbers', label: 'Person → Phone numbers (any)' },
  { value: 'email.address', label: 'Email → Address' },
  { value: 'email.status', label: 'Email → Status' },
  { value: 'organizationId', label: 'Membership → Organisation ID' },
  { value: 'eventId', label: 'Membership → Event ID' },
];

type OperatorOption = { value: FilemakerAudienceOperator; label: string };

const OPERATOR_OPTIONS: OperatorOption[] = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const operatorTakesValue = (operator: FilemakerAudienceOperator): boolean =>
  operator !== 'is_empty' && operator !== 'is_not_empty';

const replaceChild = (
  group: FilemakerAudienceConditionGroup,
  childId: string,
  next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null
): FilemakerAudienceConditionGroup => ({
  ...group,
  children: group.children.reduce<
    Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
  >((accumulator, child) => {
    if (child.id === childId) {
      if (next) accumulator.push(next);
      return accumulator;
    }
    if (child.type === 'group') {
      accumulator.push(replaceChild(child, childId, next));
      return accumulator;
    }
    accumulator.push(child);
    return accumulator;
  }, []),
});

type ConditionRowProps = {
  condition: FilemakerAudienceCondition;
  onChange: (next: FilemakerAudienceCondition) => void;
  onRemove: () => void;
};

function ConditionRow({ condition, onChange, onRemove }: ConditionRowProps): React.JSX.Element {
  const takesValue = operatorTakesValue(condition.operator);
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <SelectSimple
        ariaLabel='Field'
        value={condition.field}
        onValueChange={(value) =>
          onChange({ ...condition, field: value as FilemakerAudienceField })
        }
        options={FIELD_OPTIONS}
        size='sm'
      />
      <SelectSimple
        ariaLabel='Operator'
        value={condition.operator}
        onValueChange={(value) =>
          onChange({ ...condition, operator: value as FilemakerAudienceOperator })
        }
        options={OPERATOR_OPTIONS}
        size='sm'
      />
      {takesValue ? (
        <Input
          className='min-w-[10rem] flex-1'
          value={condition.value}
          onChange={(event) => onChange({ ...condition, value: event.target.value })}
          placeholder='value'
        />
      ) : (
        <span className='text-[11px] text-gray-500'>(no value)</span>
      )}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={onRemove}
        aria-label='Remove condition'
      >
        <Trash2 className='size-3' />
      </Button>
    </div>
  );
}

type GroupEditorProps = {
  group: FilemakerAudienceConditionGroup;
  depth: number;
  onChange: (next: FilemakerAudienceConditionGroup) => void;
  onRemove?: () => void;
};

function GroupEditor({ group, depth, onChange, onRemove }: GroupEditorProps): React.JSX.Element {
  const updateChild = useCallback(
    (childId: string, next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null) => {
      onChange(replaceChild(group, childId, next));
    },
    [group, onChange]
  );

  const addCondition = (): void => {
    const newCondition = normalizeAudienceCondition({
      field: 'organization.name',
      operator: 'contains',
      value: '',
    });
    if (!newCondition) return;
    onChange({ ...group, children: [...group.children, newCondition] });
  };

  const addGroup = (): void => {
    onChange({
      ...group,
      children: [...group.children, buildDefaultAudienceConditionGroup()],
    });
  };

  return (
    <div
      className={[
        'space-y-3 rounded-md border p-3',
        depth === 0 ? 'border-border/60 bg-card/20' : 'border-border/40 bg-card/10',
      ].join(' ')}
    >
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-[11px] uppercase tracking-wide text-gray-400'>
          Match {group.combinator === 'and' ? 'all' : 'any'} of
        </span>
        <SelectSimple
          ariaLabel='Group combinator'
          value={group.combinator}
          onValueChange={(value) =>
            onChange({ ...group, combinator: value === 'or' ? 'or' : 'and' })
          }
          options={[
            { value: 'and', label: 'AND' },
            { value: 'or', label: 'OR' },
          ]}
          size='sm'
        />
        <div className='ml-auto flex gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={addCondition}>
            <Plus className='size-3' /> Condition
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={addGroup}>
            <Plus className='size-3' /> Group
          </Button>
          {onRemove ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onRemove}
              aria-label='Remove group'
            >
              <Trash2 className='size-3' />
            </Button>
          ) : null}
        </div>
      </div>

      {group.children.length === 0 ? (
        <div className='text-[11px] text-gray-500'>
          No conditions yet. Add one with the buttons above — an empty group matches everyone.
        </div>
      ) : (
        <div className='space-y-2'>
          {group.children.map((child) =>
            child.type === 'group' ? (
              <GroupEditor
                key={child.id}
                group={child}
                depth={depth + 1}
                onChange={(next) => updateChild(child.id, next)}
                onRemove={() => updateChild(child.id, null)}
              />
            ) : (
              <ConditionRow
                key={child.id}
                condition={child}
                onChange={(next) => updateChild(child.id, next)}
                onRemove={() => updateChild(child.id, null)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

type AudienceConditionBuilderProps = {
  value: FilemakerAudienceConditionGroup;
  onChange: (next: FilemakerAudienceConditionGroup) => void;
};

export function AudienceConditionBuilder({
  value,
  onChange,
}: AudienceConditionBuilderProps): React.JSX.Element {
  return (
    <GroupEditor
      group={normalizeAudienceConditionGroup(value)}
      depth={0}
      onChange={onChange}
    />
  );
}
