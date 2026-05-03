import 'server-only';

import path from 'node:path';

import type {
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { PlaywrightEngineRunRecord } from '@/features/playwright/server/engine-artifact-reader';

import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type {
  AmazonScanCandidateResult,
  AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import type { DeterministicLanguageDecision } from './product-scan-amazon-language';
import {
  extractAmazonAsinFromUrl,
  normalizeIdentifier,
  normalizeTextList,
  readOptionalString,
} from './product-scan-ai-evaluator.utils';

export type AmazonEvaluationArtifactFileNames = {
  screenshotArtifactName: string | null;
  htmlArtifactName: string | null;
};

const resolveArtifactFileName = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  matcher: (artifact: PlaywrightEngineRunRecord['artifacts'][number]) => boolean
): string | null => {
  const artifact = (Array.isArray(run.artifacts) ? run.artifacts : []).find(matcher);
  const artifactPath = readOptionalString(artifact?.path);
  if (artifactPath === null) return null;
  const fileName = path.basename(artifactPath);
  return fileName.trim().length > 0 ? fileName : null;
};

const resolveArtifactFileNameByKey = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  artifactKey: string | null,
  matcher: (artifact: PlaywrightEngineRunRecord['artifacts'][number]) => boolean
): string | null => {
  const normalizedKey = readOptionalString(artifactKey);
  if (normalizedKey === null) return null;
  return resolveArtifactFileName(run, (artifact) => {
    const artifactPath = readOptionalString(artifact.path) ?? '';
    const artifactBaseName = readOptionalString(
      path.basename(artifactPath, path.extname(artifactPath))
    );
    return matcher(artifact) && (artifact.name === normalizedKey || artifactBaseName === normalizedKey);
  });
};

export const resolveAmazonEvaluationArtifactFileNames = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  probeArtifactKey: string | null
): AmazonEvaluationArtifactFileNames => ({
  screenshotArtifactName:
    resolveArtifactFileNameByKey(
      run,
      probeArtifactKey,
      (artifact) => artifact.mimeType?.startsWith('image/') === true
    ) ??
    resolveArtifactFileName(run, (artifact) => isAmazonMatchArtifact(artifact, 'image/')),
  htmlArtifactName:
    resolveArtifactFileNameByKey(
      run,
      probeArtifactKey,
      (artifact) => artifact.mimeType === 'text/html'
    ) ??
    resolveArtifactFileName(run, (artifact) => isAmazonMatchArtifact(artifact, 'text/html')),
});

const isAmazonMatchArtifact = (
  artifact: PlaywrightEngineRunRecord['artifacts'][number],
  mimePrefixOrType: string
): boolean => {
  const artifactPath = readOptionalString(artifact.path) ?? '';
  const matchesName = artifact.name === 'amazon-scan-match' || artifactPath.includes('amazon-scan-match');
  if (mimePrefixOrType.endsWith('/')) {
    return artifact.mimeType?.startsWith(mimePrefixOrType) === true && matchesName;
  }
  return artifact.mimeType === mimePrefixOrType && matchesName;
};

export const resolveProductImageSources = (
  scan: Pick<ProductScanRecord, 'imageCandidates'>,
  product: ProductWithImages
): string[] => {
  const fromScan = scan.imageCandidates.flatMap((candidate) => [
    readOptionalString(candidate.url),
    readOptionalString(candidate.filepath),
  ]);
  const fromProductImages = (Array.isArray(product.images) ? product.images : []).flatMap((image) => [
    readOptionalString(image.imageFile.publicUrl),
    readOptionalString(image.imageFile.url),
    readOptionalString(image.imageFile.filepath),
  ]);
  const fromImageLinks = Array.isArray(product.imageLinks) ? product.imageLinks : [];
  return normalizeTextList([...fromScan, ...fromProductImages, ...fromImageLinks]).slice(0, 4);
};

export const resolveSourceProductName = (
  product: ProductWithImages,
  scan: Pick<ProductScanRecord, 'productName'>
): string | null =>
  readOptionalString(product.name_en) ??
  readOptionalString(product.name_pl) ??
  readOptionalString(product.name_de) ??
  readOptionalString(scan.productName);

