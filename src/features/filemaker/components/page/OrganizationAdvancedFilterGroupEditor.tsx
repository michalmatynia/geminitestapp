'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { memo } from 'react';

import type {
  OrganizationAdvancedFilterCombinator,
  OrganizationAdvancedFilterGroup,
  OrganizationAdvancedFilterRule,
} from '../../filemaker-organization-advanced-filters';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { SelectSimple } from '@/shared/ui/select-simple';

import { OrganizationAdvancedConditionEditor } from './OrganizationAdvancedConditionEditor';
import {
  COMBINATOR_OPTIONS,
  type OrganizationAdvancedFilterEditorRuntime,
} from './OrganizationAdvancedFilterBuilder.shared';
import {
  appendConditionToOrganizationGroup,
  appendGroupToOrganizationGroup,
  canAddNestedOrganizationGroup,
} from './organization-advanced-filter-utils';

interface OrganizationAdvancedFilterGroupEditorProps {
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
}

interface GroupEditorFrameProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  depth: number;
  group: OrganizationAdvancedFilterGroup;
  isRoot: boolean;
  onDuplicate?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
  runtime: OrganizationAdvancedFilterEditorRuntime;
  updateThisGroup: (next: OrganizationAdvancedFilterGroup) => void;
}

interface GroupRuleListProps {
  canRemoveLeaf: boolean;
  depth: number;
  group: OrganizationAdvancedFilterGroup;
  runtime: OrganizationAdvancedFilterEditorRuntime;
  updateThisGroup: (next: OrganizationAdvancedFilterGroup) => void;
}

const OrganizationGroupMoveControls = (props: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  onDuplicate?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
}): React.JSX.Element => (
  <div className='ml-auto flex items-center gap-1'>
    <Button
      type='button'
      size='sm'
      variant='outline'
      onClick={props.onMoveUp}
      disabled={!props.canMoveUp}
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
      onClick={props.onMoveDown}
      disabled={!props.canMoveDown}
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
      onClick={props.onDuplicate}
      className='h-8 px-2'
      aria-label='Duplicate organisation group'
      title='Duplicate group'
    >
      <Copy className='h-3.5 w-3.5' />
    </Button>
    {props.onRemove !== undefined ? (
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={props.onRemove}
        className='h-8 px-2'
        aria-label='Remove organisation group'
        title='Remove group'
      >
        <Trash2 className='h-3.5 w-3.5' />
      </Button>
    ) : null}
  </div>
);

const OrganizationGroupHeader = (props: GroupEditorFrameProps): React.JSX.Element => (
  <div className='flex flex-wrap items-center gap-2'>
    <div className='w-28'>
      <SelectSimple
        size='sm'
        value={props.group.combinator}
        onValueChange={(value: string): void =>
          props.updateThisGroup({
            ...props.group,
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
        checked={props.group.not}
        aria-label='Negate organisation group'
        onCheckedChange={(checked): void =>
          props.updateThisGroup({
            ...props.group,
            not: checked === true,
          })
        }
      />
      Negate group (NOT)
    </div>
    {!props.isRoot ? <OrganizationGroupMoveControls {...props} /> : null}
  </div>
);

const renderOrganizationGroupRule = (
  props: GroupRuleListProps,
  rule: OrganizationAdvancedFilterRule,
  index: number
): React.JSX.Element => {
  const { canRemoveLeaf, depth, group, runtime, updateThisGroup } = props;
  const canMoveUp = index > 0;
  const canMoveDown = index < group.rules.length - 1;
  if (rule.type === 'condition') {
    return (
      <OrganizationAdvancedConditionEditor
        key={rule.id}
        condition={rule}
        parentGroup={group}
        updateParent={updateThisGroup}
        runtime={runtime}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        disableRemove={!canRemoveLeaf}
      />
    );
  }
  return (
    <OrganizationAdvancedFilterGroupEditor
      key={rule.id}
      group={rule}
      runtime={runtime}
      depth={depth + 1}
      updateParent={(nextGroup): void =>
        runtime.handleRuleChange(rule.id, nextGroup, group, updateThisGroup)
      }
      onRemove={(): void => runtime.handleRemoveRule(rule.id, group, updateThisGroup)}
      onDuplicate={(): void => runtime.handleDuplicateRule(rule.id, group, updateThisGroup)}
      onMoveUp={(): void => runtime.handleMoveRule(rule.id, -1, group, updateThisGroup)}
      onMoveDown={(): void => runtime.handleMoveRule(rule.id, 1, group, updateThisGroup)}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
    />
  );
};

const OrganizationGroupRuleList = (props: GroupRuleListProps): React.JSX.Element => (
  <div className='space-y-2'>
    {props.group.rules.map((rule, index) => renderOrganizationGroupRule(props, rule, index))}
  </div>
);

const OrganizationGroupAddButtons = (props: {
  depth: number;
  group: OrganizationAdvancedFilterGroup;
  updateThisGroup: (next: OrganizationAdvancedFilterGroup) => void;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={(): void => props.updateThisGroup(appendConditionToOrganizationGroup(props.group))}
    >
      <Plus className='mr-1 h-3.5 w-3.5' />
      Add Condition
    </Button>
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={(): void => props.updateThisGroup(appendGroupToOrganizationGroup(props.group))}
      disabled={!canAddNestedOrganizationGroup(props.depth)}
    >
      <Plus className='mr-1 h-3.5 w-3.5' />
      Add Group
    </Button>
  </div>
);

const OrganizationGroupEditorFrame = (props: GroupEditorFrameProps): React.JSX.Element => {
  const canRemoveLeaf = props.group.rules.length > 1 || !props.isRoot;
  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/30 p-3'>
      <OrganizationGroupHeader {...props} />
      <OrganizationGroupRuleList
        canRemoveLeaf={canRemoveLeaf}
        depth={props.depth}
        group={props.group}
        runtime={props.runtime}
        updateThisGroup={props.updateThisGroup}
      />
      <OrganizationGroupAddButtons
        depth={props.depth}
        group={props.group}
        updateThisGroup={props.updateThisGroup}
      />
    </div>
  );
};

export const OrganizationAdvancedFilterGroupEditor = memo(
  (props: OrganizationAdvancedFilterGroupEditorProps): React.JSX.Element => {
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
    const updateThisGroup = (next: OrganizationAdvancedFilterGroup): void => {
      if (isRoot) {
        runtime.onChange(next);
        return;
      }
      updateParent?.(next);
    };
    return (
      <OrganizationGroupEditorFrame
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        depth={depth}
        group={group}
        isRoot={isRoot}
        onDuplicate={onDuplicate}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
        runtime={runtime}
        updateThisGroup={updateThisGroup}
      />
    );
  }
);

OrganizationAdvancedFilterGroupEditor.displayName = 'OrganizationAdvancedFilterGroupEditor';
