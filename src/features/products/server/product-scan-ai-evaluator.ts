import 'server-only';

import fs from 'fs/promises';
import path from 'node:path';

import { z } from 'zod';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import {
  readPlaywrightEngineArtifact,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import type {
  ProductScanAmazonMismatchLabel,
  ProductScanAmazonRejectionCategory,
  ProductScanAmazonRecommendedAction,
  ProductScanAmazonVariantAssessment,
  ProductScanAmazonEvaluationResult,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import {
  fetchWithOutboundUrlPolicy,
} from '@/shared/lib/security/outbound-url-policy';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type {
  AmazonScanCandidateResult,
  AmazonScanRuntimeResult,
} from './product-scans-service.helpers';

const EVALUATOR_MAX_REASON_COUNT = 10;
const SUPPORTED_IMAGE_RUNTIME_VENDORS = new Set(['openai', 'ollama']);
const AMAZON_RECOMMENDED_ACTION_VALUES = [
  'accept',
  'reject',
  'try_next_candidate',
  'fallback_provider',
] as const satisfies ReadonlyArray<ProductScanAmazonRecommendedAction>;
const AMAZON_REJECTION_CATEGORY_VALUES = [
  'language',
  'variant',
  'wrong_product',
  'low_confidence',
] as const satisfies ReadonlyArray<ProductScanAmazonRejectionCategory>;
const AMAZON_MISMATCH_LABEL_VALUES = [
  'brand',
  'model',
  'color',
  'material',
  'size',
  'pack_count',
  'character_theme_license',
  'language',
  'wrong_product',
  'other',
] as const satisfies ReadonlyArray<ProductScanAmazonMismatchLabel>;

const amazonRecommendedActionSchema = z.enum(AMAZON_RECOMMENDED_ACTION_VALUES);
const amazonRejectionCategorySchema = z.enum(AMAZON_REJECTION_CATEGORY_VALUES);
const amazonMismatchLabelSchema = z.enum(AMAZON_MISMATCH_LABEL_VALUES);
const amazonAttributeAssessmentSchema = z.enum(['match', 'mismatch', 'unknown']);
const amazonVariantAssessmentResponseSchema = z.object({
  brand: amazonAttributeAssessmentSchema.default('unknown'),
  model: amazonAttributeAssessmentSchema.default('unknown'),
  color: amazonAttributeAssessmentSchema.default('unknown'),
  material: amazonAttributeAssessmentSchema.default('unknown'),
  size: amazonAttributeAssessmentSchema.default('unknown'),
  packCount: amazonAttributeAssessmentSchema.default('unknown'),
  characterThemeLicense: amazonAttributeAssessmentSchema.default('unknown'),
});

const normalizeConfidenceInput = (value: unknown): number => {
  let parsed = Number.NaN;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value.trim().length > 0) {
    parsed = Number(value);
  }

  if (Number.isFinite(parsed) === false) {
    return Number.NaN;
  }
  if (parsed > 1 && parsed <= 100) {
    return parsed / 100;
  }
  return parsed;
};

const amazonEvaluatorResponseSchema = z.object({
  sameProduct: z.boolean(),
  imageMatch: z.boolean().nullable().optional().default(null),
  descriptionMatch: z.boolean().nullable().optional().default(null),
  pageRepresentsSameProduct: z.boolean(),
  pageLanguage: z.string().trim().min(1).max(80).nullable().optional().default(null),
  languageAccepted: z.boolean().nullable().optional().default(null),
  languageReason: z.string().trim().min(1).max(500).nullable().optional().default(null),
  languageConfidence: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      return normalizeConfidenceInput(value);
    },
    z.number().min(0).max(1).nullable()
  ).optional().default(null),
  confidence: z.preprocess(
    normalizeConfidenceInput,
    z.number().min(0).max(1)
  ),
  proceed: z.boolean(),
  recommendedAction: amazonRecommendedActionSchema.nullable().optional().default(null),
  rejectionCategory: amazonRejectionCategorySchema.nullable().optional().default(null),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatches: z
    .array(z.string().trim().min(1).max(500))
    .max(EVALUATOR_MAX_REASON_COUNT)
    .default([]),
  mismatchLabels: z.array(amazonMismatchLabelSchema).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  variantAssessment: amazonVariantAssessmentResponseSchema
    .nullable()
    .optional()
    .default(null),
});

const amazonCandidateTriageCandidateSchema = z.object({
  url: z.string().trim().url(),
  keep: z.boolean(),
  confidence: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      return normalizeConfidenceInput(value);
    },
    z.number().min(0).max(1).nullable()
  ).optional().default(null),
  rankAfter: z.number().int().positive().nullable().optional().default(null),
  pageLanguage: z.string().trim().min(1).max(80).nullable().optional().default(null),
  languageAccepted: z.boolean().nullable().optional().default(null),
  recommendedAction: amazonRecommendedActionSchema.nullable().optional().default(null),
  rejectionCategory: amazonRejectionCategorySchema.nullable().optional().default(null),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatchLabels: z.array(amazonMismatchLabelSchema).max(EVALUATOR_MAX_REASON_COUNT).default([]),
});

const amazonCandidateTriageResponseSchema = z.object({
  recommendedAction: amazonRecommendedActionSchema.nullable().optional().default(null),
  rejectionCategory: amazonRejectionCategorySchema.nullable().optional().default(null),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  candidates: z
    .array(amazonCandidateTriageCandidateSchema)
    .max(20)
    .default([]),
});

export type AmazonCandidateTriageEvaluationCandidate = {
  url: string;
  rankBefore: number;
  rankAfter: number | null;
  confidence: number | null;
  keep: boolean;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  recommendedAction: ProductScanAmazonRecommendedAction | null;
  rejectionCategory: ProductScanAmazonRejectionCategory | null;
  reasons: string[];
  mismatchLabels: ProductScanAmazonMismatchLabel[];
};

export type AmazonCandidateTriageEvaluationResult = {
  status: 'approved' | 'rejected' | 'skipped' | 'failed';
  stage: 'candidate_triage';
  confidence: number | null;
  threshold: number | null;
  recommendedAction: ProductScanAmazonRecommendedAction | null;
  rejectionCategory: ProductScanAmazonRejectionCategory | null;
  reasons: string[];
  mismatchLabels: ProductScanAmazonMismatchLabel[];
  modelId: string | null;
  brainApplied: Record<string, unknown> | null;
  candidates: AmazonCandidateTriageEvaluationCandidate[];
  keptCandidateUrls: string[];
  provider: string | null;
  error: string | null;
  evaluatedAt: string | null;
};

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeTextList = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const next = readOptionalString(value);
    if (next === null || seen.has(next) === true) {
      continue;
    }
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
};

const resolveLanguageLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeLanguageTag(value);
  if (normalized === null) {
    return null;
  }
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
};

const resolveMarketplaceLanguageHint = (candidateUrl: string | null): string | null => {
  const normalizedUrl = readOptionalString(candidateUrl);
  if (normalizedUrl === null) {
    return null;
  }
  try {
    return AMAZON_MARKETPLACE_LANGUAGE_HINTS[new URL(normalizedUrl).hostname.toLowerCase()] ?? null;
  } catch {
    return null;
  }
};

