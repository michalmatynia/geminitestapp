
import { type NextRequest, NextResponse } from 'next/server';

import { retrievalService } from '@/features/ai/ai-context-registry/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const GET = apiHandlerWithParams<{ id: string }>(
  (_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }) => {
    const result = retrievalService.getRelatedNodes(params.id);
    return Promise.resolve(
      NextResponse.json(result, {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      })
    );
  },
  { source: 'ai.context.related.[id].GET', requireAuth: true }
);
