import { listBaseListingsForSync, syncBaseImagesForListing } from '@/features/integrations/services/base-image-sync';
import { getProductRepository } from '@/features/products/server';
import { buildImageBase64Slots } from '@/shared/lib/products/services/image-base64';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Job } from './product-ai-processors.types';

type ProductRepository = Awaited<ReturnType<typeof getProductRepository>>;
type ProductListItem = Awaited<ReturnType<ProductRepository['getProducts']>>[number];
type BatchProcessResult = {
  requested: number;
  succeeded: number;
  failed: number;
};

const emptyBatchResult = (): BatchProcessResult => ({
  requested: 0,
  succeeded: 0,
  failed: 0,
});

const addBatchResults = (
  current: BatchProcessResult,
  next: BatchProcessResult
): BatchProcessResult => ({
  requested: current.requested + next.requested,
  succeeded: current.succeeded + next.succeeded,
  failed: current.failed + next.failed,
});

const buildCollectionResult = (
  name: string,
  result: BatchProcessResult
): { name: string; requested: number; succeeded: number; failed: number } => ({
  name,
  requested: result.requested,
  succeeded: result.succeeded,
  failed: result.failed,
});

const processBase64ConvertProduct = async (
  productRepo: ProductRepository,
  product: ProductListItem
): Promise<boolean> => {
  try {
    const { imageBase64s, imageLinks } = await buildImageBase64Slots(product);
    await productRepo.updateProduct(product.id, { imageBase64s, imageLinks });
    return true;
  } catch (error) {
    await ErrorSystem.captureException(error);
    return false;
  }
};

const processBase64ConvertPage = async (
  productRepo: ProductRepository,
  products: ProductListItem[]
): Promise<BatchProcessResult> => {
  const results = await Promise.all(
    products.map((product) => processBase64ConvertProduct(productRepo, product))
  );
  const succeeded = results.filter((value) => value).length;
  return { requested: products.length, succeeded, failed: products.length - succeeded };
};

const processBase64ConvertPages = async ({
  page,
  pageSize,
  productRepo,
  totals,
}: {
  page: number;
  pageSize: number;
  productRepo: ProductRepository;
  totals: BatchProcessResult;
}): Promise<BatchProcessResult> => {
  const products = await productRepo.getProducts({ page, pageSize });
  if (products.length === 0) return totals;
  const nextTotals = addBatchResults(
    totals,
    await processBase64ConvertPage(productRepo, products)
  );
  if (products.length < pageSize) return nextTotals;
  return processBase64ConvertPages({ page: page + 1, pageSize, productRepo, totals: nextTotals });
};

export async function processBase64ConvertAll(job: Job): Promise<Record<string, unknown>> {
  const productRepo = await getProductRepository();
  const pageSize = typeof job.payload['pageSize'] === 'number' ? job.payload['pageSize'] : 100;
  const result = await processBase64ConvertPages({
    page: 1,
    pageSize,
    productRepo,
    totals: emptyBatchResult(),
  });
  return {
    collections: [buildCollectionResult('products', result)],
    ...result,
    pageSize,
    source: job.payload.source ?? 'base64_all',
  };
}

const syncBaseImagesForListingSafely = async (listing: {
  id: string;
  inventoryId?: string | null;
  productId: string;
}): Promise<boolean> => {
  try {
    await syncBaseImagesForListing(listing.id, listing.productId, listing.inventoryId ?? null);
    return true;
  } catch (error) {
    await ErrorSystem.captureException(error);
    return false;
  }
};

export async function processBaseImageSyncAll(job: Job): Promise<Record<string, unknown>> {
  const listings = await listBaseListingsForSync();
  const results = await Promise.all(listings.map(syncBaseImagesForListingSafely));
  const succeeded = results.filter((value) => value).length;
  const result = {
    requested: listings.length,
    succeeded,
    failed: listings.length - succeeded,
  };
  return {
    collections: [buildCollectionResult('base_image_sync', result)],
    ...result,
    source: job.payload.source ?? 'base_image_sync_all',
  };
}
