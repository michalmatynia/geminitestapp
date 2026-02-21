import { NextRequest, NextResponse } from 'next/server';

import { validateProductsBatch } from '@/features/products/validations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

// POST /api/products/validation - Batch validation
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const data = (await req.json()) as { products: unknown[] };
  const products = data.products;

  if (!Array.isArray(products)) {
    throw badRequestError('Products must be an array');
  }

  const result = await validateProductsBatch(products, 'create');

  return NextResponse.json({
    summary: {
      total: result.summary.total,
      successful: result.summary.successful,
      failed: result.summary.failed,
    },
    results: result.results,
    globalErrors: [],
  });
}

// GET /api/products/validation - Health check
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  return NextResponse.json({
    status: 'ok',
    validation: { engine: 'zod-schema' },
  });
}
