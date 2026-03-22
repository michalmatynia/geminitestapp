import { ADMIN_SETTINGS_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminSettingsBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_SETTINGS_SECTION,
  baseClassName: 'mb-2',
  displayName: 'AdminSettingsBreadcrumbs',
});
