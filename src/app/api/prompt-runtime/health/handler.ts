import { NextRequest, NextResponse } from 'next/server';

import {
  getPromptValidationObservabilitySnapshot,
  resetPromptValidationObservability,
} from '@/features/prompt-core/runtime-observability';
import {
  getPromptExploderRuntimePatternCacheSnapshot,
  resetPromptExploderRuntimePatternCache,
} from '@/features/prompt-exploder/parser';
import {
  getPromptValidationRuntimeSelectionCacheSnapshot,
  resetPromptValidationRuntimeSelectionCache,
} from '@/features/prompt-exploder/prompt-validation-orchestrator';
import {
  getPromptRuntimeLoadSnapshot,
  resetPromptRuntimeLoadSnapshot,
} from '@/features/prompt-exploder/runtime-load-shedder';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const isResetEnabled = (request: NextRequest): boolean => {
  const raw = request.nextUrl.searchParams.get('reset');
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (isResetEnabled(req)) {
    resetPromptValidationObservability();
    resetPromptExploderRuntimePatternCache();
    resetPromptValidationRuntimeSelectionCache();
    resetPromptRuntimeLoadSnapshot();
  }

  const observability = getPromptValidationObservabilitySnapshot();
  const parserCache = getPromptExploderRuntimePatternCacheSnapshot();
  const selectionCache = getPromptValidationRuntimeSelectionCacheSnapshot();
  const load = getPromptRuntimeLoadSnapshot();
  const ok = observability.health.status !== 'critical';

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      observability,
      parserCache,
      selectionCache,
      load,
    },
    { status: ok ? 200 : 503 }
  );
}
