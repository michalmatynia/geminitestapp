import { updateProduct } from '@/features/products/api';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { parseProductUpdateError } from './useProductDataMutations.errors';
import {
  normalizeIdentityText,
  resolveProductIdByIdentity,
} from './useProductDataMutations.identity';
import type { ProductUpdateVariables } from './useProductDataMutations.types';

const PRODUCT_UPDATE_FORM_TIMEOUT_MS = 60_000;

type ProductFormDataUpdateAttempt = {
  response: Response;
  targetId: string;
};

const putProductFormData = async (
  targetId: string,
  formData: FormData
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PRODUCT_UPDATE_FORM_TIMEOUT_MS);
  try {
    return await fetch(`/api/v2/products/${targetId}`, {
      method: 'PUT',
      body: formData,
      headers: withCsrfHeaders(),
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch (error) {
    logClientError(error);
    if (controller.signal.aborted) {
      throw new Error(`Request timeout after ${PRODUCT_UPDATE_FORM_TIMEOUT_MS}ms`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const createAmbiguousStaleProductMessage = ({
  matchCount,
  originalSku,
}: {
  matchCount: number;
  originalSku?: string | null;
}): string => {
  const sku = normalizeIdentityText(originalSku);
  const productLabel = sku.length > 0 ? sku : 'this product';
  return `Product not found. The opened product id is stale, and SKU ${productLabel} matches ${matchCount} products. Refresh the products list and reopen the correct product.`;
};

const retryStaleProductUpdate = async ({
  formData,
  originalNameEn,
  originalSku,
  response,
  targetId,
}: ProductFormDataUpdateAttempt &
  Pick<ProductUpdateVariables, 'originalNameEn' | 'originalSku'> & {
    formData: FormData;
  }): Promise<ProductFormDataUpdateAttempt> => {
  if (response.status !== 404) return { response, targetId };
  const resolution = await resolveProductIdByIdentity({ originalSku, originalNameEn });
  if (resolution.kind === 'resolved' && resolution.id !== targetId) {
    return {
      targetId: resolution.id,
      response: await putProductFormData(resolution.id, formData),
    };
  }
  if (resolution.kind === 'ambiguous') {
    throw notFoundError(
      createAmbiguousStaleProductMessage({ matchCount: resolution.matchCount, originalSku })
    );
  }
  return { response, targetId };
};

const assertProductUpdateResponseOk = async (response: Response): Promise<void> => {
  if (response.ok) return;
  if (response.status === 404) {
    throw notFoundError(
      'Product not found. It may have been moved or deleted. Refresh the product list and try again.'
    );
  }
  throw badRequestError(await parseProductUpdateError(response));
};

const updateProductFromFormData = async ({
  data,
  id,
  originalNameEn,
  originalSku,
}: ProductUpdateVariables & { data: FormData }): Promise<ProductWithImages> => {
  const firstAttempt = {
    targetId: id,
    response: await putProductFormData(id, data),
  };
  const finalAttempt = await retryStaleProductUpdate({
    ...firstAttempt,
    formData: data,
    originalNameEn,
    originalSku,
  });
  await assertProductUpdateResponseOk(finalAttempt.response);
  return finalAttempt.response.json() as Promise<ProductWithImages>;
};

export const updateProductByPayload = async (
  variables: ProductUpdateVariables
): Promise<ProductWithImages> => {
  if (variables.data instanceof FormData) {
    return updateProductFromFormData({ ...variables, data: variables.data });
  }
  return updateProduct(variables.id, variables.data);
};
