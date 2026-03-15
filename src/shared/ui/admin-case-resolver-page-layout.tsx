import { AdminCaseResolverBreadcrumbs } from './admin-case-resolver-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminCaseResolverPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminCaseResolverBreadcrumbs,
  breadcrumbClassName: 'mb-2',
});
