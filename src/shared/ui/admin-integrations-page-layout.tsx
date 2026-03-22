import { ADMIN_INTEGRATIONS_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminIntegrationsPageLayout = createAdminSectionPageLayout({
  section: ADMIN_INTEGRATIONS_SECTION,
  containerClassName: 'page-section max-w-5xl',
  displayName: 'AdminIntegrationsPageLayout',
});
