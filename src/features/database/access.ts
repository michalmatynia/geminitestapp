import 'server-only';

import type { NextRequest } from 'next/server';

import { isCollectionAllowed } from '@/features/ai/ai-paths/server/collection-allowlist';
import { isAiPathsInternalRequest } from '@/features/ai/ai-paths/server/access';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { forbiddenError } from '@/shared/errors/app-error';

export async function assertDatabaseEngineManageAccess(): Promise<void> {
  await assertSettingsManageAccess();
}

export async function assertDatabaseEngineManageAccessOrAiPathsInternal(
  request: NextRequest,
  options?: { collection?: string | null }
): Promise<{ isInternal: boolean }> {
  if (isAiPathsInternalRequest(request)) {
    const collection = options?.collection?.trim() ?? '';
    if (collection && !isCollectionAllowed(collection)) {
      throw forbiddenError('Forbidden.');
    }
    return { isInternal: true };
  }

  await assertDatabaseEngineManageAccess();
  return { isInternal: false };
}
