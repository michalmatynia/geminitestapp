import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  statMock: vi.fn(),
  readPlaywrightEngineRunMock: vi.fn(),
  readPlaywrightEngineArtifactMock: vi.fn(),
  collectPlaywrightEngineRunFailureMessagesMock: vi.fn(),
  buildPlaywrightEngineRunFailureMetaMock: vi.fn(),
  resolvePlaywrightEngineRunOutputsMock: vi.fn(),
  startPlaywrightEngineTaskMock: vi.fn(),
  startPlaywrightConnectionEngineTaskMock: vi.fn(),
  createCustomPlaywrightInstanceMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  get1688DefaultConnectionIdMock: vi.fn(),
  invalidateProductMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateProductMock: vi.fn(),
  findLatestActiveProductScanMock: vi.fn(),
  getProductScanByIdMock: vi.fn(),
  listProductScansMock: vi.fn(),
  updateProductScanMock: vi.fn(),
  upsertProductScanMock: vi.fn(),
  getProductScannerSettingsMock: vi.fn(),
  resolveProductScannerHeadlessMock: vi.fn(),
  buildProductScannerEngineRequestOptionsMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorConfigMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock: vi.fn().mockResolvedValue({ enabled: true }),
  resolveProductScannerAmazonCandidateEvaluatorTriageConfigMock: vi.fn().mockResolvedValue({ enabled: true }),
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock: vi.fn(),
  resolveProductScanner1688CandidateEvaluatorConfigMock: vi.fn(),
  resolveBrainExecutionConfigForCapabilityMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  evaluate1688SupplierCandidateMatchMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/runtime-fs', () => ({
  getFsPromises: () => ({
    stat: (...args: unknown[]) => mocks.statMock(...args),
  }),
}));

vi.mock('@/features/playwright/server', () => ({
  buildPlaywrightEngineRunFailureMeta: (...args: unknown[]) =>
    mocks.buildPlaywrightEngineRunFailureMetaMock(...args),
  collectPlaywrightEngineRunFailureMessages: (...args: unknown[]) =>
    mocks.collectPlaywrightEngineRunFailureMessagesMock(...args),
  createCustomPlaywrightInstance: (...args: unknown[]) =>
    mocks.createCustomPlaywrightInstanceMock(...args),
  readPlaywrightEngineArtifact: (...args: unknown[]) =>
    mocks.readPlaywrightEngineArtifactMock(...args),
  readPlaywrightEngineRun: (...args: unknown[]) => mocks.readPlaywrightEngineRunMock(...args),
  resolvePlaywrightEngineRunOutputs: (...args: unknown[]) =>
    mocks.resolvePlaywrightEngineRunOutputsMock(...args),
  startPlaywrightConnectionEngineTask: (...args: unknown[]) =>
    mocks.startPlaywrightConnectionEngineTaskMock(...args),
  startPlaywrightEngineTask: (...args: unknown[]) => mocks.startPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: (...args: unknown[]) => mocks.getIntegrationRepositoryMock(...args),
  get1688DefaultConnectionId: (...args: unknown[]) =>
    mocks.get1688DefaultConnectionIdMock(...args),
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: (...args: unknown[]) => mocks.invalidateProductMock(...args),
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

vi.mock('./product-scans-repository', () => ({
  findLatestActiveProductScan: (...args: unknown[]) =>
    mocks.findLatestActiveProductScanMock(...args),
  getProductScanById: (...args: unknown[]) => mocks.getProductScanByIdMock(...args),
  listProductScans: (...args: unknown[]) => mocks.listProductScansMock(...args),
  updateProductScan: (...args: unknown[]) => mocks.updateProductScanMock(...args),
  upsertProductScan: (...args: unknown[]) => mocks.upsertProductScanMock(...args),
}));

vi.mock('./product-scanner-settings', () => ({
  getProductScannerSettings: (...args: unknown[]) =>
    mocks.getProductScannerSettingsMock(...args),
  resolveProductScannerHeadless: (...args: unknown[]) =>
    mocks.resolveProductScannerHeadlessMock(...args),
  buildProductScannerEngineRequestOptions: (...args: unknown[]) =>
    mocks.buildProductScannerEngineRequestOptionsMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorTriageConfigMock(...args),
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfig: (...args: unknown[]) =>
    mocks.resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock(...args),
  resolveProductScanner1688CandidateEvaluatorConfig: (...args: unknown[]) =>
    mocks.resolveProductScanner1688CandidateEvaluatorConfigMock(...args),
}));

vi.mock('./product-scan-1688-evaluator', () => ({
  evaluate1688SupplierCandidateMatch: (...args: unknown[]) =>
    mocks.evaluate1688SupplierCandidateMatchMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: (...args: unknown[]) =>
    mocks.resolveBrainExecutionConfigForCapabilityMock(...args),
}));

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  queue1688BatchProductScans,
  queueAmazonBatchProductScans,
  synchronizeProductScan,
} from './product-scans-service';

const createScan = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan-1',
  productId: 'product-1',
  provider: 'amazon',
  scanType: 'google_reverse_image',
  status: 'queued',
  productName: 'Product 1',
  engineRunId: 'run-1',
  imageCandidates: [
    {
      id: 'image-1',
      filepath: '/tmp/product-1.jpg',
      url: 'https://cdn.example.com/product-1.jpg',
      filename: 'product-1.jpg',
    },
  ],
  matchedImageId: null,
  asin: null,
  title: null,
  price: null,
  url: null,
  description: null,
  amazonDetails: null,
  amazonProbe: null,
  amazonEvaluation: null,
  supplierDetails: null,
  supplierProbe: null,
  supplierEvaluation: null,
  steps: [],
  rawResult: null,
  error: null,
  asinUpdateStatus: 'pending',
  asinUpdateMessage: null,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  completedAt: null,
  createdAt: '2026-04-11T04:00:00.000Z',
  updatedAt: '2026-04-11T04:00:00.000Z',
  ...overrides,
});

