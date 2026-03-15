import { AdminDatabaseBreadcrumbs } from './admin-database-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminDatabasePageLayout = createAdminPageLayout({
  Breadcrumbs: AdminDatabaseBreadcrumbs,
  breadcrumbClassName: 'mb-2',
});