const detectTextLanguage = (value: string | null): {
  language: string | null;
  confidence: number | null;
  reason: string | null;
} => {
  const rawNormalized = readOptionalString(value)?.toLowerCase();
  const normalized = (rawNormalized ?? null) !== null ? rawNormalized! : null;
  if (normalized === null) {
    return { language: null, confidence: null, reason: null };
  }

  const tokens = normalized.match(/[a-z\u00c0-\u017f]+/g) ?? [];
  if (tokens.length === 0) {
    return { language: null, confidence: null, reason: null };
  }

  let bestLanguage: string | null = null;
  let bestScore = 0;
  let secondScore = 0;

  for (const [language, stopwords] of Object.entries(LANGUAGE_STOPWORDS)) {
    const stopwordSet = new Set(stopwords);
    const score = tokens.reduce<number>(
      (count, token) => count + (stopwordSet.has(token) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestLanguage = language;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (bestLanguage === null || bestScore < 2) {
    return { language: null, confidence: null, reason: null };
  }

  return {
    language: bestLanguage,
    confidence: Math.min(0.95, 0.55 + (bestScore - secondScore) * 0.08),
    reason: `Visible Amazon text looks ${resolveLanguageLabel(bestLanguage)!}.`,
  };
};

const resolveDeterministicLanguageDecision = (input: {
  parsedResult: AmazonScanRuntimeResult;
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
}): DeterministicLanguageDecision => {
  const probe = input.parsedResult.amazonProbe;
  const probeLanguage = normalizeLanguageTag(probe?.pageLanguage);
  if (probeLanguage !== null) {
    return {
      pageLanguage: probeLanguage,
      languageAccepted: isEnglishLanguageTag(probeLanguage),
      confidence: 0.99,
      reason: isEnglishLanguageTag(probeLanguage)
        ? `Amazon page declares ${resolveLanguageLabel(probeLanguage)!} content.`
        : `Amazon page declares ${resolveLanguageLabel(probeLanguage)!} content, which is outside the allowed ${resolveLanguageLabel(input.evaluatorConfig.allowedContentLanguage)!} policy.`,
    };
  }

  const marketplaceLanguage =
    normalizeLanguageTag(
      (probe?.marketplaceDomain !== undefined && probe?.marketplaceDomain !== null)
        ? AMAZON_MARKETPLACE_LANGUAGE_HINTS[probe.marketplaceDomain]
        : null
    ) ??
    resolveMarketplaceLanguageHint(
      readOptionalString(probe?.canonicalUrl) ??
        readOptionalString(probe?.candidateUrl) ??
        readOptionalString(input.parsedResult.url) ??
        readOptionalString(input.parsedResult.currentUrl)
    );
  const textLanguage = detectTextLanguage(
    normalizeTextList([
      readOptionalString(probe?.pageTitle),
      readOptionalString(probe?.descriptionSnippet),
      ...(Array.isArray(probe?.bulletPoints) ? probe.bulletPoints : []),
    ]).join('\n')
  );
  const pageLanguage = textLanguage.language ?? marketplaceLanguage ?? null;

  if (textLanguage.language !== null && isEnglishLanguageTag(textLanguage.language) === false) {
    return {
      pageLanguage,
      languageAccepted: false,
      confidence: textLanguage.confidence,
      reason: textLanguage.reason,
    };
  }

  if (textLanguage.language !== null && isEnglishLanguageTag(textLanguage.language) === true) {
    return {
      pageLanguage,
      languageAccepted: true,
      confidence: textLanguage.confidence,
      reason: textLanguage.reason,
    };
  }

  if (marketplaceLanguage !== null) {
    return {
      pageLanguage,
      languageAccepted: isEnglishLanguageTag(marketplaceLanguage) ? true : null,
      confidence: isEnglishLanguageTag(marketplaceLanguage) ? 0.7 : 0.55,
      reason: `Marketplace domain suggests ${resolveLanguageLabel(marketplaceLanguage)!} content.`,
    };
  }

  return {
    pageLanguage: null,
    languageAccepted: null,
    confidence: null,
    reason: null,
  };
};

const normalizeIdentifier = (value: unknown): string | null => {
  const raw = readOptionalString(value);
  return raw !== null ? raw.replace(/\s+/g, '').toUpperCase() : null;
};

const extractAmazonAsinFromUrl = (value: string | null | undefined): string | null => {
  const normalized = readOptionalString(value);
  if (normalized === null) {
    return null;
  }
  const match = normalized
    .toUpperCase()
    .match(/(?:\/DP\/|\/GP\/PRODUCT\/|\/GP\/AW\/D\/|\/PRODUCT\/|ASIN=)([A-Z0-9]{10})(?:[/?#&]|$)/i);
  return match?.[1] ?? null;
};

const normalizeLanguageTag = (value: unknown): string | null => {
  const raw = readOptionalString(value);
  return raw !== null ? raw.replace(/_/g, '-').toLowerCase() : null;
};

const isEnglishLanguageTag = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.toLowerCase().startsWith('en') === true;

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  'en-us': 'English (US)',
  'en-gb': 'English (UK)',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  ja: 'Japanese',
  tr: 'Turkish',
};

const AMAZON_MARKETPLACE_LANGUAGE_HINTS: Record<string, string> = {
  'amazon.co.uk': 'en',
  'amazon.com': 'en',
  'amazon.com.au': 'en',
  'amazon.de': 'de',
  'amazon.es': 'es',
  'amazon.fr': 'fr',
  'amazon.it': 'it',
  'amazon.nl': 'nl',
  'amazon.pl': 'pl',
  'amazon.se': 'sv',
  'amazon.co.jp': 'ja',
  'amazon.com.tr': 'tr',
  'amazon.com.mx': 'es',
};

const LANGUAGE_STOPWORDS: Record<string, readonly string[]> = {
  en: ['the', 'and', 'with', 'for', 'from', 'this', 'that', 'your', 'you', 'are', 'not'],
  de: ['und', 'mit', 'für', 'der', 'die', 'das', 'ist', 'nicht', 'eine', 'von'],
  fr: ['avec', 'pour', 'les', 'des', 'une', 'est', 'dans', 'pas', 'sur', 'par'],
  es: ['con', 'para', 'los', 'las', 'una', 'este', 'esta', 'del', 'por', 'sin'],
  it: ['con', 'per', 'gli', 'una', 'questo', 'questa', 'non', 'della', 'delle', 'dei'],
  pl: ['dla', 'jest', 'oraz', 'nie', 'ten', 'ta', 'kolor', 'produkt', 'zestaw', 'wymiary'],
  nl: ['met', 'voor', 'een', 'deze', 'niet', 'van', 'het', 'product', 'kleur', 'maat'],
};

type DeterministicLanguageDecision = {
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  confidence: number | null;
  reason: string | null;
};

const dedupeMismatchLabels = (
  values: ReadonlyArray<ProductScanAmazonMismatchLabel | null | undefined>
): ProductScanAmazonMismatchLabel[] => {
  const normalized = new Set<ProductScanAmazonMismatchLabel>();
  for (const value of values) {
    if (
      (value ?? null) !== null &&
      (AMAZON_MISMATCH_LABEL_VALUES as readonly string[]).includes(value!)
    ) {
      normalized.add(value!);
    }
  }
  return Array.from(normalized);
};

const normalizeVariantAssessment = (
  value: z.infer<typeof amazonVariantAssessmentResponseSchema> | null | undefined
): ProductScanAmazonVariantAssessment =>
  (value !== null && value !== undefined)
    ? {
        brand: value.brand ?? 'unknown',
        model: value.model ?? 'unknown',
        color: value.color ?? 'unknown',
        material: value.material ?? 'unknown',
        size: value.size ?? 'unknown',
        packCount: value.packCount ?? 'unknown',
        characterThemeLicense: value.characterThemeLicense ?? 'unknown',
      }
    : null;

const resolveAmazonRejectionCategory = (input: {
  approved: boolean;
  languageAccepted: boolean | null;
  parsedRejectionCategory: ProductScanAmazonRejectionCategory | null;
  mismatchLabels: ProductScanAmazonMismatchLabel[];
  sameProduct: boolean;
  pageRepresentsSameProduct: boolean;
  confidence: number;
  threshold: number;
}): ProductScanAmazonRejectionCategory | null => {
  if (input.approved === true) {
    return null;
  }
  if (input.parsedRejectionCategory !== null) {
    return input.parsedRejectionCategory;
  }
  if (input.languageAccepted === false) {
    return 'language';
  }
  if (
    input.mismatchLabels.some((label) =>
      [
        'brand',
        'model',
        'color',
        'material',
        'size',
        'pack_count',
        'character_theme_license',
      ].includes(label)
    )
  ) {
    return 'variant';
  }
  if (input.sameProduct === false || input.pageRepresentsSameProduct === false) {
    return 'wrong_product';
  }
  if (input.confidence < input.threshold) {
    return 'low_confidence';
  }
  return 'wrong_product';
};

const resolveAmazonRecommendedAction = (input: {
  approved: boolean;
  parsedRecommendedAction: ProductScanAmazonRecommendedAction | null;
  rejectionCategory: ProductScanAmazonRejectionCategory | null;
}): ProductScanAmazonRecommendedAction | null => {
  if (input.approved === true) {
    return 'accept';
  }
  if (input.parsedRecommendedAction !== null && input.parsedRecommendedAction !== 'accept') {
    return input.parsedRecommendedAction;
  }
  if (
    input.rejectionCategory === 'language' ||
    input.rejectionCategory === 'variant' ||
    input.rejectionCategory === 'wrong_product' ||
    input.rejectionCategory === 'low_confidence'
  ) {
    return 'try_next_candidate';
  }
  return 'reject';
};

const resolveDeterministicCandidateLanguageDecision = (
  candidate: Pick<AmazonScanCandidateResult, 'url' | 'snippet' | 'title'>
): DeterministicLanguageDecision => {
  const marketplaceLanguage = resolveMarketplaceLanguageHint(readOptionalString(candidate.url));
  const textLanguage = detectTextLanguage(
    normalizeTextList([
      readOptionalString(candidate.title),
      readOptionalString(candidate.snippet),
    ]).join('\n')
  );
  const pageLanguage = textLanguage.language ?? marketplaceLanguage ?? null;

  if (textLanguage.language !== null) {
    return {
      pageLanguage,
      languageAccepted: isEnglishLanguageTag(textLanguage.language),
      confidence: textLanguage.confidence,
      reason: textLanguage.reason,
    };
  }

  if (marketplaceLanguage !== null) {
    return {
      pageLanguage,
      languageAccepted: isEnglishLanguageTag(marketplaceLanguage) ? true : null,
      confidence: isEnglishLanguageTag(marketplaceLanguage) ? 0.7 : 0.55,
      reason: `Marketplace domain suggests ${resolveLanguageLabel(marketplaceLanguage)!} content.`,
    };
  }

  return {
    pageLanguage: null,
    languageAccepted: null,
    confidence: null,
    reason: null,
  };
};

const toDataUrl = (content: Buffer, mimeType: string): string =>
  `data:${mimeType};base64,${content.toString('base64')}`;

const readLocalImageAsDataUrl = async (source: string): Promise<string | null> => {
  const candidates = [source];
  if (path.isAbsolute(source) === false) {
    candidates.push(getDiskPathFromPublicPath(source));
  }
  if (source.startsWith('/')) {
    candidates.push(getDiskPathFromPublicPath(source));
  }

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate);
      const extension = path.extname(candidate).toLowerCase();
      const mimeType =
        extension === '.png'
          ? 'image/png'
          : extension === '.webp'
            ? 'image/webp'
            : extension === '.gif'
              ? 'image/gif'
              : 'image/jpeg';
      return toDataUrl(content, mimeType);
    } catch {
      continue;
    }
  }

  return null;
};

const readRemoteImageAsDataUrl = async (source: string): Promise<string | null> => {
  const response = await fetchWithOutboundUrlPolicy(source, {
    method: 'GET',
    maxRedirects: 3,
  });
  if (response.ok === false) {
    return null;
  }
  const content = Buffer.from(await response.arrayBuffer());
  const mimeType = readOptionalString(response.headers.get('content-type')) ?? 'image/jpeg';
  return toDataUrl(content, mimeType);
};

const loadImageSourceAsDataUrl = async (source: string): Promise<string | null> => {
  if (source.startsWith('data:')) {
    return source;
  }
  if (/^https?:\/\//i.test(source) === true) {
    return await readRemoteImageAsDataUrl(source);
  }
  return await readLocalImageAsDataUrl(source);
};

const buildImagePart = (dataUrl: string): ChatCompletionContentPart => ({
  type: 'image_url',
  image_url: { url: dataUrl },
});

const resolveArtifactFileName = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  matcher: (artifact: PlaywrightEngineRunRecord['artifacts'][number]) => boolean
): string | null => {
  const artifact = (Array.isArray(run.artifacts) ? run.artifacts : []).find(matcher);
  if (artifact === undefined || artifact === null || (artifact.path ?? '') === '') {
    return null;
  }
  const fileName = path.basename(artifact.path!);
  return fileName.trim().length > 0 ? fileName : null;
};

const resolveArtifactFileNameByKey = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  artifactKey: string | null,
  matcher: (artifact: PlaywrightEngineRunRecord['artifacts'][number]) => boolean
): string | null => {
  const normalizedKey = readOptionalString(artifactKey);
  if (normalizedKey === null) {
    return null;
  }
  return resolveArtifactFileName(
    run,
    (artifact) => {
      const artifactBaseName = readOptionalString(path.basename(artifact.path || '', path.extname(artifact.path || '')));
      return (
        matcher(artifact) &&
        (artifact.name === normalizedKey || artifactBaseName === normalizedKey)
      );
    }
  );
};

