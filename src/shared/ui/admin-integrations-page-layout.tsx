import { AdminIntegrationsBreadcrumbs } from './admin-integrations-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminIntegrationsPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminIntegrationsBreadcrumbs,
  containerClassName: 'container mx-auto max-w-5xl py-10',
});
