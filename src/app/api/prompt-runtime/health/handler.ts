import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getPromptValidationObservabilitySnapshot,
  resetPromptValidationObservability,
} from '@/shared/lib/prompt-core/runtime-observability';
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
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  reset: optionalBooleanQuerySchema(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  if (query.reset === true) {
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
