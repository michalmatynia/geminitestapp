import { ADMIN_PLAYWRIGHT_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminPlaywrightBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_PLAYWRIGHT_SECTION,
  baseClassName: 'mb-2',
  displayName: 'AdminPlaywrightBreadcrumbs',
});
