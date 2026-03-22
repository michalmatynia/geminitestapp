import { ADMIN_NOTES_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminNotesPageLayout = createAdminSectionPageLayout({
  section: ADMIN_NOTES_SECTION,
  breadcrumbClassName: 'mb-2',
  displayName: 'AdminNotesPageLayout',
});
