export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import {
  getPatternsDatabaseName,
  listPatternProducts,
  savePatternProduct,
} from '@/features/patterns/server/patterns-repository';
import type {
  PatternListResponse,
  PatternMutationResponse,
} from '@/features/patterns/types';
import { apiHandler } from '@/shared/lib/api/api-handler';

const badRequest = (message: string): NextResponse =>
  NextResponse.json({ error: message }, { status: 400 });

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const GET = apiHandler(
  async (): Promise<Response> => {
    const patterns = await listPatternProducts();
    const response: PatternListResponse = {
      patterns,
      source: 'mongo',
      database: getPatternsDatabaseName(),
    };
    return NextResponse.json(response);
  },
  {
    source: 'v2.patterns.GET',
    cacheControl: 'no-store',
    rateLimitKey: 'search',
    requireAuth: true,
  }
);

export const POST = apiHandler(
  async (_request, context): Promise<Response> => {
    try {
      const pattern = await savePatternProduct(context.body);
      const response: PatternMutationResponse = { pattern };
      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return badRequest(errorMessage(error, 'Unable to save pattern.'));
    }
  },
  {
    source: 'v2.patterns.POST',
    parseJsonBody: true,
    rateLimitKey: 'write',
    logSuccess: true,
    requireAuth: true,
  }
);
