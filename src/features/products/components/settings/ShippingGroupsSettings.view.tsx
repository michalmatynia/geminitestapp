import { Plus } from 'lucide-react';
import type React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

import type {
  ShippingGroupsDeleteAction,
  ShippingGroupsModalState,
} from './ShippingGroupsSettings.actions';
import { hasCatalogId } from './ShippingGroupsSettings.helpers';
import type { ShippingGroupsListRuleModel } from './ShippingGroupsSettings.list-model';
import { ShippingGroupsSettingsList } from './ShippingGroupsSettings.list';
import { ShippingGroupFormModal } from './ShippingGroupsSettings.modal';
import type { ShippingGroupsModalRuleModel } from './ShippingGroupsSettings.modal-model';

type CatalogSelectorProps = {
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  catalogOptions: Array<LabeledOptionDto<string>>;
};

const CatalogSelector = ({
  selectedCatalogId,
  onCatalogChange,
  catalogOptions,
}: CatalogSelectorProps): React.JSX.Element => (
  <FormSection
    title='Select Catalog'
    description='Shipping groups are managed per catalog.'
    className='p-4'
  >
    <div className='w-full max-w-xs mt-4'>
      <SelectSimple
        size='sm'
        value={selectedCatalogId ?? ''}
        onValueChange={onCatalogChange}
        options={catalogOptions}
        placeholder='Select a catalog...'
        ariaLabel='Catalog'
        title='Select a catalog...'
      />
    </div>
  </FormSection>
);

type SelectedCatalogContentProps = {
  selectedCatalogName: string;
  loading: boolean;
  loadingSelectedCatalogCategories: boolean;
  listModel: ShippingGroupsListRuleModel;
  modalState: ShippingGroupsModalState;
  deleteAction: ShippingGroupsDeleteAction;
};

const SelectedCatalogContent = ({
  selectedCatalogName,
  loading,
  loadingSelectedCatalogCategories,
  listModel,
  modalState,
  deleteAction,
}: SelectedCatalogContentProps): React.JSX.Element => (
  <>
    <div className='flex justify-start'>
      <Button onClick={modalState.openCreateModal} className='bg-white text-gray-900 hover:bg-gray-200'>
        <Plus className='size-4 mr-2' />
        Add Shipping Group
      </Button>
    </div>
    <ShippingGroupsSettingsList
      selectedCatalogName={selectedCatalogName}
      listItems={listModel.listItems}
      loading={loading}
      loadingSelectedCatalogCategories={loadingSelectedCatalogCategories}
      ruleConflicts={listModel.ruleConflicts}
      categoryLabelById={listModel.categoryLabelById}
      shippingGroupsWithRedundantRules={listModel.shippingGroupsWithRedundantRules}
      shippingGroupsWithMissingRuleCategories={listModel.shippingGroupsWithMissingRuleCategories}
      redundantSummaryById={listModel.redundantSummaryById}
      missingSummaryById={listModel.missingSummaryById}
      onEdit={modalState.openEditModal}
      onDelete={deleteAction.handleDelete}
    />
  </>
);

type DeleteConfirmProps = {
  deleteAction: ShippingGroupsDeleteAction;
};

const DeleteConfirm = ({ deleteAction }: DeleteConfirmProps): React.JSX.Element => (
  <ConfirmModal
    isOpen={deleteAction.shippingGroupToDelete !== null}
    onClose={() => deleteAction.setShippingGroupToDelete(null)}
    onConfirm={() => {
      void deleteAction.handleConfirmDelete();
    }}
    title='Delete Shipping Group'
    message={`Are you sure you want to delete shipping group "${deleteAction.shippingGroupToDelete?.name ?? ''}"? This action cannot be undone.`}
    confirmText='Delete'
    isDangerous={true}
  />
);

type ModalSlotProps = {
  modalState: ShippingGroupsModalState;
  modalModel: ShippingGroupsModalRuleModel;
  catalogOptions: Array<LabeledOptionDto<string>>;
  modalCatalogCategories: readonly ProductCategory[];
  loadingModalCatalogCategories: boolean;
  loadingModalCatalogShippingGroups: boolean;
  onSave: () => void;
  isSaving: boolean;
};

