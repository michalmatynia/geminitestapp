import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { validateProductsBatch } from '@/shared/lib/products/validations';

// POST /api/v2/products/validation - Batch validation
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'products.validation',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const data = parsed.data as { products: unknown[] };
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

// GET /api/v2/products/validation - Health check
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  return NextResponse.json({
    status: 'ok',
    validation: { engine: 'zod-schema' },
  });
}