const resolveAmazonEvaluationArtifactFileNames = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  probeArtifactKey: string | null
): {
  screenshotArtifactName: string | null;
  htmlArtifactName: string | null;
} => ({
  screenshotArtifactName:
    resolveArtifactFileNameByKey(
      run,
      probeArtifactKey,
      (artifact) => artifact.mimeType?.startsWith('image/') === true
    ) ??
    resolveArtifactFileName(
      run,
      (artifact) =>
        artifact.mimeType?.startsWith('image/') === true &&
        (artifact.name === 'amazon-scan-match' || (artifact.path ?? '').includes('amazon-scan-match'))
    ),
  htmlArtifactName:
    resolveArtifactFileNameByKey(
      run,
      probeArtifactKey,
      (artifact) => artifact.mimeType === 'text/html'
    ) ??
    resolveArtifactFileName(
      run,
      (artifact) =>
        artifact.mimeType === 'text/html' &&
        (artifact.name === 'amazon-scan-match' || (artifact.path ?? '').includes('amazon-scan-match'))
    ),
});

const resolveProductImageSources = (
  scan: Pick<ProductScanRecord, 'imageCandidates'>,
  product: ProductWithImages
): string[] => {
  const fromScan = scan.imageCandidates.flatMap((candidate) => [
    readOptionalString(candidate.url),
    readOptionalString(candidate.filepath),
  ]);
  const fromProductImages = (Array.isArray(product.images) ? product.images : []).flatMap((image) => [
    readOptionalString(image.imageFile?.publicUrl),
    readOptionalString(image.imageFile?.url),
    readOptionalString(image.imageFile?.filepath),
  ]);
  const fromImageLinks = Array.isArray(product.imageLinks) ? product.imageLinks : [];

  return normalizeTextList([...fromScan, ...fromProductImages, ...fromImageLinks]).slice(0, 4);
};

