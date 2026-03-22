import { ADMIN_AGENT_CREATOR_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminAgentCreatorPageLayout = createAdminSectionPageLayout({
  section: ADMIN_AGENT_CREATOR_SECTION,
  containerClassName: 'mx-auto w-full max-w-none py-10',
  displayName: 'AdminAgentCreatorPageLayout',
});
