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

const isMetadataRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isBrowserFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

/**
 * Checks if a file record originates from FastComet.
 */
export const isFastCometImageFile = (imageFile: ImageFileSelection | null | undefined): boolean => {
  if (imageFile?.storageProvider === 'fastcomet') return true;
  const metadata = imageFile?.metadata;
  return isMetadataRecord(metadata) && metadata.storageSource === 'fastcomet';
};

/**
 * Resolves the upload filename for an image slot.
 */
export const resolveFastCometUploadEventFilename = (slot: ProductImageSlotValue): string | null => {
  if (slot === null) return null;
  if (slot.type === 'existing') return slot.data.filename ?? null;
  if (isBrowserFile(slot.data)) return slot.data.name !== '' ? slot.data.name : null;
  return null;
};

/**
 * Resolves an image file ID for an image slot.
 */
export const resolveFastCometUploadEventImageFileId = (slot: ProductImageSlotValue): string => {
  if (slot === null) return 'pending-file';
  if (slot.type === 'existing') return slot.data.id;
  return slot.slotId;
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
  
  if (input.slot.type === 'file' && isBrowserFile(input.slot.data)) {
    formData.append('file', input.slot.data);
  }

  return await api.post<FastCometUploadResponse>('/api/products/image-manager/fastcomet-upload', formData);
};
