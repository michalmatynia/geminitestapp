import { ADMIN_CHATBOT_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminChatbotPageLayout = createAdminSectionPageLayout({
  section: ADMIN_CHATBOT_SECTION,
  containerClassName: 'mx-auto w-full max-w-none py-10',
  displayName: 'AdminChatbotPageLayout',
});
