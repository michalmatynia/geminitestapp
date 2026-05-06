/**
 * Kangur API Endpoint Resolver
 * 
 * Resolves Kangur API endpoints for client-side requests.
 * 
 * The Kangur educational platform has separate API routing:
 * - Server-side: /api/kangur/*
 * - Client-side: /kangur-api/*
 * 
 * This resolver transforms server-side endpoint paths to their
 * client-side equivalents, ensuring consistent API access across
 * different runtime contexts (SSR, CSR, mobile).
 */

const KANGUR_API_PREFIX = '/api/kangur';
const KANGUR_BROWSER_API_PREFIX = '/kangur-api';

/**
 * Transform server-side Kangur API path to client-side path
 * 
 * @param endpoint - The API endpoint path
 * @returns Transformed endpoint for client-side use
 * 
 * @example
 * resolveKangurClientEndpoint('/api/kangur/lessons')
 * // Returns: '/kangur-api/lessons'
 */
export const resolveKangurClientEndpoint = (endpoint: string): string => {
  if (!endpoint.startsWith(KANGUR_API_PREFIX)) {
    return endpoint;
  }

  return `${KANGUR_BROWSER_API_PREFIX}${endpoint.slice(KANGUR_API_PREFIX.length)}`;
};
