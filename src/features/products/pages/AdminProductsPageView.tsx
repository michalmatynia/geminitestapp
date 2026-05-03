'use client';

// AdminProductsPageView: top-level view component for the products admin
// list. Composes toolbar, filters, table surface and modals. Keep UI layout
// concerns here; business logic and data-fetching live in hooks and context.

import { AdminProductsPageRuntime } from './AdminProductsPageRuntime';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';

export function AdminProductsPageView(): React.JSX.Element {
  return (
    <AppErrorBoundary source='products.AdminProductsPageView'>
      <AdminProductsPageRuntime />
    </AppErrorBoundary>
  );
}
