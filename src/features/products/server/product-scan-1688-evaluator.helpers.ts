import path from 'node:path';

import { z } from 'zod';

import {
  readPlaywrightEngineArtifact,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import type {
  ProductScanRecord,
  ProductScanSupplierEvaluation,
  NonNullableProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { loadProductScanImageSourceAsDataUrl } from './product-scan-ai-evaluator.shared';
import type { ProductScanner1688CandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type { SupplierScanRuntimeResult } from './product-scans-service.helpers';

export type SupplierEvaluatorInput = {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: SupplierScanRuntimeResult;
  run: Pick<PlaywrightEngineRunRecord, 'runId' | 'artifacts'>;
  evaluatorConfig: Extract<ProductScanner1688CandidateEvaluatorResolvedConfig, { enabled: true }>;
};

export type SupplierEvaluatorAssets = {
  productImageDataUrl: string;
  screenshotArtifact: Awaited<ReturnType<typeof readPlaywrightEngineArtifact>>;
  heroImageDataUrl: string | null;
};

type SupplierEvaluatorAssetResult =
  | {
      ok: true;
      assets: SupplierEvaluatorAssets;
    }
  | {
      ok: false;
      evaluation: ProductScanSupplierEvaluation;
    };

type SupplierEvaluatorCompletion = {
  vendor: string;
  modelId: string;
  text: string;
};

const SUPPLIER_EVALUATOR_MAX_REASON_COUNT = 10;

const normalizeConfidenceInput = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim().length > 0) return Number(value);
  return Number.NaN;
};

export const supplierEvaluatorResponseSchema = z.object({
  sameProduct: z.boolean(),
  imageMatch: z.boolean().nullable().optional().default(null),
  titleMatch: z.boolean().nullable().optional().default(null),
  confidence: z.preprocess((value) => {
    const parsed = normalizeConfidenceInput(value);
    if (!Number.isFinite(parsed)) return Number.NaN;
    return parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  }, z.number().min(0).max(1)),
  proceed: z.boolean(),
  reasons: z
    .array(z.string().trim().min(1).max(500))
    .max(SUPPLIER_EVALUATOR_MAX_REASON_COUNT)
    .default([]),
  mismatches: z
    .array(z.string().trim().min(1).max(500))
    .max(SUPPLIER_EVALUATOR_MAX_REASON_COUNT)
    .default([]),
});

export const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeTextList = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const next = readOptionalString(value);
    if (next === null || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
};

export const resolveArtifactFileNameByKey = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  artifactKey: string | null,
  mimePrefix: string
): string | null => {
  const normalizedKey = readOptionalString(artifactKey);
  if (normalizedKey === null) return null;
  const artifact = (Array.isArray(run.artifacts) ? run.artifacts : []).find((entry) => {
    const artifactPath = entry.path.length > 0 ? entry.path : '';
    const baseName = readOptionalString(path.basename(artifactPath, path.extname(artifactPath)));
    return (
      entry.mimeType.startsWith(mimePrefix) &&
      (entry.name === normalizedKey || baseName === normalizedKey)
    );
  });
  if (artifact === undefined || artifact.path.length === 0) return null;
  const fileName = path.basename(artifact.path);
  return fileName.trim().length > 0 ? fileName : null;
};

const resolveProductImageSources = (
  scan: Pick<ProductScanRecord, 'imageCandidates'>,
  product: ProductWithImages
): string[] => {
  const fromScan = scan.imageCandidates.flatMap((candidate) => [
    readOptionalString(candidate.url),
    readOptionalString(candidate.filepath),
  ]);
  const fromProductImages = (Array.isArray(product.images) ? product.images : []).flatMap(
    (image) => [
      readOptionalString(image.imageFile.publicUrl),
      readOptionalString(image.imageFile.url),
      readOptionalString(image.imageFile.filepath),
    ]
  );
  const fromImageLinks = Array.isArray(product.imageLinks) ? product.imageLinks : [];

  return normalizeTextList([...fromScan, ...fromProductImages, ...fromImageLinks]).slice(0, 4);
};

export const createSupplierEvaluation = (
  input: Omit<NonNullableProductScanSupplierEvaluation, 'evaluatedAt'> & {
    evaluatedAt?: string | null;
  }
): ProductScanSupplierEvaluation => ({
  ...input,
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});

export const createFailedSupplierEvaluation = (
  modelId: string,
  error: string
): ProductScanSupplierEvaluation =>
  createSupplierEvaluation({
    status: 'failed',
    sameProduct: null,
    imageMatch: null,
    titleMatch: null,
    confidence: null,
    proceed: false,
    reasons: [],
    mismatches: [],
    modelId,
    error,
  });

