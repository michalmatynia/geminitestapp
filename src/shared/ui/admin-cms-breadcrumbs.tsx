import { ADMIN_CMS_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminCmsBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_CMS_SECTION,
  displayName: 'AdminCmsBreadcrumbs',
});
