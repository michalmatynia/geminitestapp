import { useCallback, useMemo } from 'react';

import {
  useCategories as useProductMetadataCategories,
  useShippingGroups as useProductMetadataShippingGroups,
} from '@/features/products/hooks/useProductMetadataQueries';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { useToast } from '@/shared/ui/toast';

import { useProductSettingsShippingGroupsContext } from './ProductSettingsContext';
import {
  type ShippingGroupsDeleteAction,
  type ShippingGroupsModalState,
  useShippingGroupsDeleteAction,
  useShippingGroupsModalState,
  useShippingGroupsSaveAction,
} from './ShippingGroupsSettings.actions';
import {
  buildCatalogOptions,
  type ShippingGroupToast,
  toOptionalCatalogId,
} from './ShippingGroupsSettings.helpers';
import { useShippingGroupsListRuleModel } from './ShippingGroupsSettings.list-model';
import { useShippingGroupsModalRuleModel } from './ShippingGroupsSettings.modal-model';
import type { ShippingGroupsModalRuleModel } from './ShippingGroupsSettings.modal-model';
import type { ShippingGroupsSettingsViewProps } from './ShippingGroupsSettings.view';

type MetadataState = {
  selectedCatalogCategories: ProductCategory[];
  loadingSelectedCatalogCategories: boolean;
  modalCatalogCategories: ProductCategory[];
  loadingModalCatalogCategories: boolean;
  modalCatalogShippingGroups: ProductShippingGroup[];
  loadingModalCatalogShippingGroups: boolean;
};

const useShippingGroupsMetadataState = ({
  selectedCatalogId,
  formCatalogId,
  showModal,
}: {
  selectedCatalogId: string | null;
  formCatalogId: string;
  showModal: boolean;
}): MetadataState => {
  const selectedCatalogQueryId = toOptionalCatalogId(selectedCatalogId);
  const selectedCategories = useProductMetadataCategories(selectedCatalogQueryId, {
    enabled: selectedCatalogQueryId !== undefined,
  });
  const modalCatalogQueryId = toOptionalCatalogId(formCatalogId);
  const modalCategories = useProductMetadataCategories(modalCatalogQueryId, {
    enabled: modalCatalogQueryId !== undefined,
  });
  const modalShippingGroups = useProductMetadataShippingGroups(modalCatalogQueryId, {
    enabled: modalCatalogQueryId !== undefined && showModal,
  });
  return {
    selectedCatalogCategories: selectedCategories.data ?? [],
    loadingSelectedCatalogCategories: selectedCategories.isLoading,
    modalCatalogCategories: modalCategories.data ?? [],
    loadingModalCatalogCategories: modalCategories.isLoading,
    modalCatalogShippingGroups: modalShippingGroups.data ?? [],
    loadingModalCatalogShippingGroups: modalShippingGroups.isLoading,
  };
};

type ControllerActions = {
  deleteAction: ShippingGroupsDeleteAction;
  onSave: () => void;
  isSaving: boolean;
};

const useShippingGroupsControllerActions = ({
  selectedCatalogId,
  onRefresh,
  modalState,
  modalModel,
  toast,
}: {
  selectedCatalogId: string | null;
  onRefresh: () => void;
  modalState: ShippingGroupsModalState;
  modalModel: ShippingGroupsModalRuleModel;
  toast: ShippingGroupToast;
}): ControllerActions => {
  const saveAction = useShippingGroupsSaveAction({
    formData: modalState.formData,
    editingShippingGroup: modalState.editingShippingGroup,
    setShowModal: modalState.setShowModal,
    onRefresh,
    toast,
  });
  const deleteAction = useShippingGroupsDeleteAction({ selectedCatalogId, onRefresh, toast });
  const onSave = useCallback((): void => {
    void saveAction.handleSave({
      conflicts: modalModel.ruleConflicts,
      categoryLabelById: modalModel.categoryLabelById,
      normalizedRuleIds: modalModel.normalizedRuleIds,
    });
  }, [modalModel.categoryLabelById, modalModel.normalizedRuleIds, modalModel.ruleConflicts, saveAction]);

  return { deleteAction, onSave, isSaving: saveAction.isSaving };
};

export const useShippingGroupsSettingsController = (): ShippingGroupsSettingsViewProps => {
  const settings = useProductSettingsShippingGroupsContext();
  const { toast } = useToast();
  const modalState = useShippingGroupsModalState({
    selectedCatalogId: settings.selectedShippingGroupCatalogId,
    toast,
  });
  const metadata = useShippingGroupsMetadataState({
    selectedCatalogId: settings.selectedShippingGroupCatalogId,
    formCatalogId: modalState.formData.catalogId,
    showModal: modalState.showModal,
  });
  const catalogOptions = useMemo(() => buildCatalogOptions(settings.catalogs), [settings.catalogs]);
  const selectedCatalog = useMemo(
    () => settings.catalogs.find((catalog: Catalog) => catalog.id === settings.selectedShippingGroupCatalogId),
    [settings.catalogs, settings.selectedShippingGroupCatalogId]
  );
  const listModel = useShippingGroupsListRuleModel({
    shippingGroups: settings.shippingGroups,
    selectedCatalogCategories: metadata.selectedCatalogCategories,
  });
  const modalModel = useShippingGroupsModalRuleModel({
    formData: modalState.formData,
    editingShippingGroup: modalState.editingShippingGroup,
    modalCatalogCategories: metadata.modalCatalogCategories,
    modalCatalogShippingGroups: metadata.modalCatalogShippingGroups,
  });
  const actions = useShippingGroupsControllerActions({
    selectedCatalogId: settings.selectedShippingGroupCatalogId,
    onRefresh: settings.onRefreshShippingGroups,
    modalState,
    modalModel,
    toast,
  });

  return {
    catalogs: settings.catalogs,
    selectedCatalogId: settings.selectedShippingGroupCatalogId,
    selectedCatalogName: selectedCatalog?.name ?? 'Selected Catalog',
    onCatalogChange: settings.onShippingGroupCatalogChange,
    catalogOptions,
    loading: settings.loadingShippingGroups,
    loadingSelectedCatalogCategories: metadata.loadingSelectedCatalogCategories,
    modalCatalogCategories: metadata.modalCatalogCategories,
    loadingModalCatalogCategories: metadata.loadingModalCatalogCategories,
    loadingModalCatalogShippingGroups: metadata.loadingModalCatalogShippingGroups,
    listModel,
    modalModel,
    modalState,
    deleteAction: actions.deleteAction,
    onSave: actions.onSave,
    isSaving: actions.isSaving,
  };
};
