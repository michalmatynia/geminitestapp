'use client';

import { useState } from 'react';

import {
  useDeleteCatalogMutation,
  useDeletePriceGroupMutation,
  useUpdatePriceGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type {
  ProductSettingsConfirmation,
  ProductSettingsModalState,
} from './ProductSettingsPage.types';

type UpdatePriceGroupMutation = ReturnType<typeof useUpdatePriceGroupMutation>;
type DeleteCatalogMutation = ReturnType<typeof useDeleteCatalogMutation>;
type DeletePriceGroupMutation = ReturnType<typeof useDeletePriceGroupMutation>;
type Toast = ReturnType<typeof useToast>['toast'];

type CatalogDeleteConfirmationArgs = {
  catalog: Catalog;
  deleteCatalogMutation: DeleteCatalogMutation;
  toast: Toast;
};

type PriceGroupDeleteConfirmationArgs = {
  group: PriceGroup;
  deletePriceGroupMutation: DeletePriceGroupMutation;
  toast: Toast;
};

type UpdateDefaultPriceGroupArgs = {
  groupId: string;
  priceGroups: PriceGroup[];
  updatePriceGroupMutation: UpdatePriceGroupMutation;
  toast: Toast;
};

export type ProductSettingsActionState = ProductSettingsModalState & {
  defaultGroupId: string;
  defaultGroupSaving: boolean;
  handleSetDefaultGroup: (groupId: string) => Promise<void>;
  handleDeleteCatalog: (catalog: Catalog) => void;
  handleDeleteGroup: (group: PriceGroup) => void;
};

const resolveDefaultPriceGroupId = (priceGroups: PriceGroup[]): string =>
  priceGroups.find((group) => group.isDefault)?.id ?? '';

const createCatalogDeleteConfirmation = (
  args: CatalogDeleteConfirmationArgs
): ProductSettingsConfirmation => ({
  title: 'Delete Catalog?',
  message: `Delete catalog "${args.catalog.name}"? This action cannot be undone and will affect all products in this catalog.`,
  confirmText: 'Delete Catalog',
  isDangerous: true,
  onConfirm: async (): Promise<void> => {
    try {
      await args.deleteCatalogMutation.mutateAsync(args.catalog.id);
      args.toast('Catalog deleted.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductSettingsPage',
        action: 'handleDeleteCatalog',
        catalogId: args.catalog.id,
      });
      args.toast('Failed to delete catalog.', { variant: 'error' });
    }
  },
});

const createPriceGroupDeleteConfirmation = (
  args: PriceGroupDeleteConfirmationArgs
): ProductSettingsConfirmation => ({
  title: 'Delete Price Group?',
  message: `Delete price group "${args.group.name}"? This will remove all associated price records.`,
  confirmText: 'Delete Group',
  isDangerous: true,
  onConfirm: async (): Promise<void> => {
    try {
      await args.deletePriceGroupMutation.mutateAsync(args.group.id);
      args.toast('Price group deleted.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductSettingsPage',
        action: 'handleDeleteGroup',
        groupId: args.group.id,
      });
      args.toast('Failed to delete price group.', { variant: 'error' });
    }
  },
});

const updateDefaultPriceGroup = async (args: UpdateDefaultPriceGroupArgs): Promise<void> => {
  const group = args.priceGroups.find((candidate) => candidate.id === args.groupId);
  if (group === undefined) return;
  try {
    await args.updatePriceGroupMutation.mutateAsync({ ...group, isDefault: true });
    args.toast('Default price group updated.', { variant: 'success' });
  } catch (error) {
    logClientCatch(error, {
      source: 'ProductSettingsPage',
      action: 'handleSetDefaultGroup',
      groupId: args.groupId,
    });
  }
};

export const useProductSettingsModalState = (): ProductSettingsModalState => {
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [showPriceGroupModal, setShowPriceGroupModal] = useState(false);
  const [editingPriceGroup, setEditingPriceGroup] = useState<PriceGroup | null>(null);
  const [confirmation, setConfirmation] = useState<ProductSettingsConfirmation | null>(null);

  return {
    showCatalogModal,
    setShowCatalogModal,
    editingCatalog,
    setEditingCatalog,
    showPriceGroupModal,
    setShowPriceGroupModal,
    editingPriceGroup,
    setEditingPriceGroup,
    confirmation,
    setConfirmation,
  };
};

export const useProductSettingsActions = (
  priceGroups: PriceGroup[],
  modalState: ProductSettingsModalState
): ProductSettingsActionState => {
  const { toast } = useToast();
  const updatePriceGroupMutation = useUpdatePriceGroupMutation();
  const deletePriceGroupMutation = useDeletePriceGroupMutation();
  const deleteCatalogMutation = useDeleteCatalogMutation();

  return {
    ...modalState,
    defaultGroupId: resolveDefaultPriceGroupId(priceGroups),
    defaultGroupSaving: updatePriceGroupMutation.isPending,
    handleSetDefaultGroup: (groupId: string): Promise<void> =>
      updateDefaultPriceGroup({ groupId, priceGroups, updatePriceGroupMutation, toast }),
    handleDeleteCatalog: (catalog: Catalog): void => {
      modalState.setConfirmation(
        createCatalogDeleteConfirmation({ catalog, deleteCatalogMutation, toast })
      );
    },
    handleDeleteGroup: (group: PriceGroup): void => {
      if (priceGroups.length <= 1) {
        toast('At least one price group is required.', { variant: 'error' });
        return;
      }
      modalState.setConfirmation(
        createPriceGroupDeleteConfirmation({ group, deletePriceGroupMutation, toast })
      );
    },
  };
};
