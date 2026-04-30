'use client';
// ProductSettingsPage: admin hub for product configuration (categories, pricing,
// validators, image studio). Wraps providers and lazy-loads heavy panels to keep
// initial admin load focused.

import type { JSX, ReactNode } from 'react';

import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';

import { ProductSettingsPageModals } from './ProductSettingsPage.modals';
import { ProductSettingsQuickLinks } from './ProductSettingsPage.quick-links';
import { ProductSettingsSectionsLayout } from './ProductSettingsPage.sections';
import { useProductSettingsPageState } from './ProductSettingsPage.state';
import type { ProductSettingsPageProps } from './ProductSettingsPage.types';

export type { ProductSettingsPageProps } from './ProductSettingsPage.types';

const PassthroughProvider = ({ children }: { children: ReactNode }): JSX.Element => <>{children}</>;

export function ProductSettingsPage({
  internationalizationSettingsSlot,
  internationalizationProvider: InternationalizationProvider = PassthroughProvider,
  internationalizationModalsSlot,
  productSyncSettingsSlot,
}: ProductSettingsPageProps = {}): JSX.Element {
  const state = useProductSettingsPageState();

  return (
    <InternationalizationProvider>
      <AdminProductsPageLayout title='Product Settings' current='Settings'>
        <ProductSettingsQuickLinks onSectionChange={state.setActiveSection} />
        <ProductSettingsSectionsLayout
          activeSection={state.activeSection}
          onSectionChange={state.setActiveSection}
          contextValue={state.contextValue}
          customFieldsProps={state.metadata.customFieldsProps}
          parametersProps={state.metadata.parametersProps}
          productSyncSettingsSlot={productSyncSettingsSlot}
          internationalizationSettingsSlot={internationalizationSettingsSlot}
        />
        <ProductSettingsPageModals
          actions={state.actions}
          priceGroups={state.metadata.priceGroups}
          loadingGroups={state.metadata.loadingGroups}
          internationalizationModalsSlot={internationalizationModalsSlot}
        />
      </AdminProductsPageLayout>
    </InternationalizationProvider>
  );
}

export default ProductSettingsPage;
