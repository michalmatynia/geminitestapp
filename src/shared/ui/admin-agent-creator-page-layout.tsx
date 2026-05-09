/**
 * Admin Agent Creator Page Layout Component
 * 
 * Specialized page layout for agent creation and management interface.
 * Provides:
 * - Agent creator section configuration
 * - Full-width container layout for complex forms
 * - Consistent admin interface styling
 * - Section-specific navigation and breadcrumbs
 * - Responsive design for agent management workflows
 */

import { ADMIN_AGENT_CREATOR_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminAgentCreatorPageLayout = createAdminSectionPageLayout({
  section: ADMIN_AGENT_CREATOR_SECTION,
  containerClassName: 'mx-auto w-full max-w-none py-10',
  displayName: 'AdminAgentCreatorPageLayout',
});
