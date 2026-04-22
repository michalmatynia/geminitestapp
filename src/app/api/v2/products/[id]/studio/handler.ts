import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { productStudioConfigResponseSchema } from '@/shared/contracts/products/studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import {
  getProductStudioConfig,
  setProductStudioConfig,
} from '@/shared/lib/products/services/product-studio-config';
import { productService } from '@/shared/lib/products/services/productService';

const putSchema = z.object({
  projectId: z.string().trim().nullable().optional(),
});

const productExists = async (productId: string): Promise<boolean> =>
  Boolean(await productService.getProductById(productId));

const buildEmptyProductStudioConfigResponse = (): z.infer<
  typeof productStudioConfigResponseSchema
> =>
  productStudioConfigResponseSchema.parse({
    config: {
      projectId: null,
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
      updatedAt: new Date().toISOString(),
    },
  });

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  if (!(await productExists(productId))) {
    return NextResponse.json(buildEmptyProductStudioConfigResponse());
  }

  const config = await getProductStudioConfig(productId);

  return NextResponse.json(productStudioConfigResponseSchema.parse({ config }));
}

export async function putHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  if (!(await productExists(productId))) {
    return NextResponse.json(buildEmptyProductStudioConfigResponse());
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const config = await setProductStudioConfig(productId, {
    ...(parsed.data.projectId !== undefined ? { projectId: parsed.data.projectId } : {}),
  });
  return NextResponse.json(productStudioConfigResponseSchema.parse({ config }));
}
