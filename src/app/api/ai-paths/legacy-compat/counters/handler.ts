import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { AiPathLegacyCompatCounterSnapshot } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { getLegacyCompatCounterSnapshot } from '@/shared/lib/observability/legacy-compat-counters';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const counters = getLegacyCompatCounterSnapshot();
  const total =
    counters.legacy_key_read + counters.legacy_payload_received + counters.compat_route_hit;
  const snapshot: AiPathLegacyCompatCounterSnapshot = {
    counters,
    total,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ snapshot });
}
