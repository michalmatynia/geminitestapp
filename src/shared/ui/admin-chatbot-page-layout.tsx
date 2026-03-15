import { AdminChatbotBreadcrumbs } from './admin-chatbot-breadcrumbs';
import { createAdminPageLayout } from './create-admin-page-layout';

export const AdminChatbotPageLayout = createAdminPageLayout({
  Breadcrumbs: AdminChatbotBreadcrumbs,
  containerClassName: 'mx-auto w-full max-w-none py-10',
});
