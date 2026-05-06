
/**
 * Client Errors API Route
 * 
 * API endpoint for receiving and processing client-side error reports.
 * Provides:
 * - POST endpoint for error submission from browser clients
 * - Rate limiting to prevent error spam
 * - CSRF exemption for early bootstrap error reporting
 * - Raw body parsing for flexible error data formats
 * - Integration with server-side error tracking system
 */

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  // Browser-side error reporter can fire before CSRF cookie/header bootstrap.
  requireCsrf: false,
});
