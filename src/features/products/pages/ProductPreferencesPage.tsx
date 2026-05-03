'use client';

import type { JSX } from 'react';

import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { LoadingState } from '@/shared/ui/LoadingState';

import { ProductPreferencesActions } from './ProductPreferencesPage.actions';
import { useProductPreferencesPageController } from './ProductPreferencesPage.controller';
import { ProductPreferencesForm } from './ProductPreferencesPage.form';

export function ProductPreferencesPage(): JSX.Element {
  const controller = useProductPreferencesPageController();

  if (controller.isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <LoadingState message='Loading preferences...' />
      </div>
    );
  }

  return (
    <AdminProductsPageLayout
      title='Product Preferences'
      current='Preferences'
      description='Manage your product list display and navigation preferences'
    >
      <div className='space-y-6'>
        <ProductPreferencesForm
          preferences={controller.preferences}
          setPreferences={controller.setPreferences}
          catalogOptions={controller.catalogOptions}
        />
        <ProductPreferencesActions
          onSave={controller.handleSave}
          onCancel={controller.handleCancel}
          onResetToDefault={controller.handleResetToDefault}
          isSaving={controller.isSaving}
        />
      </div>
    </AdminProductsPageLayout>
  );
}
