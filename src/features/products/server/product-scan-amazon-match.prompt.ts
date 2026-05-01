import 'server-only';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import {
  buildProductScanImagePart,
} from './product-scan-ai-evaluator.shared';
import { readOptionalString } from './product-scan-ai-evaluator.utils';
import {
  resolveSourceProductDescription,
  resolveSourceProductName,
} from './product-scan-amazon.evidence';
import { resolveLanguageLabel } from './product-scan-amazon-language';
import type { AmazonMatchAssets } from './product-scan-amazon-match.assets';
import type {
  AmazonCandidateMatchInput,
  AmazonMatchEvaluationContext,
} from './product-scan-amazon-match.context';

type BrainMessage = {
  role: 'system' | 'user';
  content: string | ChatCompletionContentPart[];
};

export const buildAmazonMatchEvaluationMessages = (
  input: AmazonCandidateMatchInput,
  assets: AmazonMatchAssets
): BrainMessage[] => [
  { role: 'system', content: buildAmazonMatchSystemPrompt(input) },
  {
    role: 'user',
    content: buildAmazonMatchUserContent(
      assets,
      buildAmazonMatchPromptPayload(input, assets.context)
    ),
  },
];

const buildAmazonMatchSystemPrompt = (input: AmazonCandidateMatchInput): string =>
  [
    input.evaluatorConfig.systemPrompt,
    'Return only JSON.',
    'Approve only when the Amazon page clearly represents the same product and variant as the source product.',
    'Score each variant dimension explicitly: brand, model, color, material, size, pack count, and character/theme/license.',
    'Reject mismatches in brand, model, color, material, size, pack count, character/theme/license, or major description conflicts.',
    resolveIdentifierMatchPolicy(input),
    `Allowed content language for scraping: ${resolveLanguageLabel(input.evaluatorConfig.allowedContentLanguage) ?? input.evaluatorConfig.allowedContentLanguage}.`,
    resolveLanguagePolicy(input),
    resolveLanguageDetectionInstruction(input),
  ]
    .join('\n');

const resolveIdentifierMatchPolicy = (input: AmazonCandidateMatchInput): string =>
  input.evaluatorConfig.candidateSimilarityMode === 'ai_only'
    ? 'Deterministic identifier matches are hints only. AI must decide whether the page represents the same product.'
    : 'Use deterministic identifier matches as strong hints, but still reject visible product mismatches.';

const resolveLanguagePolicy = (input: AmazonCandidateMatchInput): string =>
  input.evaluatorConfig.rejectNonEnglishContent === true
    ? 'If the Amazon page content is not English enough to trust scraping into English fields, set languageAccepted to false and proceed to false.'
    : 'Language does not block scraping in this run.';

const resolveLanguageDetectionInstruction = (input: AmazonCandidateMatchInput): string =>
  input.evaluatorConfig.languageDetectionMode === 'ai_only'
    ? 'You must determine the Amazon page language from the page content and images. Do not leave languageAccepted empty.'
    : 'Deterministic language hints are provided as extra evidence.';

const buildAmazonMatchPromptPayload = (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): Record<string, unknown> => ({
  sourceProduct: {
    name: resolveSourceProductName(input.product, input.scan),
    description: resolveSourceProductDescription(input.product),
    asin: readOptionalString(input.product.asin),
    ean: readOptionalString(input.product.ean),
    gtin: readOptionalString(input.product.gtin),
  },
  amazonCandidate: buildAmazonCandidatePayload(input, context),
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
    mismatchLabels: 'brand | model | color | material | size | pack_count | character_theme_license | language | wrong_product | other',
    reasons: 'string[]',
    mismatches: 'string[]',
  },
});

const buildAmazonCandidatePayload = (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): Record<string, unknown> => ({
  ...buildAmazonCandidateIdentityPayload(input, context),
  ...buildAmazonCandidateAttributePayload(input),
  bulletPoints: resolveAmazonBulletPoints(input),
  attributes: resolveAmazonAttributes(input.parsedResult.amazonDetails?.attributes),
  probe: input.parsedResult.amazonProbe,
  deterministicMatchHints: context.deterministicReasons,
  deterministicLanguageHint: context.deterministicLanguageDecision,
});

