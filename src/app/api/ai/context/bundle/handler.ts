import { type NextRequest, NextResponse } from 'next/server';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { contextBundleRequestSchema } from '@/shared/contracts/ai-context-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Parses and validates the request body as JSON.
 * Throws badRequestError if parsing fails.
 */
async function parseRequestBody(req: NextRequest): Promise<unknown> {
  const rawBody = await req.text();
  if (rawBody === '') return {};

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    await ErrorSystem.captureException(error);
    throw badRequestError('Invalid JSON body.');
  }
}

/**
 * API handler for POST /api/ai/context/bundle
 * Resolves context references for the AI registry, logs the event, 
 * and returns the bundled resolution result.
 */
export async function postBundleHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
...


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

  await logSystemEvent({
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
  });

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
    },
  });
}