const ModalSlot = ({
  modalState,
  modalModel,
  catalogOptions,
  modalCatalogCategories,
  loadingModalCatalogCategories,
  loadingModalCatalogShippingGroups,
  onSave,
  isSaving,
}: ModalSlotProps): React.JSX.Element => (
  <ShippingGroupFormModal
    open={modalState.showModal}
    editingShippingGroup={modalState.editingShippingGroup}
    formData={modalState.formData}
    setFormData={modalState.setFormData}
    catalogOptions={catalogOptions}
    modalCatalogCategories={modalCatalogCategories}
    categoryOptions={modalModel.categoryOptions}
    categoryLabelById={modalModel.categoryLabelById}
    loadingModalCatalogCategories={loadingModalCatalogCategories}
    loadingModalCatalogShippingGroups={loadingModalCatalogShippingGroups}
    ruleCoverage={modalModel.ruleCoverage}
    redundantRuleSummary={modalModel.redundantRuleSummary}
    missingRuleSummary={modalModel.missingRuleSummary}
    shouldShowNormalizedRuleSummary={modalModel.shouldShowNormalizedRuleSummary}
    normalizedRuleSummary={modalModel.normalizedRuleSummary}
    ruleConflicts={modalModel.ruleConflicts}
    onClose={modalState.closeModal}
    onSave={onSave}
    isSaving={isSaving}
  />
);

export type ShippingGroupsSettingsViewProps = {
  catalogs: readonly Catalog[];
  selectedCatalogId: string | null;
  selectedCatalogName: string;
  onCatalogChange: (catalogId: string) => void;
  catalogOptions: Array<LabeledOptionDto<string>>;
  loading: boolean;
  loadingSelectedCatalogCategories: boolean;
  modalCatalogCategories: readonly ProductCategory[];
  loadingModalCatalogCategories: boolean;
  loadingModalCatalogShippingGroups: boolean;
  listModel: ShippingGroupsListRuleModel;
  modalModel: ShippingGroupsModalRuleModel;
  modalState: ShippingGroupsModalState;
  deleteAction: ShippingGroupsDeleteAction;
  onSave: () => void;
  isSaving: boolean;
};

export function ShippingGroupsSettingsView({
  catalogs,
  selectedCatalogId,
  selectedCatalogName,
  onCatalogChange,
  catalogOptions,
  loading,
  loadingSelectedCatalogCategories,
  modalCatalogCategories,
  loadingModalCatalogCategories,
  loadingModalCatalogShippingGroups,
  listModel,
  modalModel,
  modalState,
  deleteAction,
  onSave,
  isSaving,
}: ShippingGroupsSettingsViewProps): React.JSX.Element {
  const hasSelectedCatalog = hasCatalogId(selectedCatalogId);
  return (
    <div className='space-y-5'>
      <CatalogSelector
        selectedCatalogId={selectedCatalogId}
        onCatalogChange={onCatalogChange}
        catalogOptions={catalogOptions}
      />
      {hasSelectedCatalog ? (
        <SelectedCatalogContent
          selectedCatalogName={selectedCatalogName}
          loading={loading}
          loadingSelectedCatalogCategories={loadingSelectedCatalogCategories}
          listModel={listModel}
          modalState={modalState}
          deleteAction={deleteAction}
        />
      ) : null}
      {!hasSelectedCatalog && catalogs.length === 0 ? (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding shipping groups.'
        />
      ) : null}
      <DeleteConfirm deleteAction={deleteAction} />
      <ModalSlot
        modalState={modalState}
        modalModel={modalModel}
        catalogOptions={catalogOptions}
        modalCatalogCategories={modalCatalogCategories}
        loadingModalCatalogCategories={loadingModalCatalogCategories}
        loadingModalCatalogShippingGroups={loadingModalCatalogShippingGroups}
        onSave={onSave}
        isSaving={isSaving}
      />
    </div>
  );
}
