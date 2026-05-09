/**
 * Image Manager Service
 * 
 * Centralizes image management logic, including FastComet upload orchestration,
 * metadata validation, and slot resolution.
 */

import { type ImageFileSelection } from '@/shared/contracts/files';
import { type ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import { api } from '@/shared/lib/api-client';

export type ProductImageSlotValue = ProductImageManagerController['imageSlots'][number];

export type FastCometUploadResponse = {
  status: 'ok';
  imageFile: ImageFileSelection;
  alreadyUploaded?: boolean | undefined;
  publicPath?: string | undefined;
  remoteUrl?: string | undefined;
};

/**
 * Checks if a file record originates from FastComet.
 */
export const isFastCometImageFile = (imageFile: ImageFileSelection | null | undefined): boolean => {
  if (imageFile?.storageProvider === 'fastcomet') return true;
  const metadata = imageFile?.metadata;
  return metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata) && (metadata as any)['storageSource'] === 'fastcomet';
};

/**
 * Resolves the upload filename for an image slot.
 */
export const resolveFastCometUploadEventFilename = (slot: ProductImageSlotValue): string | null => {
  if (slot?.type === 'existing') return slot.data.filename ?? null;
  if (slot?.type === 'file' && typeof File !== 'undefined' && slot.data instanceof File) return slot.data.name || null;
  return null;
};

/**
 * Resolves an image file ID for an image slot.
 */
export const resolveFastCometUploadEventImageFileId = (slot: ProductImageSlotValue): string => {
  if (slot?.type === 'existing') return slot.data.id;
  return slot?.slotId ?? 'pending-file';
};

/**
 * Executes a FastComet upload request.
 */
export const postFastCometUploadRequest = async (input: {
  index: number;
  productId: string;
  slot: NonNullable<ProductImageSlotValue>;
}): Promise<FastCometUploadResponse> => {
  const formData = new FormData();
  formData.append('productId', input.productId);
  formData.append('slotIndex', input.index.toString());
  
  if (input.slot.type === 'file' && typeof File !== 'undefined' && input.slot.data instanceof File) {
    formData.append('file', input.slot.data);
  }

  const response = await api.post('/api/products/image-manager/fastcomet-upload', {
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
  return response.json() as Promise<FastCometUploadResponse>;
};
