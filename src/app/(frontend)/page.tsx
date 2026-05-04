/**
 * Frontend Home Page
 * 
 * Main landing page for the public-facing application.
 * Serves as the entry point for users and handles:
 * - Dynamic content rendering based on CMS configuration
 * - SEO optimization and metadata generation
 * - Responsive layout for all device types
 * - Integration with analytics and tracking
 */

import { type JSX } from 'react';

import { renderHomeRoute } from './route-helpers/home-route-helpers';

export default async function Home(): Promise<JSX.Element | null> {
  return renderHomeRoute();
}
