import { ADMIN_CHATBOT_SECTION } from './admin-section-configs';
import { createAdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

export const AdminChatbotBreadcrumbs = createAdminSectionBreadcrumbs({
  section: ADMIN_CHATBOT_SECTION,
  displayName: 'AdminChatbotBreadcrumbs',
});
