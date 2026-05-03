import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  readPlaywrightEngineArtifactMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  fetchWithOutboundUrlPolicyMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', () => ({
  readPlaywrightEngineArtifact: (...args: unknown[]) =>
    mocks.readPlaywrightEngineArtifactMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
}));

vi.mock('@/shared/lib/security/outbound-url-policy', () => ({
  fetchWithOutboundUrlPolicy: (...args: unknown[]) =>
    mocks.fetchWithOutboundUrlPolicyMock(...args),
}));

vi.mock('@/shared/lib/files/file-uploader', () => ({
  getDiskPathFromPublicPath: (...args: unknown[]) =>
    mocks.getDiskPathFromPublicPathMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { evaluate1688SupplierCandidateMatch } from './product-scan-1688-evaluator';

const createScan = (): ProductScanRecord =>
  ({
    id: 'scan-1',
    productId: 'product-1',
    provider: '1688',
    scanType: 'supplier_reverse_image',
    status: 'running',
    productName: 'Supplier Product 1',
    engineRunId: 'run-1',
    imageCandidates: [
      {
        id: 'image-1',
        url: 'data:image/jpeg;base64,QUJD',
        filepath: null,
        filename: 'product-1.jpg',
      },
    ],
    matchedImageId: 'image-1',
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
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: null,
    createdBy: null,
    updatedBy: null,
    completedAt: null,
    createdAt: '2026-04-12T07:00:00.000Z',
    updatedAt: '2026-04-12T07:00:00.000Z',
  }) as ProductScanRecord;

const createProduct = () =>
  ({
    id: 'product-1',
    name_en: 'Supplier Product 1',
    description_en: 'Source product description',
    ean: null,
    gtin: null,
    supplierName: null,
    supplierLink: null,
    images: [],
    imageLinks: [],
  }) as never;

const createParsedResult = () =>
  ({
    status: 'matched',
    title: '1688 supplier listing',
    price: 'CN¥ 12.50-15.00',
    url: 'https://detail.1688.com/offer/123456789.html',
    description: 'Supplier description',
    supplierDetails: {
      supplierName: 'Yiwu Supplier Co.',
      supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
      supplierStoreUrl: 'https://shop.1688.com/page.html',
      currency: 'CNY',
      priceText: 'CN¥ 12.50-15.00',
      priceRangeText: 'CN¥ 12.50-15.00',
      moqText: '2 pcs',
      sourceLanguage: 'zh-CN',
      images: [],
      prices: [],
    },
    supplierProbe: {
      candidateUrl: 'https://detail.1688.com/offer/123456789.html',
      canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
      pageTitle: '1688 Probe Title',
      descriptionSnippet: 'Probe description',
      pageLanguage: 'zh-CN',
      supplierName: 'Yiwu Supplier Co.',
      supplierStoreUrl: 'https://shop.1688.com/page.html',
      priceText: 'CN¥ 12.50-15.00',
      currency: 'CNY',
      heroImageUrl: null,
      heroImageAlt: null,
      heroImageArtifactName: null,
      artifactKey: '1688-scan-probe-image-1-rank-1',
      imageCount: 1,
    },
    supplierEvaluation: {
      status: 'approved',
      sameProduct: true,
      imageMatch: true,
      titleMatch: true,
      confidence: 0.95,
      proceed: true,
      reasons: ['Heuristic match is already strong.'],
      mismatches: [],
      modelId: 'heuristic_1688_probe_v1',
      error: null,
      evaluatedAt: '2026-04-12T07:00:00.000Z',
    },
    candidateUrls: ['https://detail.1688.com/offer/123456789.html'],
    matchedImageId: 'image-1',
    message: 'Matched supplier candidate.',
    currentUrl: 'https://detail.1688.com/offer/123456789.html',
    stage: 'supplier_extract',
    steps: [],
  }) as const;

const enabledEvaluatorConfig = {
  enabled: true as const,
  mode: 'brain_default' as const,
  threshold: 0.8,
  onlyForAmbiguousCandidates: true,
  modelId: 'gpt-4.1-mini',
  systemPrompt: 'Supplier evaluator prompt',
  brainApplied: {
    capability: 'product.scan.1688_supplier_match',
    runtimeKind: 'vision',
  },
};

describe('evaluate1688SupplierCandidateMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDiskPathFromPublicPathMock.mockImplementation((value: string) => value);
  });

  it('skips AI evaluation when the heuristic supplier match is already strong enough', async () => {
    const result = await evaluate1688SupplierCandidateMatch({
      scan: createScan(),
      product: createProduct(),
      parsedResult: createParsedResult(),
      run: {
        runId: 'run-1',
        artifacts: [],
      },
      evaluatorConfig: enabledEvaluatorConfig,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'skipped',
        proceed: true,
        modelId: 'gpt-4.1-mini',
      })
    );
    expect(mocks.runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(mocks.readPlaywrightEngineArtifactMock).not.toHaveBeenCalled();
  });

  it('fails when there is no source product image available', async () => {
    const scan = {
      ...createScan(),
      imageCandidates: [],
    };
    const product = {
      ...createProduct(),
      imageLinks: [],
    };

    const result = await evaluate1688SupplierCandidateMatch({
      scan,
      product,
      parsedResult: {
        ...createParsedResult(),
        supplierEvaluation: {
          ...createParsedResult().supplierEvaluation,
          status: 'rejected',
          sameProduct: false,
          proceed: false,
          confidence: 0.4,
        },
      },
      run: {
        runId: 'run-1',
        artifacts: [],
      },
      evaluatorConfig: enabledEvaluatorConfig,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: '1688 candidate evaluator could not load a source product image.',
      })
    );
  });

  it('approves the supplier candidate when the AI response meets the threshold', async () => {
    mocks.readPlaywrightEngineArtifactMock.mockResolvedValue({
      artifact: {
        mimeType: 'image/png',
      },
      content: Buffer.from('png-bytes'),
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'openai',
      modelId: 'gpt-4.1-mini',
      text: JSON.stringify({
        sameProduct: true,
        imageMatch: true,
        titleMatch: true,
        confidence: 0.93,
        proceed: true,
        reasons: ['Supplier gallery matches the source product.'],
        mismatches: [],
      }),
    });

    const parsedResult = {
      ...createParsedResult(),
      supplierEvaluation: {
        ...createParsedResult().supplierEvaluation,
        status: 'rejected',
        sameProduct: false,
        proceed: false,
        confidence: 0.41,
      },
    };

    const result = await evaluate1688SupplierCandidateMatch({
      scan: createScan(),
      product: createProduct(),
      parsedResult,
      run: {
        runId: 'run-1',
        artifacts: [
          {
            name: '1688-scan-probe-image-1-rank-1',
            path: 'run-1/1688-scan-probe-image-1-rank-1.png',
            mimeType: 'image/png',
          },
        ],
      },
      evaluatorConfig: enabledEvaluatorConfig,
    });

    expect(mocks.readPlaywrightEngineArtifactMock).toHaveBeenCalledWith({
      runId: 'run-1',
      fileName: '1688-scan-probe-image-1-rank-1.png',
    });
    expect(mocks.runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gpt-4.1-mini',
        jsonMode: true,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'approved',
        sameProduct: true,
        imageMatch: true,
        titleMatch: true,
        confidence: 0.93,
        proceed: true,
        modelId: 'gpt-4.1-mini',
      })
    );
  });

  it('fails when the selected runtime does not support image inputs', async () => {
    mocks.readPlaywrightEngineArtifactMock.mockResolvedValue({
      artifact: {
        mimeType: 'image/png',
      },
      content: Buffer.from('png-bytes'),
    });
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      vendor: 'anthropic',
      modelId: 'claude-x',
      text: JSON.stringify({
        sameProduct: true,
        imageMatch: true,
        titleMatch: true,
        confidence: 0.93,
        proceed: true,
        reasons: ['Looks good.'],
        mismatches: [],
      }),
    });

    const parsedResult = {
      ...createParsedResult(),
      supplierEvaluation: {
        ...createParsedResult().supplierEvaluation,
        status: 'rejected',
        sameProduct: false,
        proceed: false,
        confidence: 0.41,
      },
    };

    const result = await evaluate1688SupplierCandidateMatch({
      scan: createScan(),
      product: createProduct(),
      parsedResult,
      run: {
        runId: 'run-1',
        artifacts: [
          {
            name: '1688-scan-probe-image-1-rank-1',
            path: 'run-1/1688-scan-probe-image-1-rank-1.png',
            mimeType: 'image/png',
          },
        ],
      },
      evaluatorConfig: enabledEvaluatorConfig,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        error:
          '1688 candidate evaluator selected a runtime that does not support image inputs in this flow.',
        modelId: 'claude-x',
      })
    );
  });
});
