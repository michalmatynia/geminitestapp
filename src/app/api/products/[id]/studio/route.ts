export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProductStudioConfig, setProductStudioConfig } from '@/features/products/services/product-studio-config';
import { productService } from '@/features/products/services/productService';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { idParamSchema } from '@/shared/validations/api-schemas';

const putSchema = z.object({
  projectId: z.string().trim().nullable().optional(),
});

const ensureProductExists = async (productId: string): Promise<void> => {
  const product = await productService.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found', { productId });
  }
};

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  await ensureProductExists(productId);
  const config = await getProductStudioConfig(productId);

  return NextResponse.json({ config });
}

async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  await ensureProductExists(productId);

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const config = await setProductStudioConfig(productId, {
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
  });
  return NextResponse.json({ config });
}

export const GET = apiHandlerWithParams<{ id: string }>(
  async (
    req: NextRequest,
    ctx: ApiHandlerContext,
    params: { id: string }
  ): Promise<Response> => GET_handler(req, ctx, params),
  {
    source: 'products.[id].studio.GET',
    paramsSchema: idParamSchema,
  }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  async (
    req: NextRequest,
    ctx: ApiHandlerContext,
    params: { id: string }
  ): Promise<Response> => PUT_handler(req, ctx, params),
  {
    source: 'products.[id].studio.PUT',
    paramsSchema: idParamSchema,
    logSuccess: true,
  }
);
