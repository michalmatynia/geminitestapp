'use client';

import {
  useProductSettingsActions,
  useProductSettingsModalState,
  type ProductSettingsActionState,
} from './ProductSettingsPage.actions';
import {
  useProductSettingsCatalogSelectionState,
  useProductSettingsDefaultCatalogSelections,
  type ProductSettingsCatalogSelectionState,
} from './ProductSettingsPage.catalog-selection';
import { buildProductSettingsContextValue } from './ProductSettingsPage.context-value';
import {
  useProductSettingsMetadata,
  type ProductSettingsMetadataState,
} from './ProductSettingsPage.metadata';
import { useProductSettingsActiveSection } from './ProductSettingsPage.routing';
import type {
  ProductSettingsProviderValue,
  ProductSettingsSection,
  ProductSettingsSetSection,
} from './ProductSettingsPage.types';

type ProductSettingsSectionActivity = {
  isCategoriesSectionActive: boolean;
  isShippingGroupsSectionActive: boolean;
  isTagsSectionActive: boolean;
  isCustomFieldsSectionActive: boolean;
  isParametersSectionActive: boolean;
  shouldLoadCatalogs: boolean;
};

export type ProductSettingsPageState = {
  activeSection: ProductSettingsSection;
  setActiveSection: ProductSettingsSetSection;
  actions: ProductSettingsActionState;
  contextValue: ProductSettingsProviderValue;
  metadata: ProductSettingsMetadataState;
  selections: ProductSettingsCatalogSelectionState;
};

const CATALOG_BACKED_SECTIONS = new Set<ProductSettingsSection>([
  'Categories',
  'Shipping Groups',
  'Tags',
  'Parameters',
  'Catalogs',
]);

const resolveSectionActivity = (
  activeSection: ProductSettingsSection
): ProductSettingsSectionActivity => ({
  isCategoriesSectionActive: activeSection === 'Categories',
  isShippingGroupsSectionActive: activeSection === 'Shipping Groups',
  isTagsSectionActive: activeSection === 'Tags',
  isCustomFieldsSectionActive: activeSection === 'Custom Fields',
  isParametersSectionActive: activeSection === 'Parameters',
  shouldLoadCatalogs: CATALOG_BACKED_SECTIONS.has(activeSection),
});

const resolveShouldLoadPriceGroups = (
  activeSection: ProductSettingsSection,
  actions: Pick<ProductSettingsActionState, 'showCatalogModal' | 'showPriceGroupModal'>
): boolean =>
  activeSection === 'Price Groups' || actions.showCatalogModal || actions.showPriceGroupModal;

export const useProductSettingsPageState = (): ProductSettingsPageState => {
  const { activeSection, setActiveSection } = useProductSettingsActiveSection();
  const sectionActivity = resolveSectionActivity(activeSection);
  const modalState = useProductSettingsModalState();
  const selections = useProductSettingsCatalogSelectionState();
  const metadata = useProductSettingsMetadata({
    ...sectionActivity,
    selections,
    shouldLoadPriceGroups: resolveShouldLoadPriceGroups(activeSection, modalState),
  });
  const actions = useProductSettingsActions(metadata.priceGroups, modalState);
  useProductSettingsDefaultCatalogSelections({
    ...sectionActivity,
    ...selections,
    catalogs: metadata.catalogs,
  });

  return {
    activeSection,
    setActiveSection,
    actions,
    contextValue: buildProductSettingsContextValue({ actions, metadata, selections }),
    metadata,
    selections,
  };
};
