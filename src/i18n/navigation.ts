/**
 * Internationalized Navigation
 * 
 * Provides locale-aware navigation utilities for the application.
 * Built on next-intl to handle:
 * - Automatic locale detection and routing
 * - Localized URL generation
 * - Type-safe navigation with i18n support
 * - Seamless locale switching
 * 
 * These utilities ensure all navigation respects the user's
 * language preference and maintains proper URL structure
 * across different locales.
 */

import { createNavigation } from 'next-intl/navigation';

import { siteRouting } from './routing';

// Export locale-aware navigation utilities
// These automatically handle locale prefixes and routing
export const { Link, getPathname, permanentRedirect, redirect, usePathname, useRouter } =
  createNavigation(siteRouting);
