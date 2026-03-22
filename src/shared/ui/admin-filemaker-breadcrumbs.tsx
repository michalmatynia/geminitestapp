import { ADMIN_FILEMAKER_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminFilemakerBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_FILEMAKER_SECTION,
  displayName: 'AdminFilemakerBreadcrumbs',
});
