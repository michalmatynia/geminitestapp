import { ADMIN_PRODUCTS_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminProductsBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_PRODUCTS_SECTION,
  displayName: 'AdminProductsBreadcrumbs',
});
