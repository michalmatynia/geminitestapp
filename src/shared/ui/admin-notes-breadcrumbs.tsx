import { ADMIN_NOTES_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminNotesBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_NOTES_SECTION,
  displayName: 'AdminNotesBreadcrumbs',
});
