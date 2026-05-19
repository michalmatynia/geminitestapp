export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deletePatternProduct,
  getPatternProductById,
  savePatternProduct,
} from '@/features/patterns/server/patterns-repository';
import type {
  PatternDeleteResponse,
  PatternMutationResponse,
} from '@/features/patterns/types';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

const paramsSchema = z.object({
  id: z.string().min(1),
});

const badRequest = (message: string): NextResponse =>
  NextResponse.json({ error: message }, { status: 400 });

const notFound = (): NextResponse =>
  NextResponse.json({ error: 'Pattern not found.' }, { status: 404 });

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const GET = apiHandlerWithParams<{ id: string }>(
  async (_request, _context, params): Promise<Response> => {
    const pattern = await getPatternProductById(params.id);
    if (pattern === null) return notFound();
    const response: PatternMutationResponse = { pattern };
    return NextResponse.json(response);
  },
  {
    source: 'v2.patterns.[id].GET',
    paramsSchema,
    cacheControl: 'no-store',
    requireAuth: true,
  }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  async (_request, context, params): Promise<Response> => {
    const existing = await getPatternProductById(params.id);
    if (existing === null) return notFound();
    if (typeof context.body !== 'object' || context.body === null || Array.isArray(context.body)) {
      return badRequest('Invalid pattern payload.');
    }

    try {
      const pattern = await savePatternProduct({
        ...context.body,
        id: existing.id,
      });
      const response: PatternMutationResponse = { pattern };
      return NextResponse.json(response);
    } catch (error) {
      return badRequest(errorMessage(error, 'Unable to save pattern.'));
    }
  },
  {
    source: 'v2.patterns.[id].PUT',
    paramsSchema,
    parseJsonBody: true,
    rateLimitKey: 'write',
    logSuccess: true,
    requireAuth: true,
  }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  async (_request, _context, params): Promise<Response> => {
    const deletedCount = await deletePatternProduct(params.id);
    if (deletedCount === 0) return notFound();
    const response: PatternDeleteResponse = { ok: true, deletedCount };
    return NextResponse.json(response);
  },
  {
    source: 'v2.patterns.[id].DELETE',
    paramsSchema,
    rateLimitKey: 'write',
    logSuccess: true,
    requireAuth: true,
  }
);
