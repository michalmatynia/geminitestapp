import { AdminSettingsBreadcrumbs } from './admin-settings-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminSettingsPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminSettingsBreadcrumbs,
});
