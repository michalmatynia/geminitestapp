'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Checkbox } from '@/shared/ui/primitives.public';
import type { FilemakerAudienceConditionGroup } from '@/shared/contracts/filemaker';

type GroupEditorHeaderProps = {
  canMoveDown?: boolean;
  canMoveUp?: boolean;
  group: FilemakerAudienceConditionGroup;
  onAddCondition: () => void;
  onAddDemandCondition: () => void;
  onAddGroup: () => void;
  onChange: (next: FilemakerAudienceConditionGroup) => void;
  onDuplicate?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
};

type OptionalGroupActionButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
};

function OptionalGroupActionButton({
  ariaLabel,
  children,
  disabled = false,
  onClick,
  title,
}: OptionalGroupActionButtonProps): React.JSX.Element | null {
  if (onClick === undefined) return null;
  return (
    <Button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      size='sm'
      title={title}
      type='button'
      variant='outline'
    >
      {children}
    </Button>
  );
}

function GroupMoveActions({
  canMoveDown = false,
  canMoveUp = false,
  onDuplicate,
  onMoveDown,
  onMoveUp,
}: Pick<
  GroupEditorHeaderProps,
  'canMoveDown' | 'canMoveUp' | 'onDuplicate' | 'onMoveDown' | 'onMoveUp'
>): React.JSX.Element {
  return (
    <>
      <OptionalGroupActionButton
        ariaLabel='Move group up'
        disabled={!canMoveUp}
        onClick={onMoveUp}
        title='Move group up'
      >
        <ArrowUp className='size-3' />
      </OptionalGroupActionButton>
      <OptionalGroupActionButton
        ariaLabel='Move group down'
        disabled={!canMoveDown}
        onClick={onMoveDown}
        title='Move group down'
      >
        <ArrowDown className='size-3' />
      </OptionalGroupActionButton>
      <OptionalGroupActionButton
        ariaLabel='Duplicate group'
        onClick={onDuplicate}
        title='Duplicate group'
      >
        <Copy className='size-3' />
      </OptionalGroupActionButton>
    </>
  );
}

function GroupAddActions({
  onAddCondition,
  onAddDemandCondition,
  onAddGroup,
  onRemove,
}: Pick<
  GroupEditorHeaderProps,
  'onAddCondition' | 'onAddDemandCondition' | 'onAddGroup' | 'onRemove'
>): React.JSX.Element {
  return (
    <>
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
        <Button aria-label='Remove group' onClick={onRemove} size='sm' title='Remove group' type='button' variant='outline'>
          <Trash2 className='size-3' />
        </Button>
      ) : null}
    </>
  );
}

export function GroupEditorHeader({
  canMoveDown = false,
  canMoveUp = false,
  group,
  onAddCondition,
  onAddDemandCondition,
  onAddGroup,
  onChange,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
}: GroupEditorHeaderProps): React.JSX.Element {
  const negateCheckboxId = `audience-group-not-${group.id}`;
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
      <div className='inline-flex items-center gap-2 text-xs text-gray-400'>
        <Checkbox
          aria-label='Negate group'
          checked={group.not === true}
          id={negateCheckboxId}
          onCheckedChange={(checked): void =>
            onChange({ ...group, not: checked === true })
          }
        />
        <label htmlFor={negateCheckboxId}>NOT</label>
      </div>
      <div className='ml-auto flex gap-2'>
        <GroupMoveActions
          canMoveDown={canMoveDown}
          canMoveUp={canMoveUp}
          onDuplicate={onDuplicate}
          onMoveDown={onMoveDown}
          onMoveUp={onMoveUp}
        />
        <GroupAddActions
          onAddCondition={onAddCondition}
          onAddDemandCondition={onAddDemandCondition}
          onAddGroup={onAddGroup}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
