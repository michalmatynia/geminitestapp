import { ADMIN_INTEGRATIONS_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminIntegrationsBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_INTEGRATIONS_SECTION,
  displayName: 'AdminIntegrationsBreadcrumbs',
});
