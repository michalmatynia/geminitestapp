/**
 * Admin Products Page Layout Component
 * 
 * Specialized page layout for product management interface.
 * Provides:
 * - Products section configuration and navigation
 * - Standard admin container styling
 * - Product-specific breadcrumbs and actions
 * - Consistent admin interface patterns
 * - Responsive design for product management workflows
 */

import { ADMIN_PRODUCTS_SECTION } from './admin-section-configs';
import { createAdminSectionPageLayout } from './create-admin-page-layout';

export const AdminProductsPageLayout = createAdminSectionPageLayout({
  section: ADMIN_PRODUCTS_SECTION,
  displayName: 'AdminProductsPageLayout',
});
