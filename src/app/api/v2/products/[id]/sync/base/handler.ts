import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getProductBaseSyncPreview,
  runProductBaseSync,
} from '@/features/product-sync/services/product-sync-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError, notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

const parseProductId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = parseProductId(params);
  const preview = await getProductBaseSyncPreview(productId);
  if (!preview) {
    throw notFoundError('Product not found.', { productId });
  }

  return NextResponse.json(preview, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = parseProductId(params);
  const preview = await getProductBaseSyncPreview(productId);
  if (!preview) {
    throw notFoundError('Product not found.', { productId });
  }

  if (!preview.canSync) {
    throw conflictError(preview.disabledReason ?? 'Base.com product sync is not available.', {
      productId,
      status: preview.status,
    });
  }

  const response = await runProductBaseSync(productId);
  if (!response) {
    throw notFoundError('Product not found.', { productId });
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
