import { NextRequest, NextResponse } from 'next/server';

import { compileAiPathsValidationRulesFromDocsSnapshot } from '@/features/ai/ai-paths/lib/core/validation-engine';
import { buildAiPathsValidationDocsSnapshot } from '@/features/ai/ai-paths/lib/core/validation-engine/docs-registry-adapter';
import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  await requireAiPathsAccess();
  const snapshot = await buildAiPathsValidationDocsSnapshot();
  const inferredCandidates = compileAiPathsValidationRulesFromDocsSnapshot(snapshot, {
    status: 'candidate',
  });
  return NextResponse.json({
    snapshot,
    inferredCandidates,
  });
}
