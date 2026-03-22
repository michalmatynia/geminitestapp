import { ADMIN_SETTINGS_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminSettingsPageLayout = createAdminSectionPageLayout({
  section: ADMIN_SETTINGS_SECTION,
  baseBreadcrumbClassName: 'mb-2',
  displayName: 'AdminSettingsPageLayout',
});
