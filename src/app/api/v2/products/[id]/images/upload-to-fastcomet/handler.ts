import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/performance/cached-service';
import { parseJsonBody } from '@/features/products/server';
import {
  assertProductFastCometImageUploadRedisRuntime,
  enqueueProductFastCometImageUploadJob,
  PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME,
} from '@/features/products/workers/productFastCometImageUploadQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { AppErrorCodes, createAppError, isAppError, validationError } from '@/shared/errors/app-error';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { uploadLinkedImageFileToFastComet } from '@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.linked-upload';

import {
  isMultipartFastCometUploadRequest,
  parseMultipartFastCometUploadBody,
  stageNewImageFileForFastCometUpload,
  uploadNewImageFileToFastComet,
  type FastCometFileUploadBody,
} from './handler.file-upload';
import {
  isFastCometImageFile,
  loadProduct,
  requireFastCometConfigured,
  resolveLinkedImageFile,
  toImageFileSelection,
} from './handler.execution';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

const uploadToFastCometSchema = z.object({
  imageFileId: z.string().trim().min(1, 'Image file id is required'),
  imageSlotIndex: z.number().int().min(0).max(DEFAULT_IMAGE_SLOT_COUNT - 1).optional(),
});

type UploadToFastCometBody = z.infer<typeof uploadToFastCometSchema>;
type ParsedUploadBody =
  | ({ kind: 'existing' } & UploadToFastCometBody)
  | FastCometFileUploadBody;
type ProductRepository = Awaited<ReturnType<typeof getProductRepository>>;
type ProductWithImages = Awaited<ReturnType<typeof loadProduct>>;

const parseProductId = (params: { id: string }): string => {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  return parsedParams.data.id;
};

const parseUploadBody = async (
  req: NextRequest
): Promise<{ ok: true; data: ParsedUploadBody } | { ok: false; response: Response }> => {
  if (isMultipartFastCometUploadRequest(req)) return await parseMultipartFastCometUploadBody(req);

  const parsed = await parseJsonBody(req, uploadToFastCometSchema, {
    logPrefix: 'products.[id].images.upload-to-fastcomet.POST',
  });
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }
  return { ok: true, data: { ...parsed.data, kind: 'existing' } };
};

const enqueueFastCometUpload = async (input: {
  imageFileId: string;
  imageSlotIndex?: number | undefined;
  productId: string;
}): Promise<string> =>
  enqueueProductFastCometImageUploadJob({
    imageFileId: input.imageFileId,
    imageSlotIndex: input.imageSlotIndex,
    productId: input.productId,
    requestedAt: new Date().toISOString(),
    userId: null,
  });

const isFastCometUploadQueueUnavailable = (error: unknown): boolean =>
  isAppError(error) &&
  error.code === AppErrorCodes.serviceUnavailable &&
  error.meta?.['queue'] === PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME;

const isFastCometTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const signature = `${error.name} ${error.message}`.toLowerCase();
  return (
    signature.includes('abort') ||
    signature.includes('fastcomet') ||
    signature.includes('fetch failed')
  );
};

const toExpectedFastCometUploadError = (error: unknown): unknown => {
  if (isAppError(error)) {
    if (error.expected || error.code !== AppErrorCodes.externalService) return error;
    return createAppError(
      'FastComet upload failed. Check FastComet File Storage settings and retry.',
      {
        code: AppErrorCodes.externalService,
        httpStatus: error.httpStatus,
        meta: error.meta,
        expected: true,
        retryable: true,
        cause: error,
      }
    );
  }

  if (!isFastCometTransportError(error)) return error;
  return createAppError(
    'FastComet upload request failed. Check FastComet File Storage settings and retry.',
    {
      code: AppErrorCodes.externalService,
      httpStatus: 502,
      expected: true,
      retryable: true,
      cause: error,
    }
  );
};

const runFastCometUpload = async <T>(task: () => Promise<T>): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    throw toExpectedFastCometUploadError(error);
  }
};

const buildQueuedResponse = (input: {
  imageFile: ReturnType<typeof toImageFileSelection>;
  imageFileId: string;
  imageSlotIndex?: number | undefined;
  jobId: string;
  product: Awaited<ReturnType<typeof loadProduct>>;
  publicPath?: string | undefined;
}): Response =>
  NextResponse.json(
    {
      status: 'queued',
      imageFile: input.imageFile,
      imageFileId: input.imageFileId,
      imageSlotIndex: input.imageSlotIndex,
      jobId: input.jobId,
      product: input.product,
      publicPath: input.publicPath,
      queueName: PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME,
    },
    { status: 202 }
  );

