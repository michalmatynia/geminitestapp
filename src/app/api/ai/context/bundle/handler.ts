import { NextRequest, NextResponse } from 'next/server';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { contextBundleRequestSchema } from '@/shared/contracts/ai-context-registry';
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

  const parsed = contextBundleRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid bundle request payload.');
  }

  const { refs, depth = 1, maxNodes = 48 } = parsed.data;
  const result = await contextRegistryEngine.resolveRefs({
    refs,
    depth,
    maxNodes,
  });

  void logSystemEvent({
    level: 'info',
    message: '[ai-context-registry] context.bundle',
    source: 'ai.context.bundle',
    context: {
      refCount: refs.length,
      depth,
      maxNodes,
      nodeCount: result.nodes.length,
      documentCount: result.documents.length,
      truncated: result.truncated,
      engineVersion: result.engineVersion,
    },
  }).catch(() => {});

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
    },
  });
}
