'use client';

import React from 'react';

import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';

import { OrdersImportProvider } from './AdminProductOrdersImportPage.context';
import { useAdminProductOrdersImportState } from './AdminProductOrdersImportPage.hooks';
import { useAdminProductOrdersImportPageModel } from './AdminProductOrdersImportPage.model';
import {
  OrdersImportPageContent,
  QuickImportButton,
} from './AdminProductOrdersImportPage.parts';

export function AdminProductOrdersImportPage(): React.JSX.Element {
  const state = useAdminProductOrdersImportState();
  const model = useAdminProductOrdersImportPageModel(state);

  return (
    <OrdersImportProvider state={state}>
      <AdminProductsPageLayout
        activeTab='orders-import'
        title='Base.com Orders Import'
        headerActions={
          <QuickImportButton
            isPending={state.quickImportMutation.isPending}
            onQuickImport={model.handleQuickImportClick}
          />
        }
      >
        <OrdersImportPageContent state={state} model={model} />
      </AdminProductsPageLayout>
    </OrdersImportProvider>
  );
}

export default AdminProductOrdersImportPage;
