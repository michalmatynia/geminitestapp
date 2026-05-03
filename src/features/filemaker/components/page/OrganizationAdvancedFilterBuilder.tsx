'use client';

import { memo, useMemo } from 'react';

import type {
  OrganizationAdvancedFilterGroup,
  OrganizationAdvancedFilterRule,
} from '../../filemaker-organization-advanced-filters';
import {
  OrganizationAdvancedFilterGroupEditor,
  type OrganizationAdvancedFilterBuilderFieldValueOptions,
  type OrganizationAdvancedFilterEditorRuntime,
} from './OrganizationAdvancedFilterBuilder.parts';
import {
  duplicateRuleInOrganizationGroup,
  moveRuleInOrganizationGroup,
  removeRuleFromOrganizationGroup,
  replaceRuleInOrganizationGroup,
} from './organization-advanced-filter-utils';

interface OrganizationAdvancedFilterBuilderProps {
  fieldValueOptions?: OrganizationAdvancedFilterBuilderFieldValueOptions;
  group: OrganizationAdvancedFilterGroup;
  onChange: (group: OrganizationAdvancedFilterGroup) => void;
}

export const OrganizationAdvancedFilterBuilder = memo(
  (props: OrganizationAdvancedFilterBuilderProps): React.JSX.Element => {
    const { fieldValueOptions, group, onChange } = props;
    const editorRuntime = useMemo<OrganizationAdvancedFilterEditorRuntime>(
      () => ({
        fieldValueOptions,
        onChange,
        handleDuplicateRule: (
          ruleId: string,
          parentGroup: OrganizationAdvancedFilterGroup,
          updateParent: (next: OrganizationAdvancedFilterGroup) => void
        ): void => {
          const nextGroup = duplicateRuleInOrganizationGroup(parentGroup, ruleId);
          if (nextGroup !== null) updateParent(nextGroup);
        },
        handleMoveRule: (
          ruleId: string,
          direction: -1 | 1,
          parentGroup: OrganizationAdvancedFilterGroup,
          updateParent: (next: OrganizationAdvancedFilterGroup) => void
        ): void => {
          const nextGroup = moveRuleInOrganizationGroup(parentGroup, ruleId, direction);
          if (nextGroup !== null) updateParent(nextGroup);
        },
        handleRemoveRule: (
          ruleId: string,
          parentGroup: OrganizationAdvancedFilterGroup,
          updateParent: (next: OrganizationAdvancedFilterGroup) => void
        ): void => {
          updateParent(removeRuleFromOrganizationGroup(parentGroup, ruleId));
        },
        handleRuleChange: (
          ruleId: string,
          nextRule: OrganizationAdvancedFilterRule,
          parentGroup: OrganizationAdvancedFilterGroup,
          updateParent: (next: OrganizationAdvancedFilterGroup) => void
        ): void => {
          updateParent(replaceRuleInOrganizationGroup(parentGroup, ruleId, nextRule));
        },
      }),
      [fieldValueOptions, onChange]
    );

    return (
      <OrganizationAdvancedFilterGroupEditor
        group={group}
        runtime={editorRuntime}
        isRoot
        depth={1}
      />
    );
  }
);

OrganizationAdvancedFilterBuilder.displayName = 'OrganizationAdvancedFilterBuilder';
