import 'server-only';

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
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  buildProductScanImagePart,
  loadProductScanImageSourceAsDataUrl,
  PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS,
  productScanBufferToDataUrl,
} from './product-scan-ai-evaluator.shared';
import type { ProductScanner1688CandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type { SupplierScanRuntimeResult } from './product-scans-service.helpers';

const SUPPLIER_EVALUATOR_MAX_REASON_COUNT = 10;

const supplierEvaluatorResponseSchema = z.object({
  sameProduct: z.boolean(),
  imageMatch: z.boolean().nullable().optional().default(null),
  titleMatch: z.boolean().nullable().optional().default(null),
  confidence: z.preprocess(
    (value) => {
      const parsed =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim().length > 0
            ? Number(value)
            : Number.NaN;
      if (!Number.isFinite(parsed)) {
        return Number.NaN;
      }
      if (parsed > 1 && parsed <= 100) {
        return parsed / 100;
      }
      return parsed;
    },
    z.number().min(0).max(1)
  ),
  proceed: z.boolean(),
  reasons: z.array(z.string().trim().min(1).max(500)).max(SUPPLIER_EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatches: z
    .array(z.string().trim().min(1).max(500))
    .max(SUPPLIER_EVALUATOR_MAX_REASON_COUNT)
    .default([]),
});

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeTextList = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const next = readOptionalString(value);
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
};

const resolveArtifactFileNameByKey = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  artifactKey: string | null,
  mimePrefix: string
): string | null => {
  const normalizedKey = readOptionalString(artifactKey);
  if (!normalizedKey) {
    return null;
  }
  const artifact = (Array.isArray(run.artifacts) ? run.artifacts : []).find((entry) => {
    const artifactPath = entry.path || '';
    const baseName = readOptionalString(path.basename(artifactPath, path.extname(artifactPath)));
    return (
      entry.mimeType?.startsWith(mimePrefix) === true &&
      (entry.name === normalizedKey || baseName === normalizedKey)
    );
  });
  if (!artifact?.path) {
    return null;
  }
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

const createSupplierEvaluation = (
  input: Omit<NonNullableProductScanSupplierEvaluation, 'evaluatedAt'> & {
    evaluatedAt?: string | null;
  }
): ProductScanSupplierEvaluation => ({
  ...input,
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});

export const evaluate1688SupplierCandidateMatch = async (input: {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: SupplierScanRuntimeResult;
  run: Pick<PlaywrightEngineRunRecord, 'runId' | 'artifacts'>;
  evaluatorConfig: Extract<ProductScanner1688CandidateEvaluatorResolvedConfig, { enabled: true }>;
}): Promise<ProductScanSupplierEvaluation> => {
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

  const productImageSource = resolveProductImageSources(input.scan, input.product)[0] ?? null;
  if (!productImageSource) {
    return createSupplierEvaluation({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      titleMatch: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      error: '1688 candidate evaluator could not load a source product image.',
    });
  }

  const productImageDataUrl = await loadProductScanImageSourceAsDataUrl(productImageSource).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-scan-1688-evaluator',
      action: 'loadProductImage',
      productId: input.product.id,
      source: productImageSource,
    });
    return null;
  });
  if (!productImageDataUrl) {
    return createSupplierEvaluation({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      titleMatch: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      error: '1688 candidate evaluator could not read the source product image.',
    });
  }

  const screenshotArtifactName = resolveArtifactFileNameByKey(
    input.run,
    readOptionalString(input.parsedResult.supplierProbe?.artifactKey),
    'image/'
  );
  if (!screenshotArtifactName) {
    return createSupplierEvaluation({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      titleMatch: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      error: '1688 candidate evaluator could not find the supplier page screenshot artifact.',
    });
  }

  const screenshotArtifact = await readPlaywrightEngineArtifact({
    runId: input.run.runId,
    fileName: screenshotArtifactName,
  }).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-scan-1688-evaluator',
      action: 'readSupplierScreenshotArtifact',
      productId: input.product.id,
      fileName: screenshotArtifactName,
    });
    return null;
  });
  if (!screenshotArtifact) {
    return createSupplierEvaluation({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      titleMatch: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      error: '1688 candidate evaluator could not read the supplier page screenshot artifact.',
    });
  }

  const heroImageSource =
    readOptionalString(input.parsedResult.supplierProbe?.heroImageUrl) ??
    readOptionalString(input.parsedResult.supplierDetails?.images?.[0]?.url);
  const heroImageDataUrl = heroImageSource
    ? await loadProductScanImageSourceAsDataUrl(heroImageSource).catch((error) => {
        void ErrorSystem.captureException(error, {
          service: 'product-scan-1688-evaluator',
          action: 'loadSupplierHeroImage',
          productId: input.product.id,
          source: heroImageSource,
        });
        return null;
      })
    : null;

  const sourceProductName = resolveSourceProductName(input.product, input.scan);
  const sourceProductDescription = resolveSourceProductDescription(input.product);
  const supplierDetails = input.parsedResult.supplierDetails;
  const supplierProbe = input.parsedResult.supplierProbe;

  const promptPayload = {
    sourceProduct: {
      name: sourceProductName,
      description: sourceProductDescription,
      ean: readOptionalString(input.product.ean),
      gtin: readOptionalString(input.product.gtin),
      supplierName: readOptionalString(input.product.supplierName),
      supplierLink: readOptionalString(input.product.supplierLink),
    },
    supplierCandidate: {
      url:
        readOptionalString(supplierProbe?.canonicalUrl) ??
        readOptionalString(supplierProbe?.candidateUrl) ??
        readOptionalString(input.parsedResult.url),
      title: readOptionalString(supplierProbe?.pageTitle) ?? readOptionalString(input.parsedResult.title),
      description:
        readOptionalString(supplierProbe?.descriptionSnippet) ??
        readOptionalString(input.parsedResult.description),
      supplierName: readOptionalString(supplierDetails?.supplierName) ?? readOptionalString(supplierProbe?.supplierName),
      supplierStoreUrl:
        readOptionalString(supplierDetails?.supplierStoreUrl) ??
        readOptionalString(supplierProbe?.supplierStoreUrl),
      priceText: readOptionalString(supplierDetails?.priceText) ?? readOptionalString(supplierProbe?.priceText),
      priceRangeText: readOptionalString(supplierDetails?.priceRangeText),
      moqText: readOptionalString(supplierDetails?.moqText),
      currency: readOptionalString(supplierDetails?.currency) ?? readOptionalString(supplierProbe?.currency),
      platformProductId: readOptionalString(supplierDetails?.platformProductId),
      supplierLocation: readOptionalString(supplierDetails?.supplierLocation),
      sourceLanguage:
        readOptionalString(supplierDetails?.sourceLanguage) ?? readOptionalString(supplierProbe?.pageLanguage),
      heuristicEvaluation: input.parsedResult.supplierEvaluation,
    },
    responseContract: {
      sameProduct: 'boolean',
      imageMatch: 'boolean | null',
      titleMatch: 'boolean | null',
      confidence: 'number between 0 and 1',
      proceed: 'boolean',
      reasons: 'string[]',
      mismatches: 'string[]',
    },
  };

  try {
    const userContent: ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: [
          'Compare the source product and the 1688 supplier candidate.',
          'The first image is the source product image from the app.',
          heroImageDataUrl
            ? 'The second image is the supplier hero image from the 1688 page.'
            : null,
          heroImageDataUrl
            ? 'The third image is the supplier page screenshot.'
            : 'The second image is the supplier page screenshot.',
          JSON.stringify(promptPayload, null, 2),
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
      buildProductScanImagePart(productImageDataUrl),
    ];
    if (heroImageDataUrl) {
      userContent.push(buildProductScanImagePart(heroImageDataUrl));
    }
    userContent.push(
      buildProductScanImagePart(
        productScanBufferToDataUrl(
          screenshotArtifact.content,
          readOptionalString(screenshotArtifact.artifact.mimeType) ?? 'image/png'
        )
      )
    );

    const completion = await runBrainChatCompletion({
      modelId: input.evaluatorConfig.modelId,
      temperature: 0.1,
      maxTokens: 500,
      jsonMode: true,
      messages: [
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
          content: userContent,
        },
      ],
    });

    if (!PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS.has(completion.vendor)) {
      return createSupplierEvaluation({
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        titleMatch: null,
        confidence: null,
        proceed: false,
        reasons: [],
        mismatches: [],
        modelId: completion.modelId,
        error:
          '1688 candidate evaluator selected a runtime that does not support image inputs in this flow.',
      });
    }

    const parsed = supplierEvaluatorResponseSchema.parse(JSON.parse(completion.text) as unknown);
    const approved =
      parsed.proceed &&
      parsed.sameProduct &&
      parsed.imageMatch !== false &&
      parsed.titleMatch !== false &&
      parsed.confidence >= input.evaluatorConfig.threshold;

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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '1688 candidate evaluator failed.';
    return createSupplierEvaluation({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      titleMatch: null,
      confidence: null,
      proceed: false,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      error: message,
    });
  }
};
