import { AdminCmsBreadcrumbs } from './admin-cms-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminCmsPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminCmsBreadcrumbs,
  breadcrumbClassName: 'mb-2',
  containerClassName: 'mx-auto w-full max-w-none py-10',
});
