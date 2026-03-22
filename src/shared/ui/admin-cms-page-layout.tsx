import { ADMIN_CMS_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminCmsPageLayout = createAdminSectionPageLayout({
  section: ADMIN_CMS_SECTION,
  breadcrumbClassName: 'mb-2',
  containerClassName: 'mx-auto w-full max-w-none py-10',
  displayName: 'AdminCmsPageLayout',
});
