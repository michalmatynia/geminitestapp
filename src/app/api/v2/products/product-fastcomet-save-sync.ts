import 'server-only';

import type { ProductWithImages } from '@/shared/contracts/products';
import {
  isFastCometImageFile,
  requireFastCometConfigured,
} from '@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.execution';
import { enqueueProductFastCometImageUploadJob } from '@/features/products/workers/productFastCometImageUploadQueue';

export const enqueueProductImagesFastCometUploadOnSave = async (
  product: ProductWithImages | null,
  userId: string | null | undefined
): Promise<void> => {
  if (product === null) return;

  const productImages = Array.isArray(product.images) ? product.images : [];
  const targets = productImages
    .map((image, index) => ({ image, index }))
    .filter(({ image }) => !isFastCometImageFile(image.imageFile));

  if (targets.length === 0) return;

  await requireFastCometConfigured();
  await Promise.all(
    targets.map(({ image, index }) =>
      enqueueProductFastCometImageUploadJob({
        productId: product.id,
        imageFileId: image.imageFileId,
        imageSlotIndex: index,
        requestedAt: new Date().toISOString(),
        userId: userId ?? null,
      })
    )
  );
};
