import { NextRequest, NextResponse } from 'next/server';

import { registryBackend, retrievalService } from '@/features/ai/ai-context-registry/server';
import { contextResolveRequestSchema } from '@/shared/contracts/ai-context-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = contextResolveRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid resolve request payload.');
  }

  const {
    ids,
    depth = 1,
    maxNodes = 80,
    includeSchemas = false,
    includeExamples = false,
  } = parsed.data;

  const result = retrievalService.resolveWithExpansion({
    ids,
    depth,
    maxNodes,
    includeSchemas,
    includeExamples,
  });

  const registryVersion = registryBackend.getVersion();

  void logSystemEvent({
    level: 'info',
    message: '[ai-context-registry] context.resolve',
    source: 'ai.context.resolve',
    context: {
      idCount: ids.length,
      depth,
      maxNodes,
      truncated: result.truncated,
      nodeCount: result.nodes.length,
      registryVersion,
    },
  }).catch(() => {});

  return NextResponse.json(
    { ...result, registryVersion },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    }
  );
}
