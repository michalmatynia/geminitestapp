import { AdminProductsBreadcrumbs } from './admin-products-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminProductsPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminProductsBreadcrumbs,
});
