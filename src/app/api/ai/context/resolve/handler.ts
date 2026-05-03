import { type NextRequest, NextResponse } from 'next/server';

import { registryBackend, retrievalService } from '@/features/ai/ai-context-registry/server';
import { contextResolveRequestSchema } from '@/shared/contracts/ai-context-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


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

export async function postResolveHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = await parseRequestBody(req);

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

  await logSystemEvent({
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
  });

  return NextResponse.json(
    { ...result, registryVersion },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    }
  );
}
