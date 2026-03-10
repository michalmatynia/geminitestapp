import { type ProductWithImages } from '@/shared/contracts/products';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import {
  getProductStudioConfig,
  setProductStudioProject,
  type ProductStudioConfig,
} from '@/shared/lib/products/services/product-studio-config';
import { productService } from '@/shared/lib/products/services/productService';

import {
  normalizeImageSlotIndex,
  normalizeProjectId,
  trimString,
} from './product-studio-service.helpers';

export const ensureProduct = async (productId: string): Promise<ProductWithImages> => {
  const normalizedId = trimString(productId);
  if (!normalizedId) {
    throw badRequestError('Product id is required.');
  }
  const product = await productService.getProductById(normalizedId);
  if (!product) {
    throw notFoundError('Product not found', { productId: normalizedId });
  }
  return product;
};

export const resolveProductAndStudioTarget = async (params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
}): Promise<{
  product: ProductWithImages;
  imageSlotIndex: number;
  config: ProductStudioConfig;
  projectId: string;
}> => {
  const imageSlotIndex = normalizeImageSlotIndex(params.imageSlotIndex);
  const product = await ensureProduct(params.productId);
  const overrideProjectId = normalizeProjectId(params.projectId);

  const existingConfig = await getProductStudioConfig(product.id);
  const existingProjectId = normalizeProjectId(existingConfig.projectId);
  const config =
    overrideProjectId !== null && overrideProjectId !== existingProjectId
      ? await setProductStudioProject(product.id, overrideProjectId)
      : existingConfig;

  const projectId = normalizeProjectId(config.projectId);
  if (!projectId) {
    throw badRequestError('Image Studio project is not selected for this product.');
  }

  return {
    product,
    imageSlotIndex,
    config,
    projectId,
  };
};

export const resolveSourceSlotIdForIndex = (
  config: ProductStudioConfig,
  imageSlotIndex: number
): string | null => {
  return trimString(config.sourceSlotByImageIndex[String(imageSlotIndex)]);
};
