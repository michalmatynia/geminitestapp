import { AdminNotesBreadcrumbs } from './admin-notes-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminNotesPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminNotesBreadcrumbs,
  breadcrumbClassName: 'mb-2',
});
