export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { retrievalService } from '@/features/ai/ai-context-registry/server';

export const GET = apiHandlerWithParams<{ id: string }>(
  async (_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }) => {
    const result = retrievalService.getRelatedNodes(params.id);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    });
  },
  { source: 'ai.context.related.[id].GET' }
);