describe('product-scans-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('continues with the next Amazon candidate after a probe-stage AI rejection', async () => {
    const scan = createScan({
      status: 'running',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test123',
        title: 'Wrong Amazon title',
        price: null,
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Wrong Amazon description snippet',
        candidateUrls: [
          'https://www.amazon.com/dp/B00TEST123',
          'https://www.amazon.com/dp/B00TEST456',
          'https://www.amazon.com/dp/B00TEST789',
        ],
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test123',
          pageTitle: 'Wrong Amazon title',
          descriptionSnippet: 'Wrong Amazon description snippet',
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
          heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageAlt: 'Wrong product',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          bulletPoints: ['Wrong bullet'],
          bulletCount: 1,
          attributeCount: 1,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T04:04:00.000Z',
            completedAt: '2026-04-11T04:04:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockImplementation(async ({ fileName }) => {
      if (fileName === 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png') {
        return {
          artifact: {
            name: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero',
            path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
          content: Buffer.from('amazon-hero-screenshot'),
        };
      }

      return {
        artifact: {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from('amazon-screenshot'),
      };
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.21,
        proceed: false,
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['Title and image do not match.'],
      }),
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-2',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(1);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            directAmazonCandidateUrl: 'https://www.amazon.com/dp/B00TEST456',
            directAmazonCandidateUrls: [
              'https://www.amazon.com/dp/B00TEST456',
              'https://www.amazon.com/dp/B00TEST789',
            ],
            directMatchedImageId: 'image-1',
            directAmazonCandidateRank: 2,
            probeOnlyOnAmazonMatch: true,
            skipAmazonProbe: false,
          }),
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-2',
        url: 'https://www.amazon.com/dp/B00TEST456',
        amazonProbe: expect.objectContaining({
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        }),
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
          proceed: false,
        }),
      })
    );
  });

  it('continues with the next Amazon candidate after rejecting non-English page content', async () => {
    const scan = createScan({
      status: 'running',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          path: 'run-1/amazon-scan-probe-image-1-attempt-1-rank-1.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test123',
        title: 'Matching Amazon title',
        price: null,
        url: 'https://www.amazon.de/dp/B00TEST123',
        description: 'Matching Amazon description snippet',
        candidateUrls: [
          'https://www.amazon.de/dp/B00TEST123',
          'https://www.amazon.com/dp/B00TEST456',
        ],
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test123',
          pageTitle: 'Matching Amazon title',
          descriptionSnippet: 'Matching Amazon description snippet',
          pageLanguage: 'de',
          pageLanguageSource: 'html_lang',
          marketplaceDomain: 'amazon.de',
          candidateUrl: 'https://www.amazon.de/dp/B00TEST123',
          canonicalUrl: 'https://www.amazon.de/dp/B00TEST123',
          heroImageUrl: null,
          heroImageAlt: null,
          heroImageArtifactName: null,
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
          bulletPoints: ['Produktbeschreibung'],
          bulletCount: 1,
          attributeCount: 0,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.de/dp/B00TEST123',
            startedAt: '2026-04-11T04:04:00.000Z',
            completedAt: '2026-04-11T04:04:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.de/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-2',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-2',
        url: 'https://www.amazon.com/dp/B00TEST456',
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
          languageAccepted: false,
          pageLanguage: 'de',
        }),
      })
    );
  });

  it('preserves rejected Amazon candidate evaluation history across multiple continuations', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-2',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
      rawResult: {
        runId: 'run-2',
        candidateRejectedByAi: true,
        candidateContinuation: true,
        continuationCandidateUrls: [
          'https://www.amazon.com/dp/B00TEST456',
          'https://www.amazon.com/dp/B00TEST789',
        ],
      },
      amazonProbe: {
        asin: 'b00test123',
        pageTitle: 'Wrong Amazon title',
        descriptionSnippet: 'Wrong Amazon description snippet',
        candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
        canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
        heroImageUrl: 'data:image/jpeg;base64,QUJDREVGRw==',
        heroImageAlt: 'Wrong product',
        heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
        artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
        bulletPoints: ['Wrong bullet'],
        bulletCount: 1,
        attributeCount: 1,
      },
      amazonEvaluation: {
        status: 'rejected',
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.21,
        proceed: false,
        threshold: 0.85,
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['Title and image do not match.'],
        modelId: 'gpt-4o',
        brainApplied: {
          capability: 'product.scan.amazon_candidate_match',
        },
        evidence: {
          candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
          pageTitle: 'Wrong Amazon title',
          heroImageSource: 'data:image/jpeg;base64,QUJDREVGRw==',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
          screenshotArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1.png',
          htmlArtifactName: null,
          productImageSource: 'data:image/jpeg;base64,QUJD',
        },
        error: null,
        evaluatedAt: '2026-04-11T04:04:05.000Z',
      },
      steps: [
        {
          key: 'amazon_probe',
          label: 'Probe Amazon product page',
          group: 'amazon',
          attempt: 1,
          candidateId: 'image-1',
          candidateRank: 1,
          inputSource: null,
          retryOf: null,
          resultCode: 'probe_ready',
          status: 'completed',
          message: 'Collected Amazon candidate page evidence before extraction.',
          warning: null,
          details: [],
          url: 'https://www.amazon.com/dp/B00TEST123',
          startedAt: '2026-04-11T04:04:00.000Z',
          completedAt: '2026-04-11T04:04:03.000Z',
          durationMs: 3000,
        },
        {
          key: 'amazon_ai_evaluate',
          label: 'Evaluate Amazon candidate match',
          group: 'amazon',
          attempt: 1,
          candidateId: 'image-1',
          candidateRank: 1,
          inputSource: null,
          retryOf: null,
          resultCode: 'candidate_rejected',
          status: 'failed',
          message: 'AI evaluator rejected the Amazon candidate (21%).',
          warning: null,
          details: [
            { label: 'Model', value: 'gpt-4o' },
            { label: 'Confidence', value: '21%' },
            { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
            { label: 'Reason', value: 'The Amazon page shows a different product.' },
            { label: 'Mismatch', value: 'Title and image do not match.' },
          ],
          url: 'https://www.amazon.com/dp/B00TEST123',
          startedAt: '2026-04-11T04:04:04.000Z',
          completedAt: '2026-04-11T04:04:05.000Z',
          durationMs: 1000,
        },
        {
          key: 'queue_scan',
          label: 'Continue with next Amazon candidate',
          group: 'input',
          attempt: 2,
          candidateId: null,
          candidateRank: null,
          inputSource: null,
          retryOf: null,
          resultCode: 'run_queued',
          status: 'completed',
          message: 'Queued the next Amazon candidate after AI rejection.',
          warning: null,
          details: [
            { label: 'Rejected candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
            { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
          ],
          url: 'https://www.amazon.com/dp/B00TEST456',
          startedAt: '2026-04-11T04:04:05.500Z',
          completedAt: '2026-04-11T04:04:05.500Z',
          durationMs: 0,
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-2',
      status: 'completed',
      completedAt: '2026-04-11T04:06:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-2-hero',
          path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2-hero.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-2',
          path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'probe_ready',
        asin: 'b00test456',
        title: 'Still wrong Amazon title',
        price: null,
        url: 'https://www.amazon.com/dp/B00TEST456',
        description: 'Still wrong Amazon description snippet',
        candidateUrls: [
          'https://www.amazon.com/dp/B00TEST456',
          'https://www.amazon.com/dp/B00TEST789',
        ],
        amazonDetails: null,
        amazonProbe: {
          asin: 'b00test456',
          pageTitle: 'Still wrong Amazon title',
          descriptionSnippet: 'Still wrong Amazon description snippet',
          candidateUrl: 'https://www.amazon.com/dp/B00TEST456',
          canonicalUrl: 'https://www.amazon.com/dp/B00TEST456',
          heroImageUrl: 'data:image/jpeg;base64,SElKS0w=',
          heroImageAlt: 'Still wrong product',
          heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-2-hero.png',
          artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-2',
          bulletPoints: ['Still wrong bullet'],
          bulletCount: 1,
          attributeCount: 1,
        },
        matchedImageId: 'image-1',
        steps: [
          {
            key: 'amazon_probe',
            label: 'Probe Amazon product page',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-1',
            candidateRank: 2,
            inputSource: null,
            retryOf: null,
            resultCode: 'probe_ready',
            status: 'completed',
            message: 'Collected Amazon candidate page evidence before extraction.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T04:05:00.000Z',
            completedAt: '2026-04-11T04:05:03.000Z',
            durationMs: 3000,
          },
        ],
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST456',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockImplementation(async ({ fileName }) => {
      if (fileName === 'amazon-scan-probe-image-1-attempt-1-rank-2-hero.png') {
        return {
          artifact: {
            name: 'amazon-scan-probe-image-1-attempt-1-rank-2-hero',
            path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2-hero.png',
            mimeType: 'image/png',
            kind: 'screenshot',
          },
          content: Buffer.from('amazon-hero-screenshot-2'),
        };
      }

      return {
        artifact: {
          name: 'amazon-scan-probe-image-1-attempt-1-rank-2',
          path: 'run-2/amazon-scan-probe-image-1-attempt-1-rank-2.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from('amazon-screenshot-2'),
      };
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.17,
        proceed: false,
        reasons: ['The second Amazon page is still a different product.'],
        mismatches: ['Brand and bullets do not match.'],
      }),
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-3',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(result).toEqual(
      expect.objectContaining({
        status: 'queued',
        engineRunId: 'run-3',
        url: 'https://www.amazon.com/dp/B00TEST789',
      })
    );

    const evaluationSteps = result.steps.filter((step) => step.key === 'amazon_ai_evaluate');
    expect(evaluationSteps).toHaveLength(2);
    expect(
      evaluationSteps.map((step) => ({
        attempt: step.attempt,
        candidateRank: step.candidateRank,
        url: step.url,
        resultCode: step.resultCode,
      }))
    ).toEqual([
      {
        attempt: 1,
        candidateRank: 1,
        url: 'https://www.amazon.com/dp/B00TEST123',
        resultCode: 'candidate_rejected',
      },
      {
        attempt: 2,
        candidateRank: 2,
        url: 'https://www.amazon.com/dp/B00TEST456',
        resultCode: 'candidate_rejected',
      },
    ]);

    const continuationQueueSteps = result.steps.filter((step) => step.key === 'queue_scan');
    expect(continuationQueueSteps.map((step) => step.attempt)).toEqual([2, 3]);
    expect(continuationQueueSteps[1]).toEqual(
      expect.objectContaining({
        attempt: 3,
        url: 'https://www.amazon.com/dp/B00TEST789',
      })
    );
  });

  it('turns a matched Amazon candidate into no_match when the AI evaluator rejects it', async () => {
    const scan = createScan({
      imageCandidates: [
        {
          id: 'image-1',
          filepath: null,
          url: 'data:image/jpeg;base64,QUJD',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      artifacts: [
        {
          name: 'amazon-scan-match',
          path: 'run-1/amazon-scan-match.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      result: { outputs: {} },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'b00test123',
        title: 'Wrong Amazon product',
        price: '$19.99',
        url: 'https://www.amazon.com/dp/B00TEST123',
        description: 'Wrong description',
        amazonDetails: {
          brand: 'Other Brand',
          bulletPoints: ['Different item'],
          attributes: [],
          rankings: [],
        },
        matchedImageId: 'image-1',
      },
      finalUrl: 'https://www.amazon.com/dp/B00TEST123',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      ean: null,
      gtin: null,
      name_en: 'Product 1',
      description_en: 'Product 1 description',
      images: [],
      imageLinks: [],
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: true,
      mode: 'brain_default',
      threshold: 0.85,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      modelId: 'gpt-4o',
      systemPrompt: 'Judge the Amazon page conservatively.',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
      },
    });
    mocks.readPlaywrightEngineArtifactMock.mockResolvedValue({
      artifact: {
        name: 'amazon-scan-match',
        path: 'run-1/amazon-scan-match.png',
        mimeType: 'image/png',
        kind: 'screenshot',
      },
      content: Buffer.from('amazon-screenshot'),
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4o',
      text: JSON.stringify({
        sameProduct: false,
        imageMatch: false,
        descriptionMatch: false,
        pageRepresentsSameProduct: false,
        confidence: 0.24,
        proceed: false,
        reasons: ['The Amazon page shows a different product.'],
        mismatches: ['Brand and visible image do not match.'],
      }),
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'no_match',
        asin: null,
        title: null,
        url: null,
        amazonDetails: null,
        asinUpdateStatus: 'not_needed',
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
          proceed: false,
        }),
        steps: expect.arrayContaining([
          expect.objectContaining({
            key: 'amazon_ai_evaluate',
            status: 'failed',
            resultCode: 'candidate_rejected',
            details: expect.arrayContaining([
              { label: 'Model source', value: 'AI Brain default' },
              { label: 'Threshold', value: '85%' },
              { label: 'Evaluation scope', value: 'Every Amazon candidate' },
              { label: 'Allowed content language', value: 'English' },
              { label: 'Language policy', value: 'Reject non-English content' },
              { label: 'Language detection', value: 'Deterministic first, then AI' },
            ]),
          }),
          expect.objectContaining({
            key: 'product_asin_update',
            status: 'skipped',
            resultCode: 'asin_not_needed',
          }),
        ]),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'no_match',
        amazonEvaluation: expect.objectContaining({
          status: 'rejected',
        }),
      })
    );
  });
});
