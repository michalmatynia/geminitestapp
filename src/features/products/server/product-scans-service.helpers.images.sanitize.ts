import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { readOptionalString } from './product-scans-service.helpers.base';
import {
  resolveLocalScanImageCandidatePath,
  resolveLocalScanImageCandidateUrlPath,
} from './product-scans-service.helpers.images.local';
import { materializeProductScanUrlCandidate } from './product-scans-service.helpers.images.remote';

type ProductScanImageCandidate = ProductScanRecord['imageCandidates'][number];
type SanitizeProductScanImageOptions = {
  materializeUrlCandidates?: boolean;
  requireLocalFile?: boolean;
};

const sanitizeProductScanImageCandidate = async (
  candidate: ProductScanImageCandidate,
  options: SanitizeProductScanImageOptions
): Promise<ProductScanImageCandidate | null> => {
  const resolvedFilepath = await resolveLocalScanImageCandidatePath(candidate);
  const hasUrl = readOptionalString(candidate.url) !== null;

  if (resolvedFilepath !== null) return { ...candidate, filepath: resolvedFilepath };
  if (hasUrl === false) return null;

  const localUrlFilepath = await resolveLocalScanImageCandidateUrlPath(candidate);
  if (localUrlFilepath !== null) return { ...candidate, filepath: localUrlFilepath };

  if (options.materializeUrlCandidates === true) {
    return await materializeProductScanImageCandidate(candidate);
  }
  if (options.requireLocalFile === true) return null;

  return { ...candidate, filepath: null };
};

const materializeProductScanImageCandidate = async (
  candidate: ProductScanImageCandidate
): Promise<ProductScanImageCandidate | null> => {
  try {
    return await materializeProductScanUrlCandidate(candidate);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'sanitizeProductScanImageCandidates.materializeUrlCandidate',
      candidateId: candidate.id,
    });
    return null;
  }
};

export const sanitizeProductScanImageCandidates = async (
  imageCandidates: ProductScanRecord['imageCandidates'],
  options: SanitizeProductScanImageOptions = {}
): Promise<ProductScanRecord['imageCandidates']> => {
  const sanitizedCandidates = await Promise.all(
    imageCandidates.map((candidate) => sanitizeProductScanImageCandidate(candidate, options))
  );

  return sanitizedCandidates.filter(
    (candidate): candidate is ProductScanImageCandidate => candidate !== null
  );
};
