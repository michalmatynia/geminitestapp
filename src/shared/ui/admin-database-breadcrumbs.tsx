import { ADMIN_DATABASE_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminDatabaseBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_DATABASE_SECTION,
  displayName: 'AdminDatabaseBreadcrumbs',
});
