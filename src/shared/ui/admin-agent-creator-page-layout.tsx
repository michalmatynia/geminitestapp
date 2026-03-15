import { AdminAgentCreatorBreadcrumbs } from './admin-agent-creator-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminAgentCreatorPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminAgentCreatorBreadcrumbs,
  containerClassName: 'mx-auto w-full max-w-none py-10',
});