const resolveSourceProductName = (
  product: ProductWithImages,
  scan: Pick<ProductScanRecord, 'productName'>
): string | null =>
  readOptionalString(product.name_en) ??
  readOptionalString(product.name_pl) ??
  readOptionalString(product.name_de) ??
  readOptionalString(scan.productName);

const resolveSourceProductDescription = (product: ProductWithImages): string | null =>
  readOptionalString(product.description_en) ??
  readOptionalString(product.description_pl) ??
  readOptionalString(product.description_de);

const buildDeterministicMatchReasons = (
  product: ProductWithImages,
  parsedResult: AmazonScanRuntimeResult
): string[] => {
  const reasons: string[] = [];
  const productAsin = normalizeIdentifier(product.asin);
  const detectedAsin = normalizeIdentifier(parsedResult.asin);
  if (productAsin !== null && detectedAsin !== null && productAsin === detectedAsin) {
    reasons.push(`Existing ASIN ${productAsin} matches the Amazon candidate.`);
  }

  const productEan = normalizeIdentifier(product.ean);
  const productGtin = normalizeIdentifier(product.gtin);
  const candidateIdentifiers = [
    normalizeIdentifier(parsedResult.amazonDetails?.ean),
    normalizeIdentifier(parsedResult.amazonDetails?.gtin),
    normalizeIdentifier(parsedResult.amazonDetails?.upc),
    normalizeIdentifier(parsedResult.amazonDetails?.isbn),
  ].filter((value): value is string => value !== null);

  if (productEan !== null && candidateIdentifiers.includes(productEan)) {
    reasons.push(`Existing EAN ${productEan} matches the Amazon candidate.`);
  }
  if (productGtin !== null && candidateIdentifiers.includes(productGtin)) {
    reasons.push(`Existing GTIN ${productGtin} matches the Amazon candidate.`);
  }

  return reasons;
};

const buildDeterministicCandidateTriageReasons = (
  product: ProductWithImages,
  candidate: AmazonScanCandidateResult
): string[] => {
  const reasons: string[] = [];
  const productAsin = normalizeIdentifier(product.asin);
  const candidateAsin = normalizeIdentifier(candidate.asin);
  if (productAsin !== null && candidateAsin !== null && productAsin === candidateAsin) {
    reasons.push(`Candidate URL includes matching ASIN ${candidateAsin}.`);
  }
  return reasons;
};

