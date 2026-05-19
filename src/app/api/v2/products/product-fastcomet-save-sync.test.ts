import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enqueueProductFastCometImageUploadJob: vi.fn(),
  isFastCometImageFile: vi.fn(),
  requireFastCometConfigured: vi.fn(),
}));

vi.mock('@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.execution', () => ({
  isFastCometImageFile: mocks.isFastCometImageFile,
  requireFastCometConfigured: mocks.requireFastCometConfigured,
}));

vi.mock('@/features/products/workers/productFastCometImageUploadQueue', () => ({
  enqueueProductFastCometImageUploadJob: mocks.enqueueProductFastCometImageUploadJob,
}));

import { enqueueProductImagesFastCometUploadOnSave } from './product-fastcomet-save-sync';

describe('enqueueProductImagesFastCometUploadOnSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFastCometImageFile.mockImplementation(
      (imageFile: { storageProvider?: string }) => imageFile.storageProvider === 'fastcomet'
    );
  });

  it('queues local product images for FastComet upload on save', async () => {
    await enqueueProductImagesFastCometUploadOnSave(
      {
        id: 'product-1',
        images: [
          {
            imageFileId: 'image-local',
            imageFile: { id: 'image-local', storageProvider: 'local' },
          },
          {
            imageFileId: 'image-fastcomet',
            imageFile: { id: 'image-fastcomet', storageProvider: 'fastcomet' },
          },
        ],
      } as never,
      'user-1'
    );

    expect(mocks.requireFastCometConfigured).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueProductFastCometImageUploadJob).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueProductFastCometImageUploadJob).toHaveBeenCalledWith({
      productId: 'product-1',
      imageFileId: 'image-local',
      imageSlotIndex: 0,
      requestedAt: expect.any(String),
      userId: 'user-1',
    });
  });

  it('does nothing when the product has no images array', async () => {
    await enqueueProductImagesFastCometUploadOnSave({ id: 'product-1' } as never, null);

    expect(mocks.requireFastCometConfigured).not.toHaveBeenCalled();
    expect(mocks.enqueueProductFastCometImageUploadJob).not.toHaveBeenCalled();
  });
});