const buildOkResponse = (input: {
  alreadyUploaded?: boolean | undefined;
  imageFile: ReturnType<typeof toImageFileSelection>;
  product: Awaited<ReturnType<typeof loadProduct>>;
  publicPath?: string | undefined;
  remoteUrl?: string | undefined;
}): Response =>
  NextResponse.json({
    status: 'ok',
    imageFile: input.imageFile,
    product: input.product,
    alreadyUploaded: input.alreadyUploaded,
    publicPath: input.publicPath,
    remoteUrl: input.remoteUrl,
  });

const handleFileUploadRequest = async (input: {
  body: FastCometFileUploadBody;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<Response> => {
  await requireFastCometConfigured();
  try {
    await assertProductFastCometImageUploadRedisRuntime();
    const result = await stageNewImageFileForFastCometUpload(input);
    CachedProductService.invalidateProduct(input.productId);
    try {
      const jobId = await enqueueFastCometUpload({
        imageFileId: result.imageFile.id,
        imageSlotIndex: input.body.imageSlotIndex,
        productId: input.productId,
      });
      return buildQueuedResponse({
        imageFile: toImageFileSelection(result.imageFile),
        imageFileId: result.imageFile.id,
        imageSlotIndex: input.body.imageSlotIndex,
        jobId,
        product: result.product,
        publicPath: result.publicPath,
      });
    } catch (error) {
      if (!isFastCometUploadQueueUnavailable(error)) throw error;
      const directResult = await runFastCometUpload(() =>
        uploadLinkedImageFileToFastComet({
          linkedImageFile: result.imageFile,
          product: result.product,
          productId: input.productId,
          productRepo: input.productRepo,
        })
      );
      CachedProductService.invalidateProduct(input.productId);
      return buildOkResponse({
        imageFile: toImageFileSelection(directResult.imageFile),
        product: directResult.product,
        publicPath: directResult.publicPath,
        remoteUrl: directResult.remoteUrl,
      });
    }
  } catch (error) {
    if (!isFastCometUploadQueueUnavailable(error)) throw error;
    const directResult = await runFastCometUpload(() => uploadNewImageFileToFastComet(input));
    CachedProductService.invalidateProduct(input.productId);
    return buildOkResponse({
      imageFile: toImageFileSelection(directResult.imageFile),
      product: directResult.product,
      publicPath: directResult.publicPath,
      remoteUrl: directResult.remoteUrl,
    });
  }
};

const handleExistingImageUploadRequest = async (input: {
  imageFileId: string;
  imageSlotIndex?: number | undefined;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<Response> => {
  const linkedImageFile = resolveLinkedImageFile(
    input.product,
    input.imageFileId,
    input.imageSlotIndex
  );
  if (isFastCometImageFile(linkedImageFile)) {
    return buildOkResponse({
      imageFile: toImageFileSelection(linkedImageFile),
      product: input.product,
      alreadyUploaded: true,
    });
  }

  await requireFastCometConfigured();
  try {
    const jobId = await enqueueFastCometUpload({
      imageFileId: linkedImageFile.id,
      imageSlotIndex: input.imageSlotIndex,
      productId: input.productId,
    });
    return buildQueuedResponse({
      imageFile: toImageFileSelection(linkedImageFile),
      imageFileId: linkedImageFile.id,
      imageSlotIndex: input.imageSlotIndex,
      jobId,
      product: input.product,
    });
  } catch (error) {
    if (!isFastCometUploadQueueUnavailable(error)) throw error;
    const result = await runFastCometUpload(() =>
      uploadLinkedImageFileToFastComet({
        linkedImageFile,
        product: input.product,
        productId: input.productId,
        productRepo: input.productRepo,
      })
    );
    CachedProductService.invalidateProduct(input.productId);
    return buildOkResponse({
      imageFile: toImageFileSelection(result.imageFile),
      product: result.product,
      publicPath: result.publicPath,
      remoteUrl: result.remoteUrl,
    });
  }
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = parseProductId(params);
  const parsed = await parseUploadBody(req);
  if (!parsed.ok) return parsed.response;

  const productRepo = await getProductRepository();
  const product = await loadProduct(productRepo, productId);
  if (parsed.data.kind === 'file') {
    return handleFileUploadRequest({
      body: parsed.data,
      product,
      productId,
      productRepo,
    });
  }

  return handleExistingImageUploadRequest({
    imageFileId: parsed.data.imageFileId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    product,
    productId,
    productRepo,
  });
}
