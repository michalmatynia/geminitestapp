export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { registryBackend } from '@/features/ai/ai-context-registry/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const GET = apiHandlerWithParams<{ entity: string }>(
  async (_req: NextRequest, _ctx: ApiHandlerContext, params: { entity: string }) => {
    const normalized = params.entity.toLowerCase();
    const node = registryBackend
      .listAll()
      .find((n) => n.id.endsWith(`:${normalized}`) || n.name.toLowerCase() === normalized);
    return NextResponse.json({
      entity: params.entity,
      schema: node?.jsonSchema2020 ?? null,
    });
  },
  { source: 'ai.schema.[entity].GET', requireAuth: true }
);
