/**
 * Database Access Control
 * 
 * Server-side authorization checks for database operations.
 * 
 * Provides two access patterns:
 * 1. Standard admin access - requires settings.manage permission
 * 2. AI Paths internal access - allows AI workflows to access specific collections
 * 
 * This dual-access pattern enables:
 * - Secure admin database management interface
 * - Automated AI Path workflows that need database access
 * - Collection-level access restrictions for internal requests
 */

import 'server-only';

import type { NextRequest } from 'next/server';

import { isCollectionAllowed, isAiPathsInternalRequest } from '@/features/ai/ai-paths/server';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { forbiddenError } from '@/shared/errors/app-error';

/**
 * Assert user has database engine management access
 * Requires settings.manage permission
 */
export async function assertDatabaseEngineManageAccess(): Promise<void> {
  await assertSettingsManageAccess();
}

/**
 * Assert access for database operations with AI Paths internal bypass
 * 
 * Allows two access paths:
 * 1. AI Paths internal requests (with collection restrictions)
 * 2. Standard admin access (full access)
 * 
 * @param request - Next.js request object
 * @param options - Optional collection name for validation
 * @returns Object indicating if request is internal
 */
export async function assertDatabaseEngineManageAccessOrAiPathsInternal(
  request: NextRequest,
  options?: { collection?: string | null }
): Promise<{ isInternal: boolean }> {
  // Check if this is an AI Paths internal request
  if (isAiPathsInternalRequest(request)) {
    const collection = options?.collection?.trim() ?? '';
    // Validate collection is in allowed list
    if (collection !== '' && isCollectionAllowed(collection) === false) {
      throw forbiddenError('Forbidden.');
    }
    return { isInternal: true };
  }

  // Fall back to standard admin access check
  await assertDatabaseEngineManageAccess();
  return { isInternal: false };
}

