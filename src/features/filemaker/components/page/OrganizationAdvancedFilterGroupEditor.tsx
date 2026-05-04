'use client';

import React, { memo } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { SelectSimple } from '@/shared/ui/select-simple';
import { OrganizationAdvancedConditionEditor } from './OrganizationAdvancedConditionEditor';
import { OrganizationAdvancedFilterGroupEditor } from './OrganizationAdvancedFilterGroupEditor';
import { 
  appendConditionToOrganizationGroup, 
  appendGroupToOrganizationGroup, 
  canAddNestedOrganizationGroup 
} from './organization-advanced-filter-utils';
import type { OrganizationAdvancedFilterGroup, OrganizationAdvancedFilterRule, OrganizationAdvancedFilterCombinator } from '../../filemaker-organization-advanced-filters';
import type { OrganizationAdvancedFilterEditorRuntime } from './OrganizationAdvancedFilterBuilder.parts';

const COMBINATOR_OPTIONS = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

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
      canMoveDown = false, canMoveUp = false, depth = 1, group, isRoot = false, 
      onDuplicate, onMoveDown, onMoveUp, onRemove, runtime, updateParent,
    } = props;
    const { handleDuplicateRule, handleMoveRule, handleRemoveRule, handleRuleChange, onChange } = runtime;

    const updateThisGroup = (next: OrganizationAdvancedFilterGroup): void => {
      if (isRoot) onChange(next);
      else updateParent?.(next);
    };

    const handleThisRemoveRule = (ruleId: string) => handleRemoveRule(ruleId, group, updateThisGroup);
    const handleThisMoveRule = (ruleId: string, direction: -1 | 1) => handleMoveRule(ruleId, direction, group, updateThisGroup);
    const handleThisDuplicateRule = (ruleId: string) => handleDuplicateRule(ruleId, group, updateThisGroup);

    return (
      <div className='space-y-3 rounded-md border border-border/60 bg-card/30 p-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='w-28'>
            <SelectSimple
              size='sm'
              value={group.combinator}
              onValueChange={(val) => updateThisGroup({ ...group, combinator: val as OrganizationAdvancedFilterCombinator })}
              options={COMBINATOR_OPTIONS}
            />
          </div>
          <div className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
            <Checkbox checked={group.not} onCheckedChange={(c) => updateThisGroup({ ...group, not: c === true })} />
            Negate group (NOT)
          </div>
          {!isRoot && (
            <div className='ml-auto flex items-center gap-1'>
              <Button size='sm' variant='outline' onClick={onMoveUp} disabled={!canMoveUp} className='h-8 px-2'><ArrowUp className='h-3.5 w-3.5' /></Button>
              <Button size='sm' variant='outline' onClick={onMoveDown} disabled={!canMoveDown} className='h-8 px-2'><ArrowDown className='h-3.5 w-3.5' /></Button>
              <Button size='sm' variant='outline' onClick={onDuplicate} className='h-8 px-2'><Copy className='h-3.5 w-3.5' /></Button>
              {onRemove && <Button size='sm' variant='outline' onClick={onRemove} className='h-8 px-2'><Trash2 className='h-3.5 w-3.5' /></Button>}
            </div>
          )}
        </div>
        <div className='space-y-2'>
          {group.rules.map((rule: OrganizationAdvancedFilterRule, index: number) => {
            const canMoveRuleUp = index > 0;
            const canMoveRuleDown = index < group.rules.length - 1;
            return rule.type === 'condition' ? (
              <OrganizationAdvancedConditionEditor
                key={rule.id} condition={rule} parentGroup={group} updateParent={updateThisGroup} runtime={runtime}
                canMoveUp={canMoveRuleUp} canMoveDown={canMoveRuleDown} disableRemove={group.rules.length <= 1 && !isRoot}
              />
            ) : (
              <OrganizationAdvancedFilterGroupEditor
                key={rule.id} group={rule} runtime={runtime} depth={depth + 1}
                updateParent={(next) => handleRuleChange(rule.id, next, group, updateThisGroup)}
                onRemove={() => handleThisRemoveRule(rule.id)}
                onDuplicate={() => handleThisDuplicateRule(rule.id)}
                onMoveUp={() => handleThisMoveRule(rule.id, -1)}
                onMoveDown={() => handleThisMoveRule(rule.id, 1)}
                canMoveUp={canMoveRuleUp} canMoveDown={canMoveRuleDown}
              />
            );
          })}
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button size='sm' variant='outline' onClick={() => updateThisGroup(appendConditionToOrganizationGroup(group))}><Plus className='mr-1 h-3.5 w-3.5' /> Add Condition</Button>
          <Button size='sm' variant='outline' onClick={() => updateThisGroup(appendGroupToOrganizationGroup(group))} disabled={!canAddNestedOrganizationGroup(depth)}><Plus className='mr-1 h-3.5 w-3.5' /> Add Group</Button>
        </div>
      </div>
    );
  }
);
