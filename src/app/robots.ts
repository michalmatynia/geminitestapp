/**
 * Robots.txt Configuration
 * 
 * Defines search engine crawling rules for the application.
 * Configures:
 * - Public pages that should be indexed
 * - Protected areas that should be excluded from crawling
 * - Admin interfaces and API endpoints protection
 * - SEO optimization and privacy controls
 */

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin/', '/api/', '/auth/', '/login', '/preview/'],
      },
    ],
  };
}
