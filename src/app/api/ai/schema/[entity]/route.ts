export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { getEntitySchema } from '@/features/ai/ai-context-registry/server';

export const GET = apiHandlerWithParams<{ entity: string }>(
  async (_req: NextRequest, _ctx: ApiHandlerContext, params: { entity: string }) => {
    const schema = getEntitySchema(params.entity);
    return NextResponse.json({ entity: params.entity, schema });
  },
  { source: 'ai.schema.[entity].GET' }
);
