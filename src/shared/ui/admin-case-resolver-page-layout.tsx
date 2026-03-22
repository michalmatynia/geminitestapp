import { ADMIN_CASE_RESOLVER_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminCaseResolverPageLayout = createAdminSectionPageLayout({
  section: ADMIN_CASE_RESOLVER_SECTION,
  breadcrumbClassName: 'mb-2',
  displayName: 'AdminCaseResolverPageLayout',
});
