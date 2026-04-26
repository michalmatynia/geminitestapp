'use client';
import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Input } from '@/shared/ui/primitives.public';
import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
  FilemakerAudienceField,
  FilemakerAudienceOperator,
} from '@/shared/contracts/filemaker';
import {
  buildDefaultAudienceConditionGroup,
  normalizeAudienceCondition,
} from '../../settings/campaign-audience-conditions';
import {
  AUDIENCE_FIELD_OPTIONS,
  AUDIENCE_OPERATOR_OPTIONS,
  operatorTakesValue,
  resolveConditionValueOptions,
  type AudienceConditionValueOptions,
} from './AudienceConditionBuilder.options';
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
      if (next !== null) accumulator.push(next);
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
  fieldValueOptions: AudienceConditionValueOptions;
  onChange: (next: FilemakerAudienceCondition) => void;
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
        className='min-w-[12rem] flex-1'
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
      className='min-w-[10rem] flex-1'
      onChange={(event) => onChange({ ...condition, value: event.target.value })}
      placeholder='value'
      value={condition.value}
    />
  );
}
function ConditionRow({
  condition,
  fieldValueOptions,
  onChange,
  onRemove,
}: ConditionRowProps): React.JSX.Element {
  const valueOptions = resolveConditionValueOptions(
    condition.value,
    fieldValueOptions[condition.field] ?? []
  );
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <SelectSimple
        ariaLabel='Field'
        onValueChange={(value) =>
          onChange({ ...condition, field: value as FilemakerAudienceField })
        }
        options={AUDIENCE_FIELD_OPTIONS}
        size='sm'
        value={condition.field}
      />
      <SelectSimple
        ariaLabel='Operator'
        onValueChange={(value) =>
          onChange({ ...condition, operator: value as FilemakerAudienceOperator })
        }
        options={AUDIENCE_OPERATOR_OPTIONS}
        size='sm'
        value={condition.operator}
      />
      <ConditionValueControl
        condition={condition}
        onChange={onChange}
        valueOptions={valueOptions}
      />
      <Button
        aria-label='Remove condition'
        onClick={onRemove}
        size='sm'
        type='button'
        variant='outline'
      >
        <Trash2 className='size-3' />
      </Button>
    </div>
  );
}

export type AudienceGroupEditorProps = {
  fieldValueOptions: AudienceConditionValueOptions;
  group: FilemakerAudienceConditionGroup;
  depth: number;
  onChange: (next: FilemakerAudienceConditionGroup) => void;
  onRemove?: () => void;
};
type GroupEditorHeaderProps = Pick<
  AudienceGroupEditorProps,
  'group' | 'onChange' | 'onRemove'
> & {
  onAddCondition: () => void;
  onAddDemandCondition: () => void;
  onAddGroup: () => void;
};
function GroupEditorHeader({
  group,
  onAddCondition,
  onAddDemandCondition,
  onAddGroup,
  onChange,
  onRemove,
}: GroupEditorHeaderProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-[11px] uppercase tracking-wide text-gray-400'>
        Match {group.combinator === 'and' ? 'all' : 'any'} of
      </span>
      <SelectSimple
        ariaLabel='Group combinator'
        onValueChange={(value) =>
          onChange({ ...group, combinator: value === 'or' ? 'or' : 'and' })
        }
        options={[
          { value: 'and', label: 'AND' },
          { value: 'or', label: 'OR' },
        ]}
        size='sm'
        value={group.combinator}
      />
      <div className='ml-auto flex gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={onAddCondition}>
          <Plus className='size-3' /> Condition
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={onAddDemandCondition}>
          <Plus className='size-3' /> Demand
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={onAddGroup}>
          <Plus className='size-3' /> Group
        </Button>
        {onRemove !== undefined ? (
          <Button
            aria-label='Remove group'
            onClick={onRemove}
            size='sm'
            type='button'
            variant='outline'
          >
            <Trash2 className='size-3' />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
type GroupChildrenEditorProps = Pick<AudienceGroupEditorProps, 'fieldValueOptions'> & {
  children: FilemakerAudienceConditionGroup['children'];
  depth: number;
  onUpdateChild: (
    childId: string,
    next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null
  ) => void;
};
function GroupChildrenEditor({
  children,
  depth,
  fieldValueOptions,
  onUpdateChild,
}: GroupChildrenEditorProps): React.JSX.Element {
  if (children.length === 0) {
    return (
      <div className='text-[11px] text-gray-500'>
        No conditions yet. Add one with the buttons above - an empty group matches everyone.
      </div>
    );
  }
  return (
    <div className='space-y-2'>
      {children.map((child) =>
        child.type === 'group' ? (
          <AudienceGroupEditor
            key={child.id}
            depth={depth + 1}
            fieldValueOptions={fieldValueOptions}
            group={child}
            onChange={(next) => onUpdateChild(child.id, next)}
            onRemove={() => onUpdateChild(child.id, null)}
          />
        ) : (
          <ConditionRow
            key={child.id}
            condition={child}
            fieldValueOptions={fieldValueOptions}
            onChange={(next) => onUpdateChild(child.id, next)}
            onRemove={() => onUpdateChild(child.id, null)}
          />
        )
      )}
    </div>
  );
}

const createAudienceCondition = (
  field: FilemakerAudienceField,
  operator: FilemakerAudienceOperator
): FilemakerAudienceCondition | null =>
  normalizeAudienceCondition({ field, operator, value: '' });

export function AudienceGroupEditor({
  fieldValueOptions,
  group,
  depth,
  onChange,
  onRemove,
}: AudienceGroupEditorProps): React.JSX.Element {
  const updateChild = useCallback(
    (childId: string, next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null) => {
      onChange(replaceChild(group, childId, next));
    },
    [group, onChange]
  );
  const appendChild = useCallback(
    (child: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null): void => {
      if (child === null) return;
      onChange({ ...group, children: [...group.children, child] });
    },
    [group, onChange]
  );

  return (
    <div
      className={[
        'space-y-3 rounded-md border p-3',
        depth === 0 ? 'border-border/60 bg-card/20' : 'border-border/40 bg-card/10',
      ].join(' ')}
    >
      <GroupEditorHeader
        group={group}
        onAddCondition={() => appendChild(createAudienceCondition('organization.name', 'contains'))}
        onAddDemandCondition={() =>
          appendChild(createAudienceCondition('organization.demandValueId', 'equals'))
        }
        onAddGroup={() => appendChild(buildDefaultAudienceConditionGroup())}
        onChange={onChange}
        onRemove={onRemove}
      />
      <GroupChildrenEditor
        children={group.children}
        depth={depth}
        fieldValueOptions={fieldValueOptions}
        onUpdateChild={updateChild}
      />
    </div>
  );
}
