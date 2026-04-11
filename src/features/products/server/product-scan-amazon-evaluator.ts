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
  ProductScanAmazonEvaluation,
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
import type { AmazonScanScriptResult } from './product-scans-service.helpers';

const EVALUATOR_MAX_REASON_COUNT = 10;
const SUPPORTED_IMAGE_RUNTIME_VENDORS = new Set(['openai', 'ollama']);

const normalizeConfidenceInput = (value: unknown): number => {
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
};

const amazonEvaluatorResponseSchema = z.object({
  sameProduct: z.boolean(),
  imageMatch: z.boolean().nullable().optional().default(null),
  descriptionMatch: z.boolean().nullable().optional().default(null),
  pageRepresentsSameProduct: z.boolean(),
  confidence: z.preprocess(
    normalizeConfidenceInput,
    z.number().min(0).max(1)
  ),
  proceed: z.boolean(),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatches: z
    .array(z.string().trim().min(1).max(500))
    .max(EVALUATOR_MAX_REASON_COUNT)
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

const normalizeIdentifier = (value: unknown): string | null =>
  readOptionalString(value)?.replace(/\s+/g, '').toUpperCase() ?? null;

const toDataUrl = (content: Buffer, mimeType: string): string =>
  `data:${mimeType};base64,${content.toString('base64')}`;

const readLocalImageAsDataUrl = async (source: string): Promise<string | null> => {
  const candidates = [source];
  if (!path.isAbsolute(source)) {
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
  if (!response.ok) {
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
  if (/^https?:\/\//i.test(source)) {
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
  if (!artifact?.path) {
    return null;
  }
  const fileName = path.basename(artifact.path);
  return fileName.trim().length > 0 ? fileName : null;
};

const resolveArtifactFileNameByKey = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>,
  artifactKey: string | null,
  matcher: (artifact: PlaywrightEngineRunRecord['artifacts'][number]) => boolean
): string | null => {
  const normalizedKey = readOptionalString(artifactKey);
  if (!normalizedKey) {
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
        (artifact.name === 'amazon-scan-match' || artifact.path.includes('amazon-scan-match'))
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
        (artifact.name === 'amazon-scan-match' || artifact.path.includes('amazon-scan-match'))
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
  parsedResult: AmazonScanScriptResult
): string[] => {
  const reasons: string[] = [];
  const productAsin = normalizeIdentifier(product.asin);
  const detectedAsin = normalizeIdentifier(parsedResult.asin);
  if (productAsin && detectedAsin && productAsin === detectedAsin) {
    reasons.push(`Existing ASIN ${productAsin} matches the Amazon candidate.`);
  }

  const productEan = normalizeIdentifier(product.ean);
  const productGtin = normalizeIdentifier(product.gtin);
  const candidateIdentifiers = [
    normalizeIdentifier(parsedResult.amazonDetails?.ean),
    normalizeIdentifier(parsedResult.amazonDetails?.gtin),
    normalizeIdentifier(parsedResult.amazonDetails?.upc),
    normalizeIdentifier(parsedResult.amazonDetails?.isbn),
  ].filter((value): value is string => Boolean(value));

  if (productEan && candidateIdentifiers.includes(productEan)) {
    reasons.push(`Existing EAN ${productEan} matches the Amazon candidate.`);
  }
  if (productGtin && candidateIdentifiers.includes(productGtin)) {
    reasons.push(`Existing GTIN ${productGtin} matches the Amazon candidate.`);
  }

  return reasons;
};

const createEvaluationResult = (
  input: Omit<ProductScanAmazonEvaluation, 'evaluatedAt'> & {
    evaluatedAt?: string | null;
  }
): ProductScanAmazonEvaluation => ({
  ...input,
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});

export const evaluateAmazonScanCandidateMatch = async (input: {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: AmazonScanScriptResult;
  run: Pick<PlaywrightEngineRunRecord, 'runId' | 'artifacts'>;
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
}): Promise<ProductScanAmazonEvaluation> => {
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
    productImageSource: null,
  };

  const deterministicReasons = buildDeterministicMatchReasons(input.product, input.parsedResult);
  if (
    input.evaluatorConfig.onlyForAmbiguousCandidates &&
    deterministicReasons.length > 0
  ) {
    return createEvaluationResult({
      status: 'skipped',
      sameProduct: true,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: true,
      confidence: 1,
      proceed: true,
      threshold: input.evaluatorConfig.threshold,
      reasons: deterministicReasons,
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
      error: null,
    });
  }

  const productImageSources = resolveProductImageSources(input.scan, input.product);
  const productImageSource = productImageSources[0] ?? null;
  evidence.productImageSource = productImageSource;

  const screenshotArtifactName = evidenceArtifacts.screenshotArtifactName;
  if (!productImageSource) {
    return createEvaluationResult({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      threshold: input.evaluatorConfig.threshold,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
      error: 'Amazon candidate AI evaluation could not load a source product image.',
    });
  }
  if (!screenshotArtifactName) {
    return createEvaluationResult({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      threshold: input.evaluatorConfig.threshold,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
      error: 'Amazon candidate AI evaluation could not find the Amazon page screenshot artifact.',
    });
  }

  const productImageDataUrl = await loadImageSourceAsDataUrl(productImageSource).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-scan-amazon-evaluator',
      action: 'loadProductImage',
      productId: input.product.id,
      source: productImageSource,
    });
    return null;
  });
  if (!productImageDataUrl) {
    return createEvaluationResult({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      threshold: input.evaluatorConfig.threshold,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
      error: 'Amazon candidate AI evaluation could not load the source product image contents.',
    });
  }

  const heroImageArtifact = evidence.heroImageArtifactName
    ? await readPlaywrightEngineArtifact({
        runId: input.run.runId,
        fileName: evidence.heroImageArtifactName,
      }).catch((error) => {
        void ErrorSystem.captureException(error, {
          service: 'product-scan-amazon-evaluator',
          action: 'readAmazonHeroImageArtifact',
          productId: input.product.id,
          fileName: evidence.heroImageArtifactName,
        });
        return null;
      })
    : null;
  const heroImageDataUrl = heroImageArtifact
    ? toDataUrl(
        heroImageArtifact.content,
        readOptionalString(heroImageArtifact.artifact.mimeType) ?? 'image/png'
      )
    : evidence.heroImageSource
      ? await loadImageSourceAsDataUrl(evidence.heroImageSource).catch((error) => {
          void ErrorSystem.captureException(error, {
            service: 'product-scan-amazon-evaluator',
            action: 'loadAmazonHeroImage',
            productId: input.product.id,
            source: evidence.heroImageSource,
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
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      threshold: input.evaluatorConfig.threshold,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
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
    'Reject mismatches in brand, model, color, size, pack count, or major description conflicts.',
  ]
    .filter(Boolean)
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
    },
    responseContract: {
      sameProduct: 'boolean',
      imageMatch: 'boolean | null',
      descriptionMatch: 'boolean | null',
      pageRepresentsSameProduct: 'boolean',
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
          'Compare the source product and the Amazon page.',
          'The first image is the source product image from the app.',
          heroImageDataUrl
            ? 'The second image is the Amazon product hero image from the page.'
            : null,
          heroImageDataUrl
            ? 'The third image is the Amazon page screenshot.'
            : 'The second image is the Amazon page screenshot.',
          JSON.stringify(promptPayload, null, 2),
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
      buildImagePart(productImageDataUrl),
    ];
    if (heroImageDataUrl) {
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

    if (!SUPPORTED_IMAGE_RUNTIME_VENDORS.has(completion.vendor)) {
      return createEvaluationResult({
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        descriptionMatch: null,
        pageRepresentsSameProduct: null,
        confidence: null,
        proceed: false,
        threshold: input.evaluatorConfig.threshold,
        reasons: [],
        mismatches: [],
        modelId: completion.modelId,
        brainApplied: input.evaluatorConfig.brainApplied,
        evidence,
        error:
          'Amazon candidate AI evaluation selected a runtime that does not support image inputs in this scanner flow.',
      });
    }

    const rawJson = JSON.parse(completion.text) as unknown;
    const parsed = amazonEvaluatorResponseSchema.parse(rawJson);
    const approved =
      parsed.proceed &&
      parsed.sameProduct &&
      parsed.pageRepresentsSameProduct &&
      parsed.imageMatch !== false &&
      parsed.descriptionMatch !== false &&
      parsed.confidence >= input.evaluatorConfig.threshold;

    return createEvaluationResult({
      status: approved ? 'approved' : 'rejected',
      sameProduct: parsed.sameProduct,
      imageMatch: parsed.imageMatch,
      descriptionMatch: parsed.descriptionMatch,
      pageRepresentsSameProduct: parsed.pageRepresentsSameProduct,
      confidence: parsed.confidence,
      proceed: approved,
      threshold: input.evaluatorConfig.threshold,
      reasons: parsed.reasons,
      mismatches: parsed.mismatches,
      modelId: completion.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Amazon candidate AI evaluation failed.';
    return createEvaluationResult({
      status: 'failed',
      sameProduct: null,
      imageMatch: null,
      descriptionMatch: null,
      pageRepresentsSameProduct: null,
      confidence: null,
      proceed: false,
      threshold: input.evaluatorConfig.threshold,
      reasons: [],
      mismatches: [],
      modelId: input.evaluatorConfig.modelId,
      brainApplied: input.evaluatorConfig.brainApplied,
      evidence,
      error: message,
    });
  }
};
