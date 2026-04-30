import type {
  ComponentProps,
  ComponentType,
  Dispatch,
  ReactNode,
  SetStateAction,
} from 'react';

import type { CustomFieldsSettings } from '@/features/products/components/settings/CustomFieldsSettings';
import type { ParametersSettings } from '@/features/products/components/settings/parameters/ParametersSettings';
import type { ProductSettingsProvider } from '@/features/products/components/settings/ProductSettingsContext';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';

import type { settingSections } from './ProductSettingsConstants';

export type ProductSettingsSection = (typeof settingSections)[number];

export type ProductSettingsPageProps = {
  internationalizationSettingsSlot?: ReactNode;
  internationalizationProvider?: ComponentType<{ children: ReactNode }>;
  internationalizationModalsSlot?: ReactNode;
  productSyncSettingsSlot?: ReactNode;
};

export type ProductSettingsSetSection = Dispatch<SetStateAction<ProductSettingsSection>>;

export type ProductSettingsProviderValue = ComponentProps<typeof ProductSettingsProvider>['value'];

export type ProductSettingsCustomFieldsProps = ComponentProps<typeof CustomFieldsSettings>;

export type ProductSettingsParametersProps = ComponentProps<typeof ParametersSettings>;

export type ProductSettingsConfirmation = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  isDangerous?: boolean;
};

export type ProductSettingsModalState = {
  showCatalogModal: boolean;
  setShowCatalogModal: Dispatch<SetStateAction<boolean>>;
  editingCatalog: Catalog | null;
  setEditingCatalog: Dispatch<SetStateAction<Catalog | null>>;
  showPriceGroupModal: boolean;
  setShowPriceGroupModal: Dispatch<SetStateAction<boolean>>;
  editingPriceGroup: PriceGroup | null;
  setEditingPriceGroup: Dispatch<SetStateAction<PriceGroup | null>>;
  confirmation: ProductSettingsConfirmation | null;
  setConfirmation: Dispatch<SetStateAction<ProductSettingsConfirmation | null>>;
};
