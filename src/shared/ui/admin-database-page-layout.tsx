import { ADMIN_DATABASE_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminDatabasePageLayout = createAdminSectionPageLayout({
  section: ADMIN_DATABASE_SECTION,
  breadcrumbClassName: 'mb-2',
  displayName: 'AdminDatabasePageLayout',
});