const shouldBypassAmazonSimilarityAi = (input: {
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

const createEvaluationResult = (
  input: Omit<Partial<ProductScanAmazonEvaluationResult>, 'evaluatedAt'> &
    Pick<ProductScanAmazonEvaluationResult, 'status'> & {
    evaluatedAt?: string | null;
  }
): ProductScanAmazonEvaluationResult => ({
  stage: input.stage ?? null,
  sameProduct: input.sameProduct ?? null,
  imageMatch: input.imageMatch ?? null,
  descriptionMatch: input.descriptionMatch ?? null,
  pageRepresentsSameProduct: input.pageRepresentsSameProduct ?? null,
  pageLanguage: input.pageLanguage ?? null,
  languageConfidence: input.languageConfidence ?? null,
  languageAccepted: input.languageAccepted ?? null,
  languageReason: input.languageReason ?? null,
  confidence: input.confidence ?? null,
  proceed: input.proceed ?? false,
  scrapeAllowed: input.scrapeAllowed ?? false,
  recommendedAction: input.recommendedAction ?? null,
  rejectionCategory: input.rejectionCategory ?? null,
  threshold: input.threshold ?? null,
  reasons: input.reasons ?? [],
  mismatches: input.mismatches ?? [],
  mismatchLabels: input.mismatchLabels ?? [],
  variantAssessment: input.variantAssessment ?? null,
  modelId: input.modelId ?? null,
  brainApplied: input.brainApplied ?? null,
  evidence: input.evidence ?? null,
  error: input.error ?? null,
  status: input.status,
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});

const createCandidateTriageEvaluationResult = (
  input: Omit<AmazonCandidateTriageEvaluationResult, 'evaluatedAt'> & {
    evaluatedAt?: string | null;
  }
): AmazonCandidateTriageEvaluationResult => ({
  ...input,
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});

export const triageAmazonScanCandidates = async (input: {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: AmazonScanRuntimeResult;
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
  provider: string | null;
}): Promise<AmazonCandidateTriageEvaluationResult> => {
  const candidates =
    input.parsedResult.candidateResults.length > 0
      ? input.parsedResult.candidateResults
      : input.parsedResult.candidateUrls.map((url, index) => ({
          url,
          score: null,
          asin: extractAmazonAsinFromUrl(url),
          marketplaceDomain: (readOptionalString(url) !== null)
            ? (() => {
                try {
                  return new URL(url).hostname.toLowerCase();
                } catch {
                  return null;
                }
              })()
            : null,
          title: null,
          snippet: null,
          rank: index + 1,
        }));

  if (candidates.length === 0) {
    return createCandidateTriageEvaluationResult({
      status: 'rejected',
      stage: 'candidate_triage',
      confidence: null,
      threshold: input.evaluatorConfig.threshold,
      recommendedAction: 'reject',
      rejectionCategory: 'wrong_product',
      reasons: ['Amazon candidate triage did not receive any Google candidate results.'],
      mismatchLabels: ['wrong_product'],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      candidates: [],
      keptCandidateUrls: [],
      provider: input.provider,
      error: null,
    });
  }

  const deterministicCandidates = candidates.map((candidate, index) => {
    const rankBefore =
      typeof candidate.rank === 'number' && Number.isFinite(candidate.rank) && candidate.rank > 0
        ? candidate.rank
        : index + 1;
    const deterministicReasons = buildDeterministicCandidateTriageReasons(input.product, candidate);
    const deterministicLanguageDecision = resolveDeterministicCandidateLanguageDecision(candidate);
    return {
      candidate,
      rankBefore,
      deterministicReasons,
      deterministicLanguageDecision,
      candidateLanguageAccepted:
        input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai'
          ? deterministicLanguageDecision.languageAccepted
          : null,
    };
  });

  if (
    input.evaluatorConfig.candidateSimilarityMode !== 'ai_only' &&
    input.evaluatorConfig.onlyForAmbiguousCandidates === true
  ) {
    const deterministicKeeps = deterministicCandidates.filter(
      (entry) =>
        entry.deterministicReasons.length > 0 &&
        (input.evaluatorConfig.rejectNonEnglishContent === false ||
          entry.deterministicLanguageDecision.languageAccepted !== false)
    );

    if (deterministicKeeps.length > 0) {
      const normalizedCandidates = deterministicCandidates
        .map((entry) => {
          const isKept = deterministicKeeps.some((keepEntry) => keepEntry.candidate.url === entry.candidate.url);
          return {
            url: entry.candidate.url,
            rankBefore: entry.rankBefore,
            rankAfter: isKept === true
              ? deterministicKeeps.findIndex((keepEntry) => keepEntry.candidate.url === entry.candidate.url) + 1
              : null,
            confidence: entry.deterministicReasons.length > 0 ? 1 : null,
            keep: isKept,
            asin: entry.candidate.asin,
            marketplaceDomain: entry.candidate.marketplaceDomain,
            title: entry.candidate.title,
            snippet: entry.candidate.snippet,
            pageLanguage: entry.deterministicLanguageDecision.pageLanguage,
            languageAccepted: entry.candidateLanguageAccepted,
            recommendedAction: isKept === true
              ? ('accept' as const)
              : ('reject' as const),
            rejectionCategory:
              entry.candidateLanguageAccepted === false
                ? ('language' as const)
                : entry.deterministicReasons.length > 0
                  ? null
                  : ('wrong_product' as const),
            reasons:
              entry.deterministicReasons.length > 0
                ? entry.deterministicReasons
                : entry.candidateLanguageAccepted === false
                  ? [
                      entry.deterministicLanguageDecision.reason ??
                        'Candidate marketplace language is outside the allowed content policy.',
                    ]
                  : ['Candidate remained ambiguous after deterministic checks.'],
            mismatchLabels:
              entry.candidateLanguageAccepted === false ? (['language'] as ProductScanAmazonMismatchLabel[]) : [],
          };
        })
        .sort((left, right) => left.rankBefore - right.rankBefore);

      return createCandidateTriageEvaluationResult({
        status: 'skipped',
        stage: 'candidate_triage',
        confidence: 1,
        threshold: input.evaluatorConfig.threshold,
        recommendedAction: 'accept',
        rejectionCategory: null,
        reasons: deterministicKeeps.flatMap((entry) => entry.deterministicReasons).slice(0, 4),
        mismatchLabels: [],
        modelId: input.evaluatorConfig.modelId,
        brainApplied: input.evaluatorConfig.brainApplied,
        candidates: normalizedCandidates,
        keptCandidateUrls: deterministicKeeps.map((entry) => entry.candidate.url),
        provider: input.provider,
        error: null,
      });
    }
  }

  const promptPayload = {
    sourceProduct: {
      name: resolveSourceProductName(input.product, input.scan),
      description: resolveSourceProductDescription(input.product),
      asin: readOptionalString(input.product.asin),
      ean: readOptionalString(input.product.ean),
      gtin: readOptionalString(input.product.gtin),
    },
    provider: input.provider,
    candidates: deterministicCandidates.map((entry) => ({
      rankBefore: entry.rankBefore,
      url: entry.candidate.url,
      marketplaceDomain: entry.candidate.marketplaceDomain,
      asin: entry.candidate.asin,
      title: entry.candidate.title,
      snippet: entry.candidate.snippet,
      score: entry.candidate.score,
      deterministicMatchHints: entry.deterministicReasons,
      deterministicLanguageHint: {
        pageLanguage: entry.deterministicLanguageDecision.pageLanguage,
        languageAccepted: entry.candidateLanguageAccepted,
        reason: entry.deterministicLanguageDecision.reason,
      },
    })),
    evaluatorPolicy: {
      candidateSimilarityMode: input.evaluatorConfig.candidateSimilarityMode,
      languageDetectionMode: input.evaluatorConfig.languageDetectionMode,
      rejectNonEnglishContent: input.evaluatorConfig.rejectNonEnglishContent,
      allowedContentLanguage: input.evaluatorConfig.allowedContentLanguage,
    },
    responseContract: {
      recommendedAction: 'accept | reject | try_next_candidate | fallback_provider',
      rejectionCategory: 'language | variant | wrong_product | low_confidence | null',
      candidates: [
        {
          url: 'candidate url',
          keep: 'boolean',
          confidence: 'number between 0 and 1 | null',
          rankAfter: 'integer rank for kept candidates | null',
          pageLanguage: 'string | null',
          languageAccepted: 'boolean | null',
          recommendedAction: 'accept | reject | try_next_candidate | fallback_provider | null',
          rejectionCategory: 'language | variant | wrong_product | low_confidence | null',
          reasons: 'string[]',
          mismatchLabels:
            'brand | model | color | material | size | pack_count | character_theme_license | language | wrong_product | other',
        },
      ],
    },
  };

  try {
    const completion = await runBrainChatCompletion({
      modelId: input.evaluatorConfig.modelId,
      temperature: 0.1,
      maxTokens: 700,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content: [
            input.evaluatorConfig.systemPrompt,
            'Return only JSON.',
            'Rank the strongest Amazon candidates first before any Amazon page is opened.',
            'Discard obvious wrong products, wrong variants, or wrong-language marketplaces when the policy requires it.',
            input.evaluatorConfig.candidateSimilarityMode === 'ai_only'
              ? 'Deterministic hints are hints only. AI must decide whether each candidate should stay in the queue.'
              : 'Use deterministic hints as strong signals, but still discard candidates that are clearly wrong from the result metadata.',
          ]
            .filter((v): v is string => v !== null && v !== undefined && v !== '')
            .join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify(promptPayload, null, 2),
        },
      ],
    });

    const rawJson = JSON.parse(completion.text) as unknown;
    const parsed = amazonCandidateTriageResponseSchema.parse(rawJson);
    const parsedByUrl = new Map(parsed.candidates.map((candidate) => [candidate.url, candidate]));
    const normalizedCandidates = deterministicCandidates.map((entry) => {
      const parsedCandidate = parsedByUrl.get(entry.candidate.url) ?? null;
      const languageAccepted =
        input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai'
          ? parsedCandidate?.languageAccepted ?? entry.candidateLanguageAccepted
          : parsedCandidate?.languageAccepted ?? null;
      const mismatchLabels = dedupeMismatchLabels([
        ...(parsedCandidate?.mismatchLabels ?? []),
        languageAccepted === false ? 'language' : null,
      ]);
      const currentKeep =
        parsedCandidate?.keep === true &&
        (input.evaluatorConfig.rejectNonEnglishContent === false || languageAccepted !== false);
      const rejectionCategory = resolveAmazonRejectionCategory({
        approved: currentKeep === true,
        languageAccepted,
        parsedRejectionCategory: parsedCandidate?.rejectionCategory ?? null,
        mismatchLabels,
        sameProduct: currentKeep === true || entry.deterministicReasons.length > 0,
        pageRepresentsSameProduct: currentKeep === true || entry.deterministicReasons.length > 0,
        confidence: parsedCandidate?.confidence ?? 0,
        threshold: input.evaluatorConfig.threshold,
      });
      return {
        url: entry.candidate.url,
        rankBefore: entry.rankBefore,
        rankAfter: currentKeep ? parsedCandidate?.rankAfter ?? null : null,
        confidence: parsedCandidate?.confidence ?? null,
        keep: currentKeep,
        asin: entry.candidate.asin,
        marketplaceDomain: entry.candidate.marketplaceDomain,
        title: entry.candidate.title,
        snippet: entry.candidate.snippet,
        pageLanguage:
          normalizeLanguageTag(parsedCandidate?.pageLanguage) ??
          entry.deterministicLanguageDecision.pageLanguage,
        languageAccepted,
        recommendedAction: resolveAmazonRecommendedAction({
          approved: currentKeep,
          parsedRecommendedAction: parsedCandidate?.recommendedAction ?? null,
          rejectionCategory,
        }),
        rejectionCategory,
        reasons: normalizeTextList([
          ...(parsedCandidate?.reasons ?? []),
          ...entry.deterministicReasons,
          languageAccepted === false ? entry.deterministicLanguageDecision.reason : null,
        ]),
        mismatchLabels,
      };
    });

    const keptCandidates = normalizedCandidates
      .filter((candidate) => candidate.keep)
      .sort(
        (left, right) =>
          (left.rankAfter ?? Number.MAX_SAFE_INTEGER) -
            (right.rankAfter ?? Number.MAX_SAFE_INTEGER) || left.rankBefore - right.rankBefore
      )
      .map((candidate, index) => ({
        ...candidate,
        rankAfter: index + 1,
      }));
    const keptCandidateUrls = keptCandidates.map((candidate) => candidate.url);
    const finalCandidates = normalizedCandidates
      .map(
        (candidate) =>
          keptCandidates.find((entry) => entry.url === candidate.url) ?? candidate
      )
      .sort((left, right) => left.rankBefore - right.rankBefore);

    const repeatedProviderIssueCount = finalCandidates.filter(
      (candidate) =>
        candidate.keep === false &&
        (candidate.rejectionCategory === 'language' ||
          candidate.rejectionCategory === 'wrong_product')
    ).length;

    const stageRecommendedAction =
      keptCandidateUrls.length > 0
        ? ('accept' as const)
        : parsed.recommendedAction ??
          (repeatedProviderIssueCount >= Math.min(2, finalCandidates.length)
            ? ('fallback_provider' as const)
            : ('reject' as const));
    const stageRejectionCategory =
      keptCandidateUrls.length > 0
        ? null
        : parsed.rejectionCategory ??
          finalCandidates.find((candidate) => candidate.rejectionCategory !== null)
            ?.rejectionCategory ??
          'wrong_product';

    return createCandidateTriageEvaluationResult({
      status: keptCandidateUrls.length > 0 ? 'approved' : 'rejected',
      stage: 'candidate_triage',
      confidence: keptCandidates[0]?.confidence ?? null,
      threshold: input.evaluatorConfig.threshold,
      recommendedAction: stageRecommendedAction,
      rejectionCategory: stageRejectionCategory,
      reasons:
        parsed.reasons.length > 0
          ? parsed.reasons
          : finalCandidates.flatMap((candidate) => candidate.reasons).slice(0, 4),
      mismatchLabels: dedupeMismatchLabels(
        finalCandidates.flatMap((candidate) => candidate.mismatchLabels)
      ),
      modelId: completion.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      candidates: finalCandidates,
      keptCandidateUrls,
      provider: input.provider,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Amazon candidate triage failed.';
    return createCandidateTriageEvaluationResult({
      status: 'failed',
      stage: 'candidate_triage',
      confidence: null,
      threshold: input.evaluatorConfig.threshold,
      recommendedAction: 'reject',
      rejectionCategory: 'low_confidence',
      reasons: [],
      mismatchLabels: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      candidates: deterministicCandidates.map((entry) => ({
        url: entry.candidate.url,
        rankBefore: entry.rankBefore,
        rankAfter: null,
        confidence: null,
        keep: false,
        asin: entry.candidate.asin,
        marketplaceDomain: entry.candidate.marketplaceDomain,
        title: entry.candidate.title,
        snippet: entry.candidate.snippet,
        pageLanguage: entry.deterministicLanguageDecision.pageLanguage,
        languageAccepted: entry.candidateLanguageAccepted,
        recommendedAction: 'reject',
        rejectionCategory: null,
        reasons: [],
        mismatchLabels: [],
      })),
      keptCandidateUrls: [],
      provider: input.provider,
      error: message,
    });
  }
};

export const evaluateAmazonScanCandidateMatch = async (input: {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: AmazonScanRuntimeResult;
  run: Pick<PlaywrightEngineRunRecord, 'runId' | 'artifacts'>;
  stage?: 'probe_evaluate' | 'extraction_evaluate';
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
}): Promise<ProductScanAmazonEvaluationResult> => {
  const evaluationStage = input.stage ?? 'probe_evaluate';
  const evidenceArtifacts = resolveAmazonEvaluationArtifactFileNames(
    input.run,
    readOptionalString(input.parsedResult.amazonProbe?.artifactKey)
  );
  const evidence = {
    candidateUrl:
      readOptionalString(input.parsedResult.amazonProbe?.canonicalUrl) ??
      readOptionalString(input.parsedResult.amazonProbe?.candidateUrl) ??
      readOptionalString(input.parsedResult.url) ??
      readOptionalString(input.parsedResult.currentUrl),
    pageTitle:
      readOptionalString(input.parsedResult.amazonProbe?.pageTitle) ??
      readOptionalString(input.parsedResult.title),
    heroImageSource: readOptionalString(input.parsedResult.amazonProbe?.heroImageUrl),
    heroImageArtifactName: readOptionalString(input.parsedResult.amazonProbe?.heroImageArtifactName),
    screenshotArtifactName: evidenceArtifacts.screenshotArtifactName,
    htmlArtifactName: evidenceArtifacts.htmlArtifactName,
    productImageSource: null as string | null,
  };
  const evaluationBase = {
    stage: evaluationStage,
    threshold: input.evaluatorConfig.threshold,
    modelId: input.evaluatorConfig.modelId,
    brainApplied: input.evaluatorConfig.brainApplied,
    evidence,
  };

  const deterministicLanguageDecision = resolveDeterministicLanguageDecision({
    parsedResult: input.parsedResult,
    evaluatorConfig: input.evaluatorConfig,
  });
  if (
    input.evaluatorConfig.rejectNonEnglishContent === true &&
    input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai' &&
    deterministicLanguageDecision.languageAccepted === false
  ) {
    const languageReason =
      deterministicLanguageDecision.reason ??
      'Amazon page content is not in the allowed language.';
    return createEvaluationResult({
      ...evaluationBase,
      status: 'rejected',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      pageLanguage: deterministicLanguageDecision.pageLanguage,
      languageConfidence: deterministicLanguageDecision.confidence,
      languageAccepted: false,
      languageReason,
      confidence: deterministicLanguageDecision.confidence,
      proceed: false,
      scrapeAllowed: false,
      recommendedAction: 'try_next_candidate',
      rejectionCategory: 'language',
      reasons: [languageReason],
      mismatches: ['Amazon page content is not in English.'],
      mismatchLabels: ['language'],
      variantAssessment: null,
      error: null,
    });
  }

  const deterministicReasons = buildDeterministicMatchReasons(input.product, input.parsedResult);
  if (
    shouldBypassAmazonSimilarityAi({
      evaluatorConfig: input.evaluatorConfig,
      deterministicReasons,
      deterministicLanguageDecision,
    })
  ) {
    const scrapeAllowed =
      input.evaluatorConfig.rejectNonEnglishContent === false ||
      deterministicLanguageDecision.languageAccepted === true ||
      isEnglishLanguageTag(deterministicLanguageDecision.pageLanguage);

    return createEvaluationResult({
      ...evaluationBase,
      status: 'skipped',
      sameProduct: true,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: true,
      pageLanguage: deterministicLanguageDecision.pageLanguage,
      languageConfidence: deterministicLanguageDecision.confidence,
      languageAccepted: input.evaluatorConfig.rejectNonEnglishContent === true
        ? (scrapeAllowed ? true : deterministicLanguageDecision.languageAccepted)
        : true,
      languageReason: deterministicLanguageDecision.reason,
      confidence: 1,
      proceed: true,
      scrapeAllowed,
      recommendedAction: 'accept',
      rejectionCategory: null,
      reasons: deterministicReasons,
      mismatches: [],
      mismatchLabels: [],
      variantAssessment: null,
      error: null,
    });
  }

  const productImageSources = resolveProductImageSources(input.scan, input.product);
  const productImageSource = productImageSources[0] ?? null;
  evidence.productImageSource = productImageSource;

  const screenshotArtifactName = evidenceArtifacts.screenshotArtifactName;
  if (productImageSource === null) {
    return createEvaluationResult({
      ...evaluationBase,
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      mismatchLabels: [],
      variantAssessment: null,
      error: 'Amazon candidate AI evaluation could not load a source product image.',
    });
  }
  if (screenshotArtifactName === null) {
    return createEvaluationResult({
      ...evaluationBase,
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      mismatchLabels: [],
      variantAssessment: null,
      error: 'Amazon candidate AI evaluation could not find the Amazon page screenshot artifact.',
    });
  }

  const productImageDataUrl = await loadImageSourceAsDataUrl(productImageSource).catch(async (error) => {
    await ErrorSystem.captureException(error, {
      service: 'product-scan-amazon-evaluator',
      action: 'loadProductImage',
      productId: input.product.id,
      source: productImageSource,
    });
    return null;
  });
  if (productImageDataUrl === null) {
    return createEvaluationResult({
      ...evaluationBase,
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      mismatchLabels: [],
      variantAssessment: null,
      error: 'Amazon candidate AI evaluation could not load the source product image contents.',
    });
  }

  const heroImageArtifact = (typeof evidence.heroImageArtifactName === 'string' && evidence.heroImageArtifactName !== '')
    ? await readPlaywrightEngineArtifact({
        runId: input.run.runId,
        fileName: evidence.heroImageArtifactName,
      }).catch(async (error) => {
        await ErrorSystem.captureException(error, {
          service: 'product-scan-amazon-evaluator',
          action: 'readAmazonHeroImageArtifact',
          productId: input.product.id,
          fileName: evidence.heroImageArtifactName!,
        });
        return null;
      })
    : null;
  const heroImageDataUrl = heroImageArtifact !== null
    ? toDataUrl(
        heroImageArtifact.content,
        readOptionalString(heroImageArtifact.artifact.mimeType) ?? 'image/png'
      )
    : (typeof evidence.heroImageSource === 'string' && evidence.heroImageSource !== '')
      ? await loadImageSourceAsDataUrl(evidence.heroImageSource).catch(async (error) => {
          await ErrorSystem.captureException(error, {
            service: 'product-scan-amazon-evaluator',
            action: 'loadAmazonHeroImage',
            productId: input.product.id,
            source: evidence.heroImageSource!,
          });
          return null;
        })
      : null;

  const screenshotArtifact = await readPlaywrightEngineArtifact({
    runId: input.run.runId,
    fileName: screenshotArtifactName,
  });
  if (!screenshotArtifact) {
    return createEvaluationResult({
      ...evaluationBase,
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      mismatchLabels: [],
      variantAssessment: null,
      error: 'Amazon candidate AI evaluation could not read the Amazon page screenshot artifact.',
    });
  }

  const sourceProductName = resolveSourceProductName(input.product, input.scan);
  const sourceProductDescription = resolveSourceProductDescription(input.product);
  const amazonDetails = input.parsedResult.amazonDetails;
  const systemPrompt = [
    input.evaluatorConfig.systemPrompt,
    'Return only JSON.',
    'Approve only when the Amazon page clearly represents the same product and variant as the source product.',
    'Score each variant dimension explicitly: brand, model, color, material, size, pack count, and character/theme/license.',
    'Reject mismatches in brand, model, color, material, size, pack count, character/theme/license, or major description conflicts.',
    input.evaluatorConfig.candidateSimilarityMode === 'ai_only'
      ? 'Deterministic identifier matches are hints only. AI must decide whether the page represents the same product.'
      : 'Use deterministic identifier matches as strong hints, but still reject visible product mismatches.',
    `Allowed content language for scraping: ${resolveLanguageLabel(input.evaluatorConfig.allowedContentLanguage) ?? input.evaluatorConfig.allowedContentLanguage}.`,
    input.evaluatorConfig.rejectNonEnglishContent === true
      ? 'If the Amazon page content is not English enough to trust scraping into English fields, set languageAccepted to false and proceed to false.'
      : 'Language does not block scraping in this run.',
    input.evaluatorConfig.languageDetectionMode === 'ai_only'
      ? 'You must determine the Amazon page language from the page content and images. Do not leave languageAccepted empty.'
      : 'Deterministic language hints are provided as extra evidence.',
  ]
    .filter((v): v is string => v !== null && v !== undefined && v !== '')
    .join('\n');

  const promptPayload = {
    sourceProduct: {
      name: sourceProductName,
      description: sourceProductDescription,
      asin: readOptionalString(input.product.asin),
      ean: readOptionalString(input.product.ean),
      gtin: readOptionalString(input.product.gtin),
    },
    amazonCandidate: {
      url: evidence.candidateUrl,
      title:
        readOptionalString(input.parsedResult.amazonProbe?.pageTitle) ??
        readOptionalString(input.parsedResult.title),
      description:
        readOptionalString(input.parsedResult.amazonProbe?.descriptionSnippet) ??
        readOptionalString(input.parsedResult.description),
      asin:
        readOptionalString(input.parsedResult.amazonProbe?.asin) ??
        readOptionalString(input.parsedResult.asin),
      brand: readOptionalString(amazonDetails?.brand),
      manufacturer: readOptionalString(amazonDetails?.manufacturer),
      modelNumber: readOptionalString(amazonDetails?.modelNumber),
      partNumber: readOptionalString(amazonDetails?.partNumber),
      color: readOptionalString(amazonDetails?.color),
      style: readOptionalString(amazonDetails?.style),
      material: readOptionalString(amazonDetails?.material),
      size: readOptionalString(amazonDetails?.size),
      heroImageUrl: readOptionalString(input.parsedResult.amazonProbe?.heroImageUrl),
      heroImageAlt: readOptionalString(input.parsedResult.amazonProbe?.heroImageAlt),
      ean: readOptionalString(amazonDetails?.ean),
      gtin: readOptionalString(amazonDetails?.gtin),
      upc: readOptionalString(amazonDetails?.upc),
      bulletPoints:
        Array.isArray(input.parsedResult.amazonProbe?.bulletPoints) &&
        input.parsedResult.amazonProbe.bulletPoints.length > 0
          ? input.parsedResult.amazonProbe.bulletPoints.slice(0, 8)
          : Array.isArray(amazonDetails?.bulletPoints)
            ? amazonDetails.bulletPoints.slice(0, 8)
            : [],
      attributes: Array.isArray(amazonDetails?.attributes)
        ? amazonDetails.attributes.slice(0, 12).map((attribute) => ({
            label: attribute.label,
            value: attribute.value,
          }))
        : [],
      probe: input.parsedResult.amazonProbe,
      deterministicMatchHints: deterministicReasons,
      deterministicLanguageHint: {
        pageLanguage: deterministicLanguageDecision.pageLanguage,
        languageAccepted: deterministicLanguageDecision.languageAccepted,
        reason: deterministicLanguageDecision.reason,
      },
    },
    evaluatorPolicy: {
      candidateSimilarityMode: input.evaluatorConfig.candidateSimilarityMode,
      languageDetectionMode: input.evaluatorConfig.languageDetectionMode,
      rejectNonEnglishContent: input.evaluatorConfig.rejectNonEnglishContent,
      allowedContentLanguage: input.evaluatorConfig.allowedContentLanguage,
    },
    responseContract: {
      sameProduct: 'boolean',
      imageMatch: 'boolean | null',
      descriptionMatch: 'boolean | null',
      pageRepresentsSameProduct: 'boolean',
      pageLanguage: 'string | null',
      languageAccepted: 'boolean | null',
      languageReason: 'string | null',
      languageConfidence: 'number between 0 and 1 | null',
      confidence: 'number between 0 and 1',
      proceed: 'boolean',
      recommendedAction: 'accept | reject | try_next_candidate | fallback_provider | null',
      rejectionCategory: 'language | variant | wrong_product | low_confidence | null',
      mismatchLabels:
        'brand | model | color | material | size | pack_count | character_theme_license | language | wrong_product | other',
      variantAssessment: {
        brand: 'match | mismatch | unknown',
        model: 'match | mismatch | unknown',
        color: 'match | mismatch | unknown',
        material: 'match | mismatch | unknown',
        size: 'match | mismatch | unknown',
        packCount: 'match | mismatch | unknown',
        characterThemeLicense: 'match | mismatch | unknown',
      },
      reasons: 'string[]',
      mismatches: 'string[]',
    },
  };

  try {
    const userContent: ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: [
          'Compare the source product and the Amazon page.',
          'The first image is the source product image from the app.',
          (heroImageDataUrl !== null)
            ? 'The second image is the Amazon product hero image from the page.'
            : null,
          (heroImageDataUrl !== null)
            ? 'The third image is the Amazon page screenshot.'
            : 'The second image is the Amazon page screenshot.',
          JSON.stringify(promptPayload, null, 2),
        ]
          .filter((v): v is string => v !== null && v !== undefined && v !== '')
          .join('\n\n'),
      },
      buildImagePart(productImageDataUrl),
    ];
    if (heroImageDataUrl !== null) {
      userContent.push(buildImagePart(heroImageDataUrl));
    }
    userContent.push(
      buildImagePart(
        toDataUrl(
          screenshotArtifact.content,
          readOptionalString(screenshotArtifact.artifact.mimeType) ?? 'image/png'
        )
      )
    );

    const completion = await runBrainChatCompletion({
      modelId: input.evaluatorConfig.modelId,
      temperature: 0.1,
      maxTokens: 600,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    if (SUPPORTED_IMAGE_RUNTIME_VENDORS.has(completion.vendor) === false) {
      return createEvaluationResult({
        ...evaluationBase,
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        descriptionMatch: null,
        pageRepresentsSameProduct: null,
        confidence: null,
        proceed: false,
        reasons: [],
        mismatches: [],
        mismatchLabels: [],
        variantAssessment: null,
        modelId: completion.modelId,
        error:
          'Amazon candidate AI evaluation selected a runtime that does not support image inputs in this scanner flow.',
      });
    }

    const rawJson = JSON.parse(completion.text) as unknown;
    const parsed = amazonEvaluatorResponseSchema.parse(rawJson);
    const languageAccepted =
      input.evaluatorConfig.rejectNonEnglishContent === true
        ? typeof parsed.languageAccepted === 'boolean'
          ? parsed.languageAccepted
          : input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai'
            ? deterministicLanguageDecision.languageAccepted
            : null
        : true;
    const languageReason =
      readOptionalString(parsed.languageReason) ?? deterministicLanguageDecision.reason;
    const pageLanguage =
      normalizeLanguageTag(parsed.pageLanguage) ?? deterministicLanguageDecision.pageLanguage;
    const languageConfidence =
      typeof parsed.languageConfidence === 'number'
        ? parsed.languageConfidence
        : deterministicLanguageDecision.confidence;
    const languageGatePassed = input.evaluatorConfig.rejectNonEnglishContent === false
      ? true
      : input.evaluatorConfig.languageDetectionMode === 'ai_only'
        ? languageAccepted === true
        : languageAccepted !== false;
    const approved =
      parsed.proceed === true &&
      parsed.sameProduct === true &&
      parsed.pageRepresentsSameProduct === true &&
      parsed.imageMatch !== false &&
      parsed.descriptionMatch !== false &&
      languageGatePassed === true &&
      parsed.confidence >= input.evaluatorConfig.threshold;
    const reasons = [...parsed.reasons];
    const mismatches = [...parsed.mismatches];
    const variantAssessment = normalizeVariantAssessment(parsed.variantAssessment);
    const mismatchLabels = dedupeMismatchLabels([
      ...(parsed.mismatchLabels ?? []),
      variantAssessment?.brand === 'mismatch' ? 'brand' : null,
      variantAssessment?.model === 'mismatch' ? 'model' : null,
      variantAssessment?.color === 'mismatch' ? 'color' : null,
      variantAssessment?.material === 'mismatch' ? 'material' : null,
      variantAssessment?.size === 'mismatch' ? 'size' : null,
      variantAssessment?.packCount === 'mismatch' ? 'pack_count' : null,
      variantAssessment?.characterThemeLicense === 'mismatch'
        ? 'character_theme_license'
        : null,
      languageAccepted === false ? 'language' : null,
      (parsed.sameProduct === false || parsed.pageRepresentsSameProduct === false) ? 'wrong_product' : null,
    ]);
    if (
      input.evaluatorConfig.rejectNonEnglishContent === true &&
      input.evaluatorConfig.languageDetectionMode === 'ai_only' &&
      languageAccepted === null
    ) {
      const missingLanguageVerdictReason =
        'AI evaluator did not return a language verdict for the Amazon page.';
      if (reasons.includes(missingLanguageVerdictReason) === false) {
        reasons.unshift(missingLanguageVerdictReason);
      }
      if (mismatches.includes('Amazon page language could not be verified.') === false) {
        mismatches.push('Amazon page language could not be verified.');
      }
    }
    if (languageAccepted === false && languageReason !== null && reasons.includes(languageReason) === false) {
      reasons.unshift(languageReason);
    }
    if (
      languageAccepted === false &&
      mismatches.some((entry) => /language|english/i.test(entry)) === false
    ) {
      mismatches.push('Amazon page content is not in English.');
    }
    const rejectionCategory = resolveAmazonRejectionCategory({
      approved,
      languageAccepted,
      parsedRejectionCategory: parsed.rejectionCategory ?? null,
      mismatchLabels,
      sameProduct: parsed.sameProduct,
      pageRepresentsSameProduct: parsed.pageRepresentsSameProduct,
      confidence: parsed.confidence,
      threshold: input.evaluatorConfig.threshold,
    });
    const recommendedAction = resolveAmazonRecommendedAction({
      approved,
      parsedRecommendedAction: parsed.recommendedAction ?? null,
      rejectionCategory,
    });

    return createEvaluationResult({
      ...evaluationBase,
      status: approved ? 'approved' : 'rejected',
      sameProduct: parsed.sameProduct,
      imageMatch: parsed.imageMatch,
      descriptionMatch: parsed.descriptionMatch,
      pageRepresentsSameProduct: parsed.pageRepresentsSameProduct,
      pageLanguage,
      languageConfidence,
      languageAccepted,
      languageReason,
      confidence: parsed.confidence,
      proceed: approved,
      scrapeAllowed: approved && languageAccepted !== false,
      recommendedAction,
      rejectionCategory,
      reasons,
      mismatches,
      mismatchLabels,
      variantAssessment,
      modelId: completion.modelId,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Amazon candidate AI evaluation failed.';
    return createEvaluationResult({
      ...evaluationBase,
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      mismatchLabels: [],
      variantAssessment: null,
      error: message,
    });
  }
};
