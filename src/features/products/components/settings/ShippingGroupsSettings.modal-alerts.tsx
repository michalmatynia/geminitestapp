import type React from 'react';

import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { formatCategoryRuleSummary } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Alert } from '@/shared/ui/alert';

import { DRAFT_SHIPPING_GROUP_ID } from '../../utils/shipping-group-settings-utils';
import type { ShippingGroupRuleCoverage } from './ShippingGroupsSettings.helpers';

type RuleSummaryAlertsProps = {
  ruleCoverage: ShippingGroupRuleCoverage;
  redundantRuleSummary: string | null;
  missingRuleSummary: string | null;
  shouldShowNormalizedRuleSummary: boolean;
  normalizedRuleSummary: string | null;
};

export const ShippingGroupModalRuleSummaryAlerts = ({
  ruleCoverage,
  redundantRuleSummary,
  missingRuleSummary,
  shouldShowNormalizedRuleSummary,
  normalizedRuleSummary,
}: RuleSummaryAlertsProps): React.JSX.Element => (
  <>
    {ruleCoverage.descendantSummary !== null ? (
      <Alert variant='info' className='-mt-2'>
        <div className='text-sm'>
          This rule also matches descendant categories:{' '}
          <strong>{ruleCoverage.descendantSummary}</strong>.
        </div>
      </Alert>
    ) : null}

    {redundantRuleSummary !== null ? (
      <Alert variant='info' className='-mt-2'>
        <div className='text-sm'>
          Redundant descendant categories will be omitted on save:{' '}
          <strong>{redundantRuleSummary}</strong>.
        </div>
      </Alert>
    ) : null}

    {missingRuleSummary !== null ? (
      <Alert variant='warning' className='-mt-2'>
        <div className='text-sm'>
          Missing categories will be removed on save: <strong>{missingRuleSummary}</strong>.
        </div>
      </Alert>
    ) : null}

    {shouldShowNormalizedRuleSummary ? (
      <Alert variant='info' className='-mt-2'>
        <div className='text-sm'>
          Effective auto-assign rule after save:{' '}
          <strong>{normalizedRuleSummary ?? 'None'}</strong>.
        </div>
      </Alert>
    ) : null}
  </>
);

type ConflictAlertProps = {
  loadingModalCatalogShippingGroups: boolean;
  conflicts: readonly ShippingGroupRuleConflict[];
  categoryLabelById: Map<string, string>;
  editingShippingGroupId: string | undefined;
};

const getModalOverlapLabel = (
  conflict: ShippingGroupRuleConflict,
  categoryLabelById: Map<string, string>
): string =>
  formatCategoryRuleSummary({
    categoryIds: conflict.overlapCategoryIds,
    categoryLabelById,
  }) ?? `${conflict.overlapCategoryIds.length} categories`;

export const ShippingGroupModalConflictAlert = ({
  loadingModalCatalogShippingGroups,
  conflicts,
  categoryLabelById,
  editingShippingGroupId,
}: ConflictAlertProps): React.JSX.Element | null => {
  if (loadingModalCatalogShippingGroups || conflicts.length === 0) return null;

  const draftShippingGroupId = editingShippingGroupId ?? DRAFT_SHIPPING_GROUP_ID;
  return (
    <Alert variant='warning' className='-mt-2'>
      <div className='space-y-1 text-sm'>
        <p>
          This auto-assign rule overlaps with other shipping groups in this catalog. Products in the
          overlapping categories will need a manual shipping-group override unless you adjust these
          rules.
        </p>
        {conflicts.map((conflict) => {
          const otherGroupName =
            conflict.groupIds[0] === draftShippingGroupId
              ? conflict.groupNames[1]
              : conflict.groupNames[0];

          return (
            <p key={conflict.groupIds.join(':')}>
              Overlaps with <strong>{otherGroupName}</strong> on{' '}
              <strong>{getModalOverlapLabel(conflict, categoryLabelById)}</strong>.
            </p>
          );
        })}
      </div>
    </Alert>
  );
};
