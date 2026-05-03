import type React from 'react';

import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { formatCategoryRuleSummary } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Alert } from '@/shared/ui/alert';
import { FormSection } from '@/shared/ui/form-section';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import type { ShippingGroupListItem } from './ShippingGroupsSettings.helpers';

const getOverlapLabel = (
  conflict: ShippingGroupRuleConflict,
  categoryLabelById: Map<string, string>
): string =>
  formatCategoryRuleSummary({
    categoryIds: conflict.overlapCategoryIds,
    categoryLabelById,
  }) ?? `${conflict.overlapCategoryIds.length} categories`;

type RuleConflictsAlertProps = {
  conflicts: readonly ShippingGroupRuleConflict[];
  categoryLabelById: Map<string, string>;
};

const RuleConflictsAlert = ({
  conflicts,
  categoryLabelById,
}: RuleConflictsAlertProps): React.JSX.Element | null => {
  if (conflicts.length === 0) return null;

  return (
    <Alert variant='warning' className='mb-4'>
      <div className='space-y-1 text-sm'>
        <p>
          Conflicting auto-assign rules detected. Products in overlapping categories will need a
          manual shipping-group override unless you adjust these rules.
        </p>
        {conflicts.map((conflict) => (
          <p key={conflict.groupIds.join(':')}>
            <strong>{conflict.groupNames[0]}</strong> and{' '}
            <strong>{conflict.groupNames[1]}</strong> both match{' '}
            <strong>{getOverlapLabel(conflict, categoryLabelById)}</strong>.
          </p>
        ))}
      </div>
    </Alert>
  );
};

type SummaryAlertProps = {
  shippingGroups: readonly ProductShippingGroup[];
  summaryById: Map<string, string | null>;
};

const RedundantRulesAlert = ({
  shippingGroups,
  summaryById,
}: SummaryAlertProps): React.JSX.Element | null => {
  if (shippingGroups.length === 0) return null;

  return (
    <Alert variant='warning' className='mb-4'>
      <div className='space-y-1 text-sm'>
        <p>
          Some auto-assign rules include descendant categories already covered by parent categories.
          Edit and save these groups to simplify them.
        </p>
        {shippingGroups.map((shippingGroup) => (
          <p key={shippingGroup.id}>
            <strong>{shippingGroup.name}</strong> redundantly includes{' '}
            <strong>{summaryById.get(shippingGroup.id)}</strong>.
          </p>
        ))}
      </div>
    </Alert>
  );
};

const MissingRulesAlert = ({
  shippingGroups,
  summaryById,
}: SummaryAlertProps): React.JSX.Element | null => {
  if (shippingGroups.length === 0) return null;

  return (
    <Alert variant='warning' className='mb-4'>
      <div className='space-y-1 text-sm'>
        <p>
          Some auto-assign rules reference categories that no longer exist in this catalog. Edit and
          save these groups to repair or remove those rule entries.
        </p>
        {shippingGroups.map((shippingGroup) => (
          <p key={shippingGroup.id}>
            <strong>{shippingGroup.name}</strong> references missing categories:{' '}
            <strong>{summaryById.get(shippingGroup.id)}</strong>.
          </p>
        ))}
      </div>
    </Alert>
  );
};

type ShippingGroupsSettingsListProps = {
  selectedCatalogName: string;
  listItems: ShippingGroupListItem[];
  loading: boolean;
  loadingSelectedCatalogCategories: boolean;
  ruleConflicts: readonly ShippingGroupRuleConflict[];
  categoryLabelById: Map<string, string>;
  shippingGroupsWithRedundantRules: readonly ProductShippingGroup[];
  shippingGroupsWithMissingRuleCategories: readonly ProductShippingGroup[];
  redundantSummaryById: Map<string, string | null>;
  missingSummaryById: Map<string, string | null>;
  onEdit: (shippingGroup: ProductShippingGroup) => void;
  onDelete: (shippingGroup: ProductShippingGroup) => void;
};

export function ShippingGroupsSettingsList({
  selectedCatalogName,
  listItems,
  loading,
  loadingSelectedCatalogCategories,
  ruleConflicts,
  categoryLabelById,
  shippingGroupsWithRedundantRules,
  shippingGroupsWithMissingRuleCategories,
  redundantSummaryById,
  missingSummaryById,
  onEdit,
  onDelete,
}: ShippingGroupsSettingsListProps): React.JSX.Element {
  return (
    <FormSection
      title={`Shipping Groups for "${selectedCatalogName}"`}
      description='Assign these internal shipping groups to products, then map them into Tradera listing behavior.'
      className='p-4'
    >
      <RuleConflictsAlert conflicts={ruleConflicts} categoryLabelById={categoryLabelById} />
      <RedundantRulesAlert
        shippingGroups={shippingGroupsWithRedundantRules}
        summaryById={redundantSummaryById}
      />
      <MissingRulesAlert
        shippingGroups={shippingGroupsWithMissingRuleCategories}
        summaryById={missingSummaryById}
      />

      <div className='mt-4'>
        <SimpleSettingsList<ShippingGroupListItem>
          items={listItems}
          isLoading={loading || loadingSelectedCatalogCategories}
          onEdit={(item) => onEdit(item.original)}
          onDelete={(item) => onDelete(item.original)}
          emptyMessage='No shipping groups yet. Create shipping groups and assign them to products before mapping delivery behavior.'
        />
      </div>
    </FormSection>
  );
}