const buildAmazonCandidateIdentityPayload = (
  input: AmazonCandidateMatchInput,
  context: AmazonMatchEvaluationContext
): Record<string, unknown> => ({
  url: context.evaluationBase.evidence.candidateUrl,
  title: resolveFirstOptionalString([
    input.parsedResult.amazonProbe?.pageTitle,
    input.parsedResult.title,
  ]),
  description: resolveFirstOptionalString([
    input.parsedResult.amazonProbe?.descriptionSnippet,
    input.parsedResult.description,
  ]),
  asin: resolveFirstOptionalString([
    input.parsedResult.amazonProbe?.asin,
    input.parsedResult.asin,
  ]),
  heroImageUrl: readOptionalString(input.parsedResult.amazonProbe?.heroImageUrl),
  heroImageAlt: readOptionalString(input.parsedResult.amazonProbe?.heroImageAlt),
});

const resolveFirstOptionalString = (values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = readOptionalString(value);
    if (normalized !== null) return normalized;
  }
  return null;
};

const buildAmazonCandidateAttributePayload = (
  input: AmazonCandidateMatchInput
): Record<string, unknown> => ({
  brand: readAmazonDetail(input, 'brand'),
  manufacturer: readAmazonDetail(input, 'manufacturer'),
  modelNumber: readAmazonDetail(input, 'modelNumber'),
  partNumber: readAmazonDetail(input, 'partNumber'),
  color: readAmazonDetail(input, 'color'),
  style: readAmazonDetail(input, 'style'),
  material: readAmazonDetail(input, 'material'),
  size: readAmazonDetail(input, 'size'),
  ean: readAmazonDetail(input, 'ean'),
  gtin: readAmazonDetail(input, 'gtin'),
  upc: readAmazonDetail(input, 'upc'),
});

const readAmazonDetail = (
  input: AmazonCandidateMatchInput,
  key: keyof NonNullable<AmazonCandidateMatchInput['parsedResult']['amazonDetails']>
): string | null => {
  const amazonDetails = input.parsedResult.amazonDetails;
  if (amazonDetails === null) return null;
  return readOptionalString(amazonDetails[key]);
};

const resolveAmazonBulletPoints = (input: AmazonCandidateMatchInput): string[] => {
  if (
    Array.isArray(input.parsedResult.amazonProbe?.bulletPoints) &&
    input.parsedResult.amazonProbe.bulletPoints.length > 0
  ) {
    return input.parsedResult.amazonProbe.bulletPoints.slice(0, 8);
  }
  const detailsBulletPoints = input.parsedResult.amazonDetails?.bulletPoints;
  return Array.isArray(detailsBulletPoints) ? detailsBulletPoints.slice(0, 8) : [];
};

const resolveAmazonAttributes = (
  attributes: Array<{ label: string; value: string }> | null | undefined
): Array<{ label: string; value: string }> =>
  Array.isArray(attributes)
    ? attributes.slice(0, 12).map((attribute) => ({
        label: attribute.label,
        value: attribute.value,
      }))
    : [];

const buildAmazonMatchUserContent = (
  assets: AmazonMatchAssets,
  promptPayload: Record<string, unknown>
): ChatCompletionContentPart[] => {
  const userContent: ChatCompletionContentPart[] = [
    { type: 'text', text: buildAmazonMatchUserText(assets, promptPayload) },
    buildProductScanImagePart(assets.productImageDataUrl),
  ];
  if (assets.heroImageDataUrl !== null) {
    userContent.push(buildProductScanImagePart(assets.heroImageDataUrl));
  }
  userContent.push(buildProductScanImagePart(assets.screenshotDataUrl));
  return userContent;
};

const buildAmazonMatchUserText = (
  assets: AmazonMatchAssets,
  promptPayload: Record<string, unknown>
): string => {
  const screenshotPosition =
    assets.heroImageDataUrl !== null
      ? 'The third image is the Amazon page screenshot.'
      : 'The second image is the Amazon page screenshot.';
  return [
    'Compare the source product and the Amazon page.',
    'The first image is the source product image from the app.',
    assets.heroImageDataUrl !== null
      ? 'The second image is the Amazon product hero image from the page.'
      : null,
    screenshotPosition,
    JSON.stringify(promptPayload, null, 2),
  ]
    .filter((value): value is string => value !== null && value !== '')
    .join('\n\n');
};