export const resolveHeuristicSkipEvaluation = (
  input: SupplierEvaluatorInput
): ProductScanSupplierEvaluation | null => {
  const heuristicEvaluation = input.parsedResult.supplierEvaluation;
  if (
    input.evaluatorConfig.onlyForAmbiguousCandidates &&
    heuristicEvaluation?.status === 'approved' &&
    heuristicEvaluation.proceed &&
    typeof heuristicEvaluation.confidence === 'number' &&
    heuristicEvaluation.confidence >= Math.max(input.evaluatorConfig.threshold, 0.9)
  ) {
    return createSupplierEvaluation({
      ...heuristicEvaluation,
      status: 'skipped',
      proceed: true,
      modelId: input.evaluatorConfig.modelId,
    });
  }
  return null;
};

const loadProductImageDataUrl = async (input: SupplierEvaluatorInput): Promise<string | null> => {
  const productImageSource = resolveProductImageSources(input.scan, input.product)[0] ?? null;
  if (productImageSource === null) return null;
  return loadProductScanImageSourceAsDataUrl(productImageSource).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-scan-1688-evaluator',
      action: 'loadProductImage',
      productId: input.product.id,
      source: productImageSource,
    });
    return null;
  });
};

const readSupplierScreenshotArtifact = async (
  input: SupplierEvaluatorInput,
  fileName: string
): Promise<Awaited<ReturnType<typeof readPlaywrightEngineArtifact>> | null> =>
  readPlaywrightEngineArtifact({
    runId: input.run.runId,
    fileName,
  }).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-scan-1688-evaluator',
      action: 'readSupplierScreenshotArtifact',
      productId: input.product.id,
      fileName,
    });
    return null;
  });

const loadHeroImageDataUrl = async (input: SupplierEvaluatorInput): Promise<string | null> => {
  const heroImageSource =
    readOptionalString(input.parsedResult.supplierProbe?.heroImageUrl) ??
    readOptionalString(input.parsedResult.supplierDetails?.images[0]?.url);
  if (heroImageSource === null) return null;
  return loadProductScanImageSourceAsDataUrl(heroImageSource).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-scan-1688-evaluator',
      action: 'loadSupplierHeroImage',
      productId: input.product.id,
      source: heroImageSource,
    });
    return null;
  });
};

export const loadSupplierEvaluatorAssets = async (
  input: SupplierEvaluatorInput
): Promise<SupplierEvaluatorAssetResult> => {
  const modelId = input.evaluatorConfig.modelId;
  const productImageDataUrl = await loadProductImageDataUrl(input);
  if (productImageDataUrl === null) {
    return {
      ok: false,
      evaluation: createFailedSupplierEvaluation(
        modelId,
        '1688 candidate evaluator could not load a source product image.'
      ),
    };
  }

  const screenshotArtifactName = resolveArtifactFileNameByKey(
    input.run,
    readOptionalString(input.parsedResult.supplierProbe?.artifactKey),
    'image/'
  );
  if (screenshotArtifactName === null) {
    return {
      ok: false,
      evaluation: createFailedSupplierEvaluation(
        modelId,
        '1688 candidate evaluator could not find the supplier page screenshot artifact.'
      ),
    };
  }

  const screenshotArtifact = await readSupplierScreenshotArtifact(input, screenshotArtifactName);
  if (screenshotArtifact === null) {
    return {
      ok: false,
      evaluation: createFailedSupplierEvaluation(
        modelId,
        '1688 candidate evaluator could not read the supplier page screenshot artifact.'
      ),
    };
  }

  return {
    ok: true,
    assets: {
      productImageDataUrl,
      screenshotArtifact,
      heroImageDataUrl: await loadHeroImageDataUrl(input),
    },
  };
};

export const evaluateSupplierCompletion = (
  completion: SupplierEvaluatorCompletion,
  threshold: number
): ProductScanSupplierEvaluation => {
  const parsed = supplierEvaluatorResponseSchema.parse(JSON.parse(completion.text) as unknown);
  const approved =
    parsed.proceed &&
    parsed.sameProduct &&
    parsed.imageMatch !== false &&
    parsed.titleMatch !== false &&
    parsed.confidence >= threshold;

  return createSupplierEvaluation({
    status: approved ? 'approved' : 'rejected',
    sameProduct: parsed.sameProduct,
    imageMatch: parsed.imageMatch,
    titleMatch: parsed.titleMatch,
    confidence: parsed.confidence,
    proceed: approved,
    reasons: [...parsed.reasons],
    mismatches: [...parsed.mismatches],
    modelId: completion.modelId,
    error: null,
  });
};
