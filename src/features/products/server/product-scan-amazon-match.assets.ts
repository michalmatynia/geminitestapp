import 'server-only';

import {
  readPlaywrightEngineArtifact,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server/engine-artifact-reader';
import type { ProductScanAmazonEvaluationResult } from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  loadProductScanImageSourceAsDataUrl,
  productScanBufferToDataUrl,
} from './product-scan-ai-evaluator.shared';
import { readOptionalString } from './product-scan-ai-evaluator.utils';
import {
  resolveProductImageSources,
} from './product-scan-amazon.evidence';
import { createEvaluationResult } from './product-scan-amazon.results';
import type {
  AmazonCandidateMatchInput,
  AmazonMatchEvaluationContext,
} from './product-scan-amazon-match.context';

export type AmazonMatchAssets = {
  productImageDataUrl: string;
  heroImageDataUrl: string | null;
  screenshotDataUrl: string;
  context: AmazonMatchEvaluationContext;
};

export type AmazonMatchAssetResult =
  | { ok: true; assets: AmazonMatchAssets }
  | { ok: false; evaluation: ProductScanAmazonEvaluationResult };

export const loadAmazonMatchAssets = async (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): Promise<AmazonMatchAssetResult> => {
  const productImageSource = resolveProductImageSources(input.scan, input.product)[0] ?? null;
  const contextWithImage = withProductImageSource(context, productImageSource);
  if (productImageSource === null) {
    return createAssetFailure(contextWithImage, 'Amazon candidate AI evaluation could not load a source product image.');
  }
  const screenshotArtifactName = readOptionalString(context.evaluationBase.evidence.screenshotArtifactName);
  if (screenshotArtifactName === null) {
    return createAssetFailure(contextWithImage, 'Amazon candidate AI evaluation could not find the Amazon page screenshot artifact.');
  }
  return await loadAmazonMatchAssetContents(input, contextWithImage, {
    productImageSource,
    screenshotArtifactName,
  });
};

const withProductImageSource = (
  context: AmazonMatchEvaluationContext,
  productImageSource: string | null
): AmazonMatchEvaluationContext => ({
  ...context,
  evaluationBase: {
    ...context.evaluationBase,
    evidence: {
      ...context.evaluationBase.evidence,
      productImageSource,
    },
  },
});

const loadAmazonMatchAssetContents = async (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext,
  assets: { productImageSource: string; screenshotArtifactName: string }
): Promise<AmazonMatchAssetResult> => {
  const productImageDataUrl = await loadProductImageDataUrl(input, assets.productImageSource);
  if (productImageDataUrl === null) {
    return createAssetFailure(context, 'Amazon candidate AI evaluation could not load the source product image contents.');
  }
  const screenshotDataUrl = await loadScreenshotDataUrl(input.run, assets.screenshotArtifactName);
  if (screenshotDataUrl === null) {
    return createAssetFailure(context, 'Amazon candidate AI evaluation could not read the Amazon page screenshot artifact.');
  }
  return {
    ok: true,
    assets: {
      productImageDataUrl,
      heroImageDataUrl: await loadHeroImageDataUrl(input, context),
      screenshotDataUrl,
      context,
    },
  };
};

const loadProductImageDataUrl = async (
  input: AmazonCandidateMatchInput,
  productImageSource: string
): Promise<string | null> =>
  loadProductScanImageSourceAsDataUrl(productImageSource).catch(async (error) => {
    await ErrorSystem.captureException(error, {
      service: 'product-scan-ai-evaluator',
      action: 'loadProductImage',
      productId: input.product.id,
      source: productImageSource,
    });
    return null;
  });

const loadHeroImageDataUrl = async (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): Promise<string | null> => {
  const artifactName = readOptionalString(context.evaluationBase.evidence.heroImageArtifactName);
  if (artifactName !== null) return await loadHeroImageArtifactDataUrl(input, artifactName);
  const heroImageSource = readOptionalString(context.evaluationBase.evidence.heroImageSource);
  if (heroImageSource !== null) return await loadHeroImageSourceDataUrl(input, heroImageSource);
  return null;
};

const loadHeroImageArtifactDataUrl = async (
  input: AmazonCandidateMatchInput,
  artifactName: string
): Promise<string | null> => {
  const artifact = await readArtifactSafely(input.run, artifactName, input.product.id, 'readAmazonHeroImageArtifact');
  if (artifact === null) return null;
  return productScanBufferToDataUrl(
    artifact.content,
    readOptionalString(artifact.artifact.mimeType) ?? 'image/png'
  );
};

const loadHeroImageSourceDataUrl = async (
  input: AmazonCandidateMatchInput,
  heroImageSource: string
): Promise<string | null> =>
  loadProductScanImageSourceAsDataUrl(heroImageSource).catch(async (error) => {
    await ErrorSystem.captureException(error, {
      service: 'product-scan-ai-evaluator',
      action: 'loadAmazonHeroImage',
      productId: input.product.id,
      source: heroImageSource,
    });
    return null;
  });

const loadScreenshotDataUrl = async (
  run: Pick<PlaywrightEngineRunRecord, 'runId'>,
  screenshotArtifactName: string
): Promise<string | null> => {
  const artifact = await readPlaywrightEngineArtifact({
    runId: run.runId,
    fileName: screenshotArtifactName,
  });
  if (artifact === null) return null;
  return productScanBufferToDataUrl(
    artifact.content,
    readOptionalString(artifact.artifact.mimeType) ?? 'image/png'
  );
};

const readArtifactSafely = async (
  run: Pick<PlaywrightEngineRunRecord, 'runId'>,
  fileName: string,
  productId: string,
  action: string
): Promise<Awaited<ReturnType<typeof readPlaywrightEngineArtifact>> | null> =>
  readPlaywrightEngineArtifact({ runId: run.runId, fileName }).catch(async (error) => {
    await ErrorSystem.captureException(error, {
      service: 'product-scan-ai-evaluator',
      action,
      productId,
      fileName,
    });
    return null;
  });

const createAssetFailure = (
  context: AmazonMatchEvaluationContext,
  error: string
): AmazonMatchAssetResult => ({
  ok: false,
  evaluation: createEvaluationResult({
    ...context.evaluationBase,
    status: 'failed',
    proceed: false,
    reasons: [],
    mismatches: [],
    mismatchLabels: [],
    variantAssessment: null,
    error,
  }),
});
