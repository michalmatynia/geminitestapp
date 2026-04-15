import { type NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { compileAiPathsValidationRulesFromDocsSnapshot } from '@/shared/lib/ai-paths/core/validation-engine';
import { buildAiPathsValidationDocsSnapshot } from '@/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
