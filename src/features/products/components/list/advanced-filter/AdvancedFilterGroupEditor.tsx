'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { memo } from 'react';

import { PRODUCT_ADVANCED_FILTER_MAX_DEPTH } from '@/shared/contracts/products/filters';
import {
  type ProductAdvancedFilterCombinator,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterRule,
} from '@/shared/contracts/products';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { SelectSimple } from '@/shared/ui/select-simple';

import { AdvancedFilterConditionEditor } from './AdvancedFilterConditionEditor';
import { COMBINATOR_OPTIONS } from './AdvancedFilterBuilder.constants';
import type { AdvancedFilterEditorRuntime, UpdateAdvancedFilterGroup } from './AdvancedFilterBuilder.types';
import { appendConditionToGroup, appendGroupToGroup } from './advanced-filter-utils';

type AdvancedFilterGroupEditorProps = {
  group: ProductAdvancedFilterGroup;
  runtime: AdvancedFilterEditorRuntime;
  updateParent?: UpdateAdvancedFilterGroup;
  onRemove?: (() => void) | undefined;
  onDuplicate?: (() => void) | undefined;
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  canMoveUp?: boolean | undefined;
  canMoveDown?: boolean | undefined;
  isRoot?: boolean | undefined;
  depth?: number | undefined;
};

type AdvancedFilterGroupController = Required<
  Pick<
    AdvancedFilterGroupEditorProps,
    'canMoveDown' | 'canMoveUp' | 'depth' | 'group' | 'isRoot' | 'runtime'
  >
> & {
  canAddNestedGroup: boolean;
  canRemoveLeaf: boolean;
  handleAddCondition: () => void;
  handleAddGroup: () => void;
  handleCombinatorChange: (value: string) => void;
  handleGroupDuplicate: () => void;
  handleGroupMoveDown: () => void;
  handleGroupMoveUp: () => void;
  handleNegatedChange: (checked: boolean | 'indeterminate') => void;
  handleThisDuplicateRule: (ruleId: string) => void;
  handleThisMoveRule: (ruleId: string, direction: -1 | 1) => void;
  handleThisRemoveRule: (ruleId: string) => void;
  onRemove: (() => void) | undefined;
  updateThisGroup: UpdateAdvancedFilterGroup;
};

const GROUP_ACTION_BUTTON_CLASSNAME = 'h-8 px-2';

const isProductAdvancedFilterCombinator = (
  value: string
): value is ProductAdvancedFilterCombinator => value === 'and' || value === 'or';

function useAdvancedFilterGroupController(
  props: AdvancedFilterGroupEditorProps
): AdvancedFilterGroupController {
  const { group, runtime } = props;
  const canMoveDown = props.canMoveDown ?? false;
  const canMoveUp = props.canMoveUp ?? false;
  const depth = props.depth ?? 1;
  const isRoot = props.isRoot ?? false;
  const updateThisGroup = (next: ProductAdvancedFilterGroup): void => {
    if (isRoot) {
      runtime.onChange(next);
      return;
    }
    if (props.updateParent !== undefined) props.updateParent(next);
  };

  return {
    canAddNestedGroup: depth < PRODUCT_ADVANCED_FILTER_MAX_DEPTH,
    canMoveDown,
    canMoveUp,
    canRemoveLeaf: group.rules.length > 1 || !isRoot,
    depth,
    group,
    handleAddCondition: (): void => updateThisGroup(appendConditionToGroup(group)),
    handleAddGroup: (): void => updateThisGroup(appendGroupToGroup(group)),
    handleCombinatorChange: (value: string): void => {
      if (isProductAdvancedFilterCombinator(value)) updateThisGroup({ ...group, combinator: value });
    },
    handleGroupDuplicate: (): void => {
      if (props.onDuplicate !== undefined) props.onDuplicate();
    },
    handleGroupMoveDown: (): void => {
      if (props.onMoveDown !== undefined) props.onMoveDown();
    },
    handleGroupMoveUp: (): void => {
      if (props.onMoveUp !== undefined) props.onMoveUp();
    },
    handleNegatedChange: (checked: boolean | 'indeterminate'): void =>
      updateThisGroup({ ...group, not: checked === true }),
    handleThisDuplicateRule: (ruleId: string): void =>
      runtime.handleDuplicateRule(ruleId, group, updateThisGroup),
    handleThisMoveRule: (ruleId: string, direction: -1 | 1): void =>
      runtime.handleMoveRule(ruleId, direction, group, updateThisGroup),
    handleThisRemoveRule: (ruleId: string): void =>
      runtime.handleRemoveRule(ruleId, group, updateThisGroup),
    isRoot,
    onRemove: props.onRemove,
    runtime,
    updateThisGroup,
  };
}

