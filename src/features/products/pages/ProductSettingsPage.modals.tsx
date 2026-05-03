import type { JSX, ReactNode } from 'react';

import { CatalogModal } from '@/features/products/components/settings/modals/catalog-modal/CatalogModal';
import { PriceGroupModal } from '@/features/products/components/settings/modals/price-group-modal/PriceGroupModal';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

import type { ProductSettingsActionState } from './ProductSettingsPage.actions';

type ProductSettingsPageModalsProps = {
  actions: ProductSettingsActionState;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  internationalizationModalsSlot?: ReactNode;
};

type ProductSettingsCatalogModalProps = Pick<
  ProductSettingsPageModalsProps,
  'actions' | 'priceGroups' | 'loadingGroups'
>;

type ProductSettingsPriceGroupModalProps = Pick<
  ProductSettingsPageModalsProps,
  'actions' | 'priceGroups'
>;

type ProductSettingsConfirmationContent = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  isDangerous: boolean;
};

const buildConfirmationContent = (
  confirmation: ProductSettingsActionState['confirmation']
): ProductSettingsConfirmationContent => {
  if (confirmation === null) {
    return {
      isOpen: false,
      title: '',
      message: '',
      confirmText: 'Confirm',
      isDangerous: false,
    };
  }

  return {
    isOpen: true,
    title: confirmation.title,
    message: confirmation.message,
    confirmText: confirmation.confirmText ?? 'Confirm',
    isDangerous: confirmation.isDangerous ?? false,
  };
};

const runConfirmationAction = async (actions: ProductSettingsActionState): Promise<void> => {
  const onConfirm = actions.confirmation?.onConfirm ?? null;
  if (onConfirm !== null) {
    await onConfirm();
  }
  actions.setConfirmation(null);
};

const ProductSettingsCatalogModal = ({
  actions,
  priceGroups,
  loadingGroups,
}: ProductSettingsCatalogModalProps): JSX.Element | null => {
  if (actions.showCatalogModal === false) return null;

  return (
    <CatalogModal
      isOpen={actions.showCatalogModal}
      onClose={(): void => actions.setShowCatalogModal(false)}
      onSuccess={(): void => actions.setShowCatalogModal(false)}
      item={actions.editingCatalog}
      items={priceGroups}
      loading={loadingGroups}
      defaultId={actions.defaultGroupId}
    />
  );
};

const ProductSettingsPriceGroupModal = ({
  actions,
  priceGroups,
}: ProductSettingsPriceGroupModalProps): JSX.Element | null => {
  if (actions.showPriceGroupModal === false) return null;

  return (
    <PriceGroupModal
      isOpen={actions.showPriceGroupModal}
      onClose={(): void => actions.setShowPriceGroupModal(false)}
      onSuccess={(): void => actions.setShowPriceGroupModal(false)}
      item={actions.editingPriceGroup}
      items={priceGroups}
    />
  );
};

const ProductSettingsConfirmationModal = ({
  actions,
}: Pick<ProductSettingsPageModalsProps, 'actions'>): JSX.Element => {
  const confirmationContent = buildConfirmationContent(actions.confirmation);

  return (
    <ConfirmModal
      isOpen={confirmationContent.isOpen}
      onClose={(): void => actions.setConfirmation(null)}
      title={confirmationContent.title}
      message={confirmationContent.message}
      confirmText={confirmationContent.confirmText}
      isDangerous={confirmationContent.isDangerous}
      onConfirm={(): Promise<void> => runConfirmationAction(actions)}
    />
  );
};

export const ProductSettingsPageModals = ({
  actions,
  priceGroups,
  loadingGroups,
  internationalizationModalsSlot,
}: ProductSettingsPageModalsProps): JSX.Element => (
  <>
    <ProductSettingsCatalogModal
      actions={actions}
      priceGroups={priceGroups}
      loadingGroups={loadingGroups}
    />
    <ProductSettingsPriceGroupModal actions={actions} priceGroups={priceGroups} />
    {internationalizationModalsSlot}
    <ProductSettingsConfirmationModal actions={actions} />
  </>
);
