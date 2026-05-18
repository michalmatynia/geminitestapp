import { type NextRequest, NextResponse } from 'next/server';

import { registryBackend } from '@/features/ai/ai-context-registry/server';
import { contextSearchRequestSchema } from '@/shared/contracts/ai-context-registry';
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
 * API handler for POST /api/ai/context/search
 * Validates request payload, searches the context registry based on query/kinds/tags,
 * logs the event, and returns the matching nodes with version information.
 */
export async function postSearchHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
...


  const parsed = contextSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid search request payload.');
  }

  const { query, kinds, tags, limit = 10 } = parsed.data;

  const nodes = registryBackend.search({ query, kinds, tags, limit });
  const registryVersion = registryBackend.getVersion();

  await logSystemEvent({
    level: 'info',
    message: '[ai-context-registry] context.search',
    source: 'ai.context.search',
    context: {
      query,
      kinds,
      tags,
      limit,
      resultCount: nodes.length,
      registryVersion,
    },
  });

  return NextResponse.json(
    { nodes, total: nodes.length, registryVersion },
    {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    }
  );
}
