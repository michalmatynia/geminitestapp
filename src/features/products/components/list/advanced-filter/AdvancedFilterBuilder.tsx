'use client';

import { memo, useMemo } from 'react';

import type { ProductAdvancedFilterGroup, ProductAdvancedFilterRule } from '@/shared/contracts/products/filters';

import {
  AdvancedFilterGroupEditor,
  type AdvancedFilterBuilderFieldValueOptions,
  type AdvancedFilterEditorRuntime,
} from './AdvancedFilterBuilder.parts';
import {
  duplicateRuleInGroup,
  moveRuleInGroup,
  removeRuleFromGroup,
  replaceRuleInGroup,
} from './advanced-filter-utils';

interface AdvancedFilterBuilderProps {
  group: ProductAdvancedFilterGroup;
  onChange: (group: ProductAdvancedFilterGroup) => void;
  fieldValueOptions?: AdvancedFilterBuilderFieldValueOptions;
}

export const AdvancedFilterBuilder = memo(function AdvancedFilterBuilder(
  props: AdvancedFilterBuilderProps
): React.JSX.Element {
  const { group, onChange, fieldValueOptions } = props;

  const editorRuntime = useMemo<AdvancedFilterEditorRuntime>(
    () => ({
      onChange,
      fieldValueOptions,
      handleRuleChange: (
        ruleId: string,
        nextRule: ProductAdvancedFilterRule,
        parentGroup: ProductAdvancedFilterGroup,
        updateParent: (next: ProductAdvancedFilterGroup) => void
      ): void => {
        updateParent(replaceRuleInGroup(parentGroup, ruleId, nextRule));
      },
      handleRemoveRule: (
        ruleId: string,
        parentGroup: ProductAdvancedFilterGroup,
        updateParent: (next: ProductAdvancedFilterGroup) => void
      ): void => {
        updateParent(removeRuleFromGroup(parentGroup, ruleId));
      },
      handleMoveRule: (
        ruleId: string,
        direction: -1 | 1,
        parentGroup: ProductAdvancedFilterGroup,
        updateParent: (next: ProductAdvancedFilterGroup) => void
      ): void => {
        const nextGroup = moveRuleInGroup(parentGroup, ruleId, direction);
        if (nextGroup) {
          updateParent(nextGroup);
        }
      },
      handleDuplicateRule: (
        ruleId: string,
        parentGroup: ProductAdvancedFilterGroup,
        updateParent: (next: ProductAdvancedFilterGroup) => void
      ): void => {
        const nextGroup = duplicateRuleInGroup(parentGroup, ruleId);
        if (nextGroup) {
          updateParent(nextGroup);
        }
      },
    }),
    [fieldValueOptions, onChange]
  );

  return <AdvancedFilterGroupEditor group={group} runtime={editorRuntime} isRoot depth={1} />;
});

AdvancedFilterBuilder.displayName = 'AdvancedFilterBuilder';
