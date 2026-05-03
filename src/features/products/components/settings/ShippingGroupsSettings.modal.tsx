import type React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { FormModal } from '@/shared/ui/FormModal';

import type { ShippingGroupRuleCoverage } from './ShippingGroupsSettings.helpers';
import {
  CategoryRuleField,
  ShippingGroupBasicFields,
  type ShippingGroupFormDataSetter,
  TraderaFields,
} from './ShippingGroupsSettings.modal-fields';
import {
  ShippingGroupModalConflictAlert,
  ShippingGroupModalRuleSummaryAlerts,
} from './ShippingGroupsSettings.modal-alerts';

type ShippingGroupFormModalProps = {
  open: boolean;
  editingShippingGroup: ProductShippingGroup | null;
  formData: ShippingGroupFormData;
  setFormData: ShippingGroupFormDataSetter;
  catalogOptions: Array<LabeledOptionDto<string>>;
  modalCatalogCategories: readonly ProductCategory[];
  categoryOptions: Array<LabeledOptionDto<string>>;
  categoryLabelById: Map<string, string>;
  loadingModalCatalogCategories: boolean;
  loadingModalCatalogShippingGroups: boolean;
  ruleCoverage: ShippingGroupRuleCoverage;
  redundantRuleSummary: string | null;
  missingRuleSummary: string | null;
  shouldShowNormalizedRuleSummary: boolean;
  normalizedRuleSummary: string | null;
  ruleConflicts: readonly ShippingGroupRuleConflict[];
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
};

const ShippingGroupFormModalBody = (
  props: ShippingGroupFormModalProps
): React.JSX.Element => (
  <div className='space-y-4'>
    <ShippingGroupBasicFields
      formData={props.formData}
      setFormData={props.setFormData}
      catalogOptions={props.catalogOptions}
    />
    <CategoryRuleField
      formData={props.formData}
      setFormData={props.setFormData}
      modalCatalogCategories={props.modalCatalogCategories}
      categoryOptions={props.categoryOptions}
      categoryLabelById={props.categoryLabelById}
      loadingModalCatalogCategories={props.loadingModalCatalogCategories}
    />
    <ShippingGroupModalRuleSummaryAlerts
      ruleCoverage={props.ruleCoverage}
      redundantRuleSummary={props.redundantRuleSummary}
      missingRuleSummary={props.missingRuleSummary}
      shouldShowNormalizedRuleSummary={props.shouldShowNormalizedRuleSummary}
      normalizedRuleSummary={props.normalizedRuleSummary}
    />
    <ShippingGroupModalConflictAlert
      loadingModalCatalogShippingGroups={props.loadingModalCatalogShippingGroups}
      conflicts={props.ruleConflicts}
      categoryLabelById={props.categoryLabelById}
      editingShippingGroupId={props.editingShippingGroup?.id}
    />
    <TraderaFields formData={props.formData} setFormData={props.setFormData} />
  </div>
);

export function ShippingGroupFormModal(
  props: ShippingGroupFormModalProps
): React.JSX.Element | null {
  if (!props.open) return null;

  return (
    <FormModal
      open={props.open}
      onClose={props.onClose}
      title={props.editingShippingGroup === null ? 'Create Shipping Group' : 'Edit Shipping Group'}
      onSave={props.onSave}
      isSaving={props.isSaving}
      size='md'
    >
      <ShippingGroupFormModalBody {...props} />
    </FormModal>
  );
}