function GroupIconButton({
  disabled,
  Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      size='sm'
      variant='outline'
      onClick={onClick}
      disabled={disabled}
      className={GROUP_ACTION_BUTTON_CLASSNAME}
      aria-label={label}
      title={label}
    >
      <Icon className='h-3.5 w-3.5' />
    </Button>
  );
}

function GroupActions({
  controller,
}: {
  controller: AdvancedFilterGroupController;
}): React.JSX.Element | null {
  if (controller.isRoot) return null;
  const actions: Array<{ disabled: boolean; Icon: LucideIcon; label: string; onClick: () => void }> =
    [
      { disabled: !controller.canMoveUp, Icon: ArrowUp, label: 'Move group up', onClick: controller.handleGroupMoveUp },
      { disabled: !controller.canMoveDown, Icon: ArrowDown, label: 'Move group down', onClick: controller.handleGroupMoveDown },
      { disabled: false, Icon: Copy, label: 'Duplicate group', onClick: controller.handleGroupDuplicate },
    ];
  if (controller.onRemove !== undefined) {
    actions.push({ disabled: false, Icon: Trash2, label: 'Remove group', onClick: controller.onRemove });
  }

  return (
    <div className='ml-auto flex items-center gap-1'>
      {actions.map((action) => (
        <GroupIconButton key={action.label} {...action} />
      ))}
    </div>
  );
}

function GroupHeader({
  controller,
}: {
  controller: AdvancedFilterGroupController;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='w-28'>
        <SelectSimple
          size='sm'
          value={controller.group.combinator}
          onValueChange={controller.handleCombinatorChange}
          options={COMBINATOR_OPTIONS}
          ariaLabel='Group combinator'
          title='Select option'
        />
      </div>
      <div className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
        <Checkbox
          checked={controller.group.not}
          aria-label='Negate group (NOT)'
          onCheckedChange={controller.handleNegatedChange}
        />
        Negate group (NOT)
      </div>
      <GroupActions controller={controller} />
    </div>
  );
}

function AdvancedFilterRuleItem({
  controller,
  index,
  rule,
}: {
  controller: AdvancedFilterGroupController;
  index: number;
  rule: ProductAdvancedFilterRule;
}): React.JSX.Element {
  const canMoveRuleUp = index > 0;
  const canMoveRuleDown = index < controller.group.rules.length - 1;
  if (rule.type === 'condition') {
    return (
      <AdvancedFilterConditionEditor
        condition={rule}
        parentGroup={controller.group}
        updateParent={controller.updateThisGroup}
        runtime={controller.runtime}
        canMoveUp={canMoveRuleUp}
        canMoveDown={canMoveRuleDown}
        disableRemove={!controller.canRemoveLeaf}
      />
    );
  }
  return (
    <AdvancedFilterGroupEditor
      group={rule}
      runtime={controller.runtime}
      depth={controller.depth + 1}
      updateParent={(nextGroup: ProductAdvancedFilterGroup): void => {
        controller.runtime.handleRuleChange(
          rule.id,
          nextGroup,
          controller.group,
          controller.updateThisGroup
        );
      }}
      onRemove={() => {
        controller.handleThisRemoveRule(rule.id);
      }}
      onDuplicate={() => {
        controller.handleThisDuplicateRule(rule.id);
      }}
      onMoveUp={() => {
        controller.handleThisMoveRule(rule.id, -1);
      }}
      onMoveDown={() => {
        controller.handleThisMoveRule(rule.id, 1);
      }}
      canMoveUp={canMoveRuleUp}
      canMoveDown={canMoveRuleDown}
    />
  );
}

function GroupRuleList({
  controller,
}: {
  controller: AdvancedFilterGroupController;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      {controller.group.rules.map((rule: ProductAdvancedFilterRule, index: number) => (
        <AdvancedFilterRuleItem key={rule.id} controller={controller} index={index} rule={rule} />
      ))}
    </div>
  );
}

function GroupFooterActions({
  controller,
}: {
  controller: AdvancedFilterGroupController;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' variant='outline' size='sm' onClick={controller.handleAddCondition}>
        <Plus className='mr-1 h-3.5 w-3.5' />
        Add Condition
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={controller.handleAddGroup}
        disabled={!controller.canAddNestedGroup}
      >
        <Plus className='mr-1 h-3.5 w-3.5' />
        Add Group
      </Button>
    </div>
  );
}

export const AdvancedFilterGroupEditor = memo((
  props: AdvancedFilterGroupEditorProps
): React.JSX.Element => {
  const controller = useAdvancedFilterGroupController(props);

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/30 p-3'>
      <GroupHeader controller={controller} />
      <GroupRuleList controller={controller} />
      <GroupFooterActions controller={controller} />
    </div>
  );
});
