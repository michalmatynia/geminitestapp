import type { ProductBulkImagesBase64Response } from '@/shared/contracts/products/product';
import { badRequestError } from '@/shared/errors/app-error';

export const requireBulkProductImageBase64Ids = (productIds: string[]): string[] => {
  if (!productIds.length) {
    throw badRequestError('No product ids provided');
  }

  return productIds;
};

export const buildBulkProductImageBase64RequestUrl = (
  requestUrl: string,
  productId: string
): URL => new URL(`/api/v2/products/${productId}/images/base64`, requestUrl);

export const summarizeBulkProductImageBase64Results = (
  results: PromiseSettledResult<unknown>[]
): {
  succeeded: number;
  failed: number;
  failureReasons: string[];
} => {
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

  return {
    succeeded: results.length - failures.length,
    failed: failures.length,
    failureReasons: failures.map((failure) => String(failure.reason)),
  };
};

export const buildBulkProductImageBase64FailureLogMessage = (failed: number): string =>
  `[products.images.base64.bulk] ${failed} image conversions failed`;

export const buildBulkProductImageBase64FailureErrorPayload = (
  failureReasons: string[],
  totalRequested: number
): {
  failures: string[];
  totalRequested: number;
} => ({
  failures: failureReasons,
  totalRequested,
});

export const buildBulkProductImageBase64Response = (
  requested: number,
  succeeded: number,
  failed: number
): ProductBulkImagesBase64Response => ({
  status: 'ok',
  requested,
  succeeded,
  failed,
});
