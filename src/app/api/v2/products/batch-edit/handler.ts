import { type NextRequest, NextResponse } from 'next/server';

import { CachedProductService, parseJsonBody, productService } from '@/features/products/server';
import {
  type ProductBatchEditOperation,
  type ProductBatchEditProductResult,
  productBatchEditRequestSchema,
} from '@/shared/contracts/products/batch-edit';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { buildProductBatchEditPatch } from '@/shared/lib/products/batch-edit';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to edit product.';

const buildOptions = (userId: string | null | undefined): { userId: string } | undefined =>
  userId !== null && userId !== undefined && userId.length > 0 ? { userId } : undefined;

const processProduct = async (input: {
  productId: string;
  operations: ProductBatchEditOperation[];
  dryRun: boolean;
  options: { userId: string } | undefined;
}): Promise<ProductBatchEditProductResult> => {
  try {
    const product = await productService.getProductById(input.productId);
    if (!product) {
      return {
        productId: input.productId,
        status: 'not_found',
        changes: [],
        error: 'Product not found.',
      };
    }

    const { patch, changes } = buildProductBatchEditPatch(product, input.operations);
    if (changes.length === 0) {
      return { productId: input.productId, status: 'unchanged', changes: [] };
    }
    if (!input.dryRun) {
      await productService.updateProduct(input.productId, patch, input.options);
    }
    return { productId: input.productId, status: 'changed', changes };
  } catch (error) {
    return {
      productId: input.productId,
      status: 'failed',
      changes: [],
      error: getErrorMessage(error),
    };
  }
};

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, productBatchEditRequestSchema, {
    logPrefix: 'products.batch-edit.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const productIds = Array.from(new Set(parsed.data.productIds));
  const { operations, dryRun } = parsed.data;
  const options = buildOptions(ctx.userId);
  const results = await Promise.all(
    productIds.map((productId) => processProduct({ productId, operations, dryRun, options }))
  );

  const changed = results.filter((result) => result.status === 'changed').length;
  const failed = results.filter(
    (result) => result.status === 'failed' || result.status === 'not_found'
  ).length;
  const unchanged = results.filter((result) => result.status === 'unchanged').length;

  if (!dryRun && changed > 0) {
    CachedProductService.invalidateAll();
  }

  return NextResponse.json({
    status: 'ok',
    dryRun,
    requested: productIds.length,
    matched: productIds.length - failed,
    changed,
    unchanged,
    failed,
    results,
  });
}