export const resolveSourceProductDescription = (product: ProductWithImages): string | null =>
  readOptionalString(product.description_en) ??
  readOptionalString(product.description_pl) ??
  readOptionalString(product.description_de);

export const buildDeterministicMatchReasons = (
  product: ProductWithImages,
  parsedResult: AmazonScanRuntimeResult
): string[] => {
  const reasons: string[] = [];
  const productAsin = normalizeIdentifier(product.asin);
  const detectedAsin = normalizeIdentifier(parsedResult.asin);
  if (productAsin !== null && detectedAsin !== null && productAsin === detectedAsin) {
    reasons.push(`Existing ASIN ${productAsin} matches the Amazon candidate.`);
  }
  return appendIdentifierMatchReasons(reasons, product, parsedResult);
};

const appendIdentifierMatchReasons = (
  reasons: string[],
  product: ProductWithImages,
  parsedResult: AmazonScanRuntimeResult
): string[] => {
  const productEan = normalizeIdentifier(product.ean);
  const productGtin = normalizeIdentifier(product.gtin);
  const candidateIdentifiers = [
    normalizeIdentifier(parsedResult.amazonDetails?.ean),
    normalizeIdentifier(parsedResult.amazonDetails?.gtin),
    normalizeIdentifier(parsedResult.amazonDetails?.upc),
    normalizeIdentifier(parsedResult.amazonDetails?.isbn),
  ].filter((value): value is string => value !== null);
  appendIdentifierMatchReason(reasons, productEan, candidateIdentifiers, 'EAN');
  appendIdentifierMatchReason(reasons, productGtin, candidateIdentifiers, 'GTIN');
  return reasons;
};

const appendIdentifierMatchReason = (
  reasons: string[],
  productIdentifier: string | null,
  candidateIdentifiers: string[],
  label: string
): void => {
  if (productIdentifier !== null && candidateIdentifiers.includes(productIdentifier)) {
    reasons.push(`Existing ${label} ${productIdentifier} matches the Amazon candidate.`);
  }
};

export const buildDeterministicCandidateTriageReasons = (
  product: ProductWithImages,
  candidate: AmazonScanCandidateResult
): string[] => {
  const productAsin = normalizeIdentifier(product.asin);
  const candidateAsin = normalizeIdentifier(candidate.asin);
  return productAsin !== null && candidateAsin !== null && productAsin === candidateAsin
    ? [`Candidate URL includes matching ASIN ${candidateAsin}.`]
    : [];
};

export const shouldBypassAmazonSimilarityAi = (input: {
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
  deterministicReasons: string[];
  deterministicLanguageDecision: DeterministicLanguageDecision;
}): boolean =>
  input.evaluatorConfig.candidateSimilarityMode !== 'ai_only' &&
  input.evaluatorConfig.onlyForAmbiguousCandidates === true &&
  input.deterministicReasons.length > 0;

export const resolveCandidateAsin = (parsedResult: AmazonScanRuntimeResult): string | null =>
  firstNonNull([
    normalizeIdentifier(parsedResult.amazonProbe?.asin),
    normalizeIdentifier(parsedResult.asin),
    extractAmazonAsinFromUrl(readOptionalString(parsedResult.amazonProbe?.canonicalUrl)),
    extractAmazonAsinFromUrl(readOptionalString(parsedResult.amazonProbe?.candidateUrl)),
    extractAmazonAsinFromUrl(readOptionalString(parsedResult.url)),
    extractAmazonAsinFromUrl(readOptionalString(parsedResult.currentUrl)),
  ]);

const firstNonNull = <T>(values: Array<T | null>): T | null =>
  values.find((value): value is T => value !== null) ?? null;

export const resolveCandidateUrl = (parsedResult: AmazonScanRuntimeResult): string | null =>
  readOptionalString(parsedResult.amazonProbe?.canonicalUrl) ??
  readOptionalString(parsedResult.amazonProbe?.candidateUrl) ??
  readOptionalString(parsedResult.url) ??
  readOptionalString(parsedResult.currentUrl);
