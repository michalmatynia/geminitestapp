import type { ImageFileRecord, ImageFileSelection } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getFileStorageSettings } from '@/shared/lib/files/services/storage/file-storage-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import type { getProductRepository } from '@/shared/lib/products/services/product-repository';

type ProductRepository = Awaited<ReturnType<typeof getProductRepository>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isFastCometImageFile = (imageFile: ImageFileRecord): boolean => {
  if (imageFile.storageProvider === 'fastcomet') return true;
  const metadata = imageFile.metadata;
  return isRecord(metadata) && metadata['storageSource'] === 'fastcomet';
};

export const resolveLinkedImageFile = (
  product: ProductWithImages,
  imageFileId: string,
  imageSlotIndex: number | undefined
): ImageFileRecord => {
  if (imageSlotIndex !== undefined) {
    const imageAtSlot = product.images[imageSlotIndex];
    if (imageAtSlot?.imageFileId !== imageFileId) {
      throw badRequestError('Image file is not linked at the requested product image slot.', {
        imageFileId,
        imageSlotIndex,
        productId: product.id,
      });
    }
    return imageAtSlot.imageFile;
  }

  const linkedImage = product.images.find((image) => image.imageFileId === imageFileId);
  if (linkedImage === undefined) {
    throw badRequestError('Image file is not linked to this product.', {
      imageFileId,
      productId: product.id,
    });
  }
  return linkedImage.imageFile;
};

export const toImageFileSelection = (imageFile: ImageFileRecord): ImageFileSelection => imageFile;

export const loadProduct = async (
  productRepo: ProductRepository,
  productId: string
): Promise<ProductWithImages> => {
  const product = await productRepo.getProductById(productId);
  if (product === null) {
    throw notFoundError('Product not found', { productId });
  }
  return product;
};

const hasText = (value: string | null | undefined): boolean => (value?.trim() ?? '').length > 0;

const hasFastCometConnectionTarget = (
  fastComet: Awaited<ReturnType<typeof getFileStorageSettings>>['fastComet']
): boolean =>
  fastComet.uploadEndpoint.length > 0 &&
  hasText(fastComet.server) &&
  fastComet.port !== null &&
  fastComet.port !== undefined;

const hasFastCometConnectionCredentials = (
  fastComet: Awaited<ReturnType<typeof getFileStorageSettings>>['fastComet']
): boolean => hasText(fastComet.username) && hasText(fastComet.token ?? fastComet.authToken);

const isFastCometConfigured = (
  fastComet: Awaited<ReturnType<typeof getFileStorageSettings>>['fastComet']
): boolean =>
  hasFastCometConnectionTarget(fastComet) && hasFastCometConnectionCredentials(fastComet);

export const requireFastCometConfigured = async (): Promise<void> => {
  const settings = await getFileStorageSettings();
  if (isFastCometConfigured(settings.fastComet) === false) {
    throw badRequestError(
      'FastComet storage is not configured. Enter SERVER, PORT, USERNAME and TOKEN in File Storage settings.',
      { hint: 'FASTCOMET_STORAGE_CONFIG_SETTING_KEY' }
    );
  }
};

export const normalizeImageSlotIndex = (
  imageSlotIndex: number | undefined
): number | undefined => {
  if (imageSlotIndex === undefined) return undefined;
  if (
    Number.isInteger(imageSlotIndex) &&
    imageSlotIndex >= 0 &&
    imageSlotIndex < DEFAULT_IMAGE_SLOT_COUNT
  ) {
    return imageSlotIndex;
  }
  throw badRequestError('Invalid product image slot index.', { imageSlotIndex });
};
