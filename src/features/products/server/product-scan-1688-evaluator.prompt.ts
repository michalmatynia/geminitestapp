import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  buildProductScanImagePart,
  productScanBufferToDataUrl,
} from './product-scan-ai-evaluator.shared';
import {
  readOptionalString,
  type SupplierEvaluatorAssets,
  type SupplierEvaluatorInput,
} from './product-scan-1688-evaluator.helpers';

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

const buildSourceProductPromptPayload = (input: SupplierEvaluatorInput): unknown => ({
  name: resolveSourceProductName(input.product, input.scan),
  description: resolveSourceProductDescription(input.product),
  ean: readOptionalString(input.product.ean),
  gtin: readOptionalString(input.product.gtin),
  supplierName: readOptionalString(input.product.supplierName),
  supplierLink: readOptionalString(input.product.supplierLink),
});

const resolveCandidateUrl = (input: SupplierEvaluatorInput): string | null => {
  const supplierProbe = input.parsedResult.supplierProbe;
  return (
    readOptionalString(supplierProbe?.canonicalUrl) ??
    readOptionalString(supplierProbe?.candidateUrl) ??
    readOptionalString(input.parsedResult.url)
  );
};

const resolveCandidateTitle = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierProbe?.pageTitle) ??
  readOptionalString(input.parsedResult.title);

const resolveCandidateDescription = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierProbe?.descriptionSnippet) ??
  readOptionalString(input.parsedResult.description);

const resolveCandidateSupplierName = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierDetails?.supplierName) ??
  readOptionalString(input.parsedResult.supplierProbe?.supplierName);

const resolveCandidateSupplierStoreUrl = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierDetails?.supplierStoreUrl) ??
  readOptionalString(input.parsedResult.supplierProbe?.supplierStoreUrl);

const resolveCandidatePriceText = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierDetails?.priceText) ??
  readOptionalString(input.parsedResult.supplierProbe?.priceText);

const resolveCandidateCurrency = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierDetails?.currency) ??
  readOptionalString(input.parsedResult.supplierProbe?.currency);

const resolveCandidateSourceLanguage = (input: SupplierEvaluatorInput): string | null =>
  readOptionalString(input.parsedResult.supplierDetails?.sourceLanguage) ??
  readOptionalString(input.parsedResult.supplierProbe?.pageLanguage);

const buildSupplierCandidatePromptPayload = (input: SupplierEvaluatorInput): unknown => {
  const supplierDetails = input.parsedResult.supplierDetails;
  return {
    url: resolveCandidateUrl(input),
    title: resolveCandidateTitle(input),
    description: resolveCandidateDescription(input),
    supplierName: resolveCandidateSupplierName(input),
    supplierStoreUrl: resolveCandidateSupplierStoreUrl(input),
    priceText: resolveCandidatePriceText(input),
    priceRangeText: readOptionalString(supplierDetails?.priceRangeText),
    moqText: readOptionalString(supplierDetails?.moqText),
    currency: resolveCandidateCurrency(input),
    platformProductId: readOptionalString(supplierDetails?.platformProductId),
    supplierLocation: readOptionalString(supplierDetails?.supplierLocation),
    sourceLanguage: resolveCandidateSourceLanguage(input),
    heuristicEvaluation: input.parsedResult.supplierEvaluation,
  };
};

const buildSupplierEvaluationPromptPayload = (input: SupplierEvaluatorInput): unknown => ({
  sourceProduct: buildSourceProductPromptPayload(input),
  supplierCandidate: buildSupplierCandidatePromptPayload(input),
  responseContract: {
    sameProduct: 'boolean',
    imageMatch: 'boolean | null',
    titleMatch: 'boolean | null',
    confidence: 'number between 0 and 1',
    proceed: 'boolean',
    reasons: 'string[]',
    mismatches: 'string[]',
  },
});

const buildImageIndexCopy = (hasHeroImage: boolean): string[] =>
  hasHeroImage
    ? [
        'The second image is the supplier hero image from the 1688 page.',
        'The third image is the supplier page screenshot.',
      ]
    : ['The second image is the supplier page screenshot.'];

export const buildSupplierEvaluationUserContent = (
  input: SupplierEvaluatorInput,
  assets: SupplierEvaluatorAssets
): ChatCompletionContentPart[] => {
  const supplierScreenshotDataUrl = productScanBufferToDataUrl(
    assets.screenshotArtifact.content,
    readOptionalString(assets.screenshotArtifact.artifact.mimeType) ?? 'image/png'
  );
  const userContent: ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: [
        'Compare the source product and the 1688 supplier candidate.',
        'The first image is the source product image from the app.',
        ...buildImageIndexCopy(assets.heroImageDataUrl !== null),
        JSON.stringify(buildSupplierEvaluationPromptPayload(input), null, 2),
      ].join('\n\n'),
    },
    buildProductScanImagePart(assets.productImageDataUrl),
  ];
  if (assets.heroImageDataUrl !== null) {
    userContent.push(buildProductScanImagePart(assets.heroImageDataUrl));
  }
  userContent.push(buildProductScanImagePart(supplierScreenshotDataUrl));
  return userContent;
};

export const buildSupplierEvaluationMessages = (
  input: SupplierEvaluatorInput,
  assets: SupplierEvaluatorAssets
): Array<{ role: 'system' | 'user'; content: string | ChatCompletionContentPart[] }> => [
  {
    role: 'system',
    content: [
      input.evaluatorConfig.systemPrompt,
      'Return only JSON.',
      'Approve only when the 1688 supplier page clearly matches the same product or a clearly compatible sourcing equivalent.',
      'Reject mismatches in visible form factor, pack count, main material cues, or clearly divergent titles.',
    ].join('\n'),
  },
  {
    role: 'user',
    content: buildSupplierEvaluationUserContent(input, assets),
  },
];
