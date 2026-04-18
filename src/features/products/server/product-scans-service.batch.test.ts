import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  statMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  readPlaywrightEngineRunMock: vi.fn(),
  readPlaywrightEngineArtifactMock: vi.fn(),
  collectPlaywrightEngineRunFailureMessagesMock: vi.fn(),
  buildPlaywrightConnectionEngineLaunchOptionsMock: vi.fn(),
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
  resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock: vi.fn(),
  resolveProductScanner1688CandidateEvaluatorConfigMock: vi.fn(),
  resolveSupplier1688SelectorRegistryNativeRuntimeMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  evaluate1688SupplierCandidateMatchMock: vi.fn(),
  resolveRuntimeActionDefinitionMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/runtime-fs', () => ({
  getFsPromises: () => ({
    stat: (...args: unknown[]) => mocks.statMock(...args),
    mkdir: (...args: unknown[]) => mocks.mkdirMock(...args),
    writeFile: (...args: unknown[]) => mocks.writeFileMock(...args),
  }),
}));

vi.mock('@/features/playwright/server', () => ({
  buildPlaywrightConnectionEngineLaunchOptions: (...args: unknown[]) =>
    mocks.buildPlaywrightConnectionEngineLaunchOptionsMock(...args),
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

vi.mock('@/features/integrations/services/supplier-1688-selector-registry', () => ({
  resolveSupplier1688SelectorRegistryNativeRuntime: (...args: unknown[]) =>
    mocks.resolveSupplier1688SelectorRegistryNativeRuntimeMock(...args),
  toSupplier1688SelectorRegistryResolutionSummary: (
    resolution: Record<string, unknown> | null | undefined
  ) =>
    resolution === null || resolution === undefined
      ? null
      : {
          requestedProfile: resolution.requestedProfile,
          resolvedProfile: resolution.resolvedProfile,
          sourceProfiles: resolution.sourceProfiles,
          entryCount: resolution.entryCount,
          overlayEntryCount: resolution.overlayEntryCount,
          fallbackToCode: resolution.fallbackToCode,
          fallbackReason: resolution.fallbackReason ?? null,
        },
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

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  resolveRuntimeActionDefinition: (...args: unknown[]) =>
    mocks.resolveRuntimeActionDefinitionMock(...args),
}));

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import {
  getPlaywrightRuntimeActionSeed,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
} from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';

import {
  queue1688BatchProductScans,
  queueAmazonBatchProductScans,
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

describe('product-scans-service batch operations', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    mocks.buildPlaywrightConnectionEngineLaunchOptionsMock.mockImplementation(
      ({ browserPreference }: { browserPreference: string }) =>
        browserPreference === 'chrome' ? { channel: 'chrome' } : {}
    );
    mocks.resolveRuntimeActionDefinitionMock.mockImplementation(async (runtimeKey: string) => {
      const seed = getPlaywrightRuntimeActionSeed(
        runtimeKey as Parameters<typeof getPlaywrightRuntimeActionSeed>[0]
      );
      if (seed === null) {
        throw new Error(`Unknown runtime action ${runtimeKey}`);
      }
      return seed;
    });
    mocks.statMock.mockResolvedValue({
      isFile: () => true,
      size: 1024,
    });
    mocks.mkdirMock.mockResolvedValue(undefined);
    mocks.writeFileMock.mockResolvedValue(undefined);
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: null,
      finalUrl: null,
    });
    mocks.createCustomPlaywrightInstanceMock.mockReturnValue({
      id: 'instance-1',
    });
    mocks.startPlaywrightConnectionEngineTaskMock.mockResolvedValue({
      run: {
        runId: 'run-connection-1688',
        status: 'queued',
      },
      runtime: {
        settings: {
          headless: true,
          identityProfile: 'marketplace',
        },
        browserPreference: 'brave',
        personaId: 'persona-1688',
      },
      settings: {
        headless: false,
        identityProfile: 'marketplace',
      },
      browserPreference: 'brave',
    });
    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: vi.fn(async () => [
        {
          id: 'integration-1688',
          slug: '1688',
          name: '1688',
        },
      ]),
      listConnections: vi.fn(async () => [
        {
          id: 'connection-1688',
          integrationId: 'integration-1688',
          name: '1688 Primary',
          scanner1688StartUrl: 'https://www.1688.com/',
          scanner1688LoginMode: 'session_required',
          scanner1688DefaultSearchMode: 'local_image',
          scanner1688CandidateResultLimit: 12,
          scanner1688MinimumCandidateScore: 6,
          scanner1688MaxExtractedImages: 9,
          scanner1688AllowUrlImageSearchFallback: false,
          playwrightStorageState: '{"cookies":[],"origins":[]}',
          playwrightPersonaId: 'persona-1688',
        },
      ]),
    });
    mocks.get1688DefaultConnectionIdMock.mockResolvedValue('connection-1688');
    mocks.resolveSupplier1688SelectorRegistryNativeRuntimeMock.mockResolvedValue({
      selectorRuntime: {
        fileInputSelectors: ['input[type="file"]'],
        imageSearchEntrySelectors: ['button:has-text("以图搜")'],
        searchResultReadySelectors: ['a[href*="/offer/"]'],
        supplierReadySelectors: ['h1'],
        submitSearchSelectors: ['button:has-text("搜图")'],
        loginTextHints: ['登录'],
        captchaTextHints: ['验证码'],
        accessBlockTextHints: ['访问受限'],
        barrierTitleHints: ['captcha'],
        hardBlockingSelectors: ['input[type="password"]'],
        softBlockingSelectors: ['iframe[src*="captcha"]'],
        searchBodySignalPattern: '搜索结果',
        supplierBodySignalPattern: '供应商',
        priceTextPatternSource: '(?:¥|￥)\\s*\\d+',
      },
      requestedProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
      resolvedProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
      sourceProfiles: [SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE, 'code'],
      entryCount: 14,
      overlayEntryCount: 0,
      fallbackToCode: false,
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({});
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightSettingsOverrides: {},
      amazonCandidateEvaluatorProbe: { mode: 'brain_default' },
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorConfigMock.mockResolvedValue({
      enabled: false,
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock.mockResolvedValue({
      enabled: true,
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(true);
  });

  it('returns already_running when an active scan is still running for the product', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
    });
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...activeScan,
        ...updates,
        id,
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
    });

    expect(result.alreadyRunning).toBe(1);
    expect(result.results[0]).toEqual({
      productId: 'product-1',
      scanId: 'scan-1',
      runId: 'run-1',
      status: 'already_running',
      currentStatus: 'running',
      message: 'Amazon candidate search running.',
    });
  });

  it('returns already_running with queued currentStatus when the existing scan is still queued', async () => {
    const activeScan = createScan({ status: 'queued' });

    mocks.findLatestActiveProductScanMock.mockResolvedValue(activeScan);
    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'queued',
    });

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
    });

    expect(result.alreadyRunning).toBe(1);
    expect(result.results[0]?.currentStatus).toBe('queued');
    expect(result.results[0]?.message).toBe('Amazon candidate search already in progress for this product.');
  });

  it('queues a new Amazon reverse-image scan with image candidates', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Test Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-new',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-new',
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(result.results[0]).toMatchObject({
      productId: 'product-1',
      scanId: expect.any(String),
      runId: 'run-new',
      status: 'queued',
    });
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          runtimeKey: 'amazon_google_lens_candidate_search',
          actionId: 'runtime_action__amazon_google_lens_candidate_search',
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Test Product',
            collectAmazonCandidatePreviews: true,
            imageCandidates: [
              expect.objectContaining({
                id: 'file-1',
                filepath: '/img.jpg',
                filename: 'img.jpg',
              }),
            ],
          }),
        }),
      })
    );
  });

  it('applies Amazon action runtime humanization and browser settings to the Playwright request', async () => {
    const seed = getPlaywrightRuntimeActionSeed(AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY);
    if (seed === null) {
      throw new Error('Expected Amazon Google Lens candidate search runtime seed');
    }
    mocks.resolveRuntimeActionDefinitionMock.mockResolvedValue({
      ...seed,
      personaId: 'action-persona-1',
      executionSettings: {
        ...seed.executionSettings,
        browserPreference: 'chromium',
        humanizeMouse: false,
        mouseJitter: 13,
        clickDelayMin: 21,
        clickDelayMax: 45,
        inputDelayMin: 7,
        inputDelayMax: 19,
        actionDelayMin: 100,
        actionDelayMax: 240,
        slowMo: 0,
      },
    });
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      playwrightSettingsOverrides: {},
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'scanner-persona',
      settingsOverrides: {
        humanizeMouse: true,
        mouseJitter: 1,
        slowMo: 80,
      },
      launchOptions: {
        channel: 'chrome',
        executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        args: ['--existing'],
      },
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Humanized Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-action-settings',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-action-settings',
      })
    );

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.resolveRuntimeActionDefinitionMock).toHaveBeenCalledWith(
      AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
    );
    expect(mocks.buildPlaywrightConnectionEngineLaunchOptionsMock).toHaveBeenCalledWith({
      browserPreference: 'chromium',
    });
    const request = mocks.startPlaywrightEngineTaskMock.mock.calls[0]?.[0]?.request as
      | Record<string, any>
      | undefined;
    expect(request?.personaId).toBe('action-persona-1');
    expect(request?.settingsOverrides).toEqual(
      expect.objectContaining({
        humanizeMouse: false,
        mouseJitter: 13,
        clickDelayMin: 21,
        clickDelayMax: 45,
        inputDelayMin: 7,
        inputDelayMax: 19,
        actionDelayMin: 100,
        actionDelayMax: 240,
        slowMo: 0,
      })
    );
    expect(request?.launchOptions).toEqual(
      expect.objectContaining({
        args: expect.arrayContaining([
          '--existing',
          '--disable-blink-features=AutomationControlled',
        ]),
      })
    );
    expect(request?.launchOptions).not.toHaveProperty('channel');
    expect(request?.launchOptions).not.toHaveProperty('executablePath');
  });

  it('queues Amazon direct candidate extraction even when the product has no usable images', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name: { en: 'Direct Candidate Product', pl: '' },
      name_en: 'Direct Candidate Product',
      images: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-direct',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-direct',
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
      requestInput: {
        runtimeKey: 'amazon_candidate_extraction',
        directAmazonCandidateUrl: 'https://www.amazon.com/dp/B00DIRECT1',
        directAmazonCandidateUrls: [
          'https://www.amazon.com/dp/B00DIRECT1',
          'https://www.amazon.com/dp/B00DIRECT2',
        ],
        directMatchedImageId: 'image-1',
        directAmazonCandidateRank: 1,
      },
    });

    expect(result.queued).toBe(1);
    expect(result.results[0]).toMatchObject({
      productId: 'product-1',
      scanId: expect.any(String),
      runId: 'run-direct',
      status: 'queued',
    });
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          runtimeKey: 'amazon_candidate_extraction',
          input: expect.objectContaining({
            imageCandidates: [],
            directAmazonCandidateUrl: 'https://www.amazon.com/dp/B00DIRECT1',
            directAmazonCandidateUrls: [
              'https://www.amazon.com/dp/B00DIRECT1',
              'https://www.amazon.com/dp/B00DIRECT2',
            ],
            directMatchedImageId: 'image-1',
            directAmazonCandidateRank: 1,
          }),
        }),
      })
    );
  });

  it('keeps Amazon scans headless initially while allowing captcha manual verification', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      playwrightSettingsOverrides: {
        headless: true,
      },
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Captcha Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-captcha',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-captcha',
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    const startRequest = mocks.startPlaywrightEngineTaskMock.mock.calls[0]?.[0]?.request;
    expect(startRequest?.input).toEqual(
      expect.objectContaining({
        allowManualVerification: true,
        manualVerificationTimeoutMs: 180000,
      })
    );
    expect(startRequest?.settingsOverrides ?? {}).not.toHaveProperty('headless');
    expect(mocks.resolveProductScannerHeadlessMock).not.toHaveBeenCalled();
  });

  it('forwards custom Amazon step sequence settings into the Playwright request', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Sequence Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-sequence',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-sequence',
      })
    );

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
      stepSequenceKey: 'amazon_reverse_image_scan',
      stepSequence: [{ key: 'validate', label: 'Validate trigger button' }],
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            stepSequenceKey: 'amazon_reverse_image_scan',
            stepSequence: [{ key: 'validate', label: 'Validate trigger button' }],
          }),
        }),
      })
    );
  });

  it('preserves the scanner browser launch choice for Amazon scans instead of overriding it', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightPersonaId: null,
      playwrightBrowser: 'brave',
      playwrightSettingsOverrides: {
        headless: true,
      },
    });
    mocks.resolveProductScannerHeadlessMock.mockResolvedValue(true);
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      launchOptions: {
        executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      },
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Browser Respect Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-browser-respect',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-browser-respect',
      })
    );

    await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          launchOptions: expect.objectContaining({
            executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
          }),
        }),
      })
    );
  });

  it('queues a new 1688 supplier reverse-image scan with image candidates', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Test Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-1688',
      })
    );

    const result = await queue1688BatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(result.results[0]).toMatchObject({
      productId: 'product-1',
      scanId: expect.any(String),
      runId: 'run-connection-1688',
      status: 'queued',
    });
    expect(mocks.startPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          id: 'connection-1688',
          playwrightPersonaId: 'persona-1688',
        }),
        request: expect.objectContaining({
          runtimeKey: SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
          selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
          input: expect.objectContaining({
            integrationId: 'integration-1688',
            connectionId: 'connection-1688',
            runtimeKey: SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
            selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
            selectorRuntime: expect.objectContaining({
              fileInputSelectors: ['input[type="file"]'],
              supplierBodySignalPattern: '供应商',
            }),
            selectorRegistryResolution: expect.objectContaining({
              requestedProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
              fallbackToCode: false,
            }),
            scanner1688StartUrl: 'https://www.1688.com/',
            scanner1688DefaultSearchMode: 'local_image',
            candidateResultLimit: 12,
            minimumCandidateScore: 6,
            maxExtractedImages: 9,
            allowUrlImageSearchFallback: false,
          }),
        }),
        resolveEngineRequestConfig: expect.any(Function),
      })
    );
    expect(mocks.createCustomPlaywrightInstanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1688',
        integrationId: 'integration-1688',
      })
    );
    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    const resolver =
      mocks.startPlaywrightConnectionEngineTaskMock.mock.calls[0]?.[0]
        ?.resolveEngineRequestConfig;
    const resolvedConfig = resolver?.({
      settings: {
        headless: true,
        identityProfile: 'marketplace',
      },
      browserPreference: 'brave',
    });
    expect(resolvedConfig).toEqual(
      expect.objectContaining({
        browserPreference: 'brave',
        settings: expect.objectContaining({
          headless: true,
          identityProfile: 'marketplace',
          locale: 'zh-CN',
          timezoneId: 'Asia/Shanghai',
          humanizeMouse: true,
          mouseJitter: 5,
          slowMo: 140,
          clickDelayMin: 80,
          clickDelayMax: 220,
          inputDelayMin: 50,
          inputDelayMax: 160,
          actionDelayMin: 250,
          actionDelayMax: 900,
        }),
      })
    );
  });

  it('forwards custom 1688 step sequence settings into the Playwright request', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Supplier Sequence Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-1688-sequence',
      })
    );

    await queue1688BatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
      stepSequenceKey: 'supplier_direct_candidate_followup',
      stepSequence: [{ key: 'supplier_probe', label: 'Probe direct supplier candidate' }],
    });

    expect(mocks.startPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            stepSequenceKey: 'supplier_direct_candidate_followup',
            stepSequence: [
              { key: 'supplier_probe', label: 'Probe direct supplier candidate' },
            ],
          }),
        }),
      })
    );
  });

  it('materializes URL-only product images before launching a 1688 scan', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type'
              ? 'image/jpeg'
              : name.toLowerCase() === 'content-length'
                ? '3'
                : null,
        },
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }))
    );
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'URL Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'remote.jpg',
            filepath: '',
            publicUrl: 'https://cdn.example.com/remote.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-1688-url',
      })
    );

    const result = await queue1688BatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(mocks.writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('geminitestapp-product-scan-images'),
      expect.any(Buffer)
    );
    expect(mocks.startPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'file-1',
                filepath: expect.stringContaining('geminitestapp-product-scan-images'),
                url: 'https://cdn.example.com/remote.jpg',
              }),
            ],
          }),
        }),
      })
    );
  });

  it('resolves app-local product image URLs without remote materialization for 1688 scans', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Local URL Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'remote.jpg',
            filepath: '',
            publicUrl: 'http://localhost:3000/uploads/remote.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-1688-local-url',
      })
    );

    const result = await queue1688BatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.writeFileMock).not.toHaveBeenCalled();
    expect(mocks.startPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'file-1',
                filepath: expect.stringContaining('remote.jpg'),
                url: 'http://localhost:3000/uploads/remote.jpg',
              }),
            ],
          }),
        }),
      })
    );
  });

  it('does not launch a 1688 scan with URL-only images when local materialization fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        headers: {
          get: () => null,
        },
        arrayBuffer: async () => new Uint8Array([]).buffer,
      }))
    );
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'URL Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'remote.jpg',
            filepath: '',
            publicUrl: 'https://cdn.example.com/remote.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-1688-url-failed',
      })
    );

    const result = await queue1688BatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        queued: 0,
        failed: 1,
      })
    );
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        status: 'failed',
        message: 'No local product image file available for 1688 supplier reverse image scan.',
      })
    );
    expect(mocks.startPlaywrightConnectionEngineTaskMock).not.toHaveBeenCalled();
    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
  });

  it('falls back to base64 product images when 1688 URL image materialization fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        headers: {
          get: () => null,
        },
        arrayBuffer: async () => new Uint8Array([]).buffer,
      }))
    );
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Base64 Fallback Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'remote.jpg',
            filepath: '',
            publicUrl: 'https://cdn.example.com/remote.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
      imageBase64s: ['data:image/png;base64,AQID'],
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-1688-base64-fallback',
      })
    );

    const result = await queue1688BatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(mocks.writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('geminitestapp-product-scan-images'),
      expect.any(Buffer)
    );
    expect(mocks.startPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'base64-slot-1',
                filepath: expect.stringContaining('geminitestapp-product-scan-images'),
                url: null,
              }),
            ],
          }),
        }),
      })
    );
  });

  it('queues a new Amazon reverse-image scan from base64-backed product images', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Base64 Product',
      images: [],
      imageLinks: [],
      imageBase64s: ['data:image/png;base64,AA=='],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-base64',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-base64',
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(result.results[0]).toMatchObject({
      productId: 'product-1',
      scanId: expect.any(String),
      runId: 'run-base64',
      status: 'queued',
    });
    expect(mocks.mkdirMock).toHaveBeenCalled();
    expect(mocks.writeFileMock).toHaveBeenCalled();
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                id: 'base64-slot-1',
                filepath: expect.stringContaining('geminitestapp-product-scan-images'),
                filename: expect.stringMatching(/\.png$/),
              }),
            ],
          }),
        }),
      })
    );
  });

  it('queues a new Amazon reverse-image scan when the product image filepath is a public upload path', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.statMock
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce({
        isFile: () => true,
        size: 1024,
      });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Public Path Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/uploads/products/test/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
      imageLinks: [],
      imageBase64s: [],
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-public-path',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(
      async (input: any) => ({
        ...input,
        id: input.id || 'scan-public-path',
      })
    );

    const result = await queueAmazonBatchProductScans({
      productIds: ['product-1'],
      userId: 'user-1',
    });

    expect(result.queued).toBe(1);
    expect(result.results[0]).toMatchObject({
      productId: 'product-1',
      scanId: expect.any(String),
      runId: 'run-public-path',
      status: 'queued',
    });
    expect(mocks.statMock).toHaveBeenCalledTimes(2);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            imageCandidates: [
              expect.objectContaining({
                filepath: expect.stringMatching(/uploads\/products\/test\/img\.jpg$/),
              }),
            ],
          }),
        }),
      })
    );
  });

  it('fails 1688 batch scans early when the resolved profile has no stored browser session', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: vi.fn(async () => [
        {
          id: 'integration-1688',
          slug: '1688',
          name: '1688',
        },
      ]),
      listConnections: vi.fn(async () => [
        {
          id: 'connection-1688',
          integrationId: 'integration-1688',
          name: '1688 Primary',
          scanner1688StartUrl: 'https://www.1688.com/',
          scanner1688LoginMode: 'session_required',
          scanner1688DefaultSearchMode: 'local_image',
          scanner1688CandidateResultLimit: null,
          scanner1688MinimumCandidateScore: null,
          scanner1688MaxExtractedImages: null,
          scanner1688AllowUrlImageSearchFallback: null,
          playwrightStorageState: null,
        },
      ]),
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Sessionless Product',
      images: [
        {
          id: 'image-1',
          imageFile: {
            id: 'file-1',
            filename: 'img.jpg',
            filepath: '/img.jpg',
            mimetype: 'image/jpeg',
            size: 100,
          },
        },
      ],
    });
    mocks.upsertProductScanMock.mockImplementation(async (input: any) => ({
      ...input,
      id: input.id || 'scan-1688-session-missing',
    }));

    const result = await queue1688BatchProductScans({
      productIds: ['product-1'],
    });

    expect(result.failed).toBe(1);
    expect(result.results[0]?.status).toBe('failed');
    expect(result.results[0]?.message).toBe(
      '1688 login required for profile 1688 Primary. Refresh the saved browser session before scanning.'
    );
    expect(mocks.startPlaywrightConnectionEngineTaskMock).not.toHaveBeenCalled();
  });

  it('serializes batch scan startup and preserves product order', async () => {
    mocks.findLatestActiveProductScanMock.mockResolvedValue(null);
    mocks.getProductByIdMock.mockImplementation(async (id: string) => ({
      id,
      name_en: `Product ${id}`,
      images: [{ id: 'img', imageFile: { id: 'f', filename: 'f.jpg', filepath: '/f.jpg', mimetype: 'i/j', size: 1 } }],
    }));
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-id',
      status: 'queued',
    });
    mocks.upsertProductScanMock.mockImplementation(async (input: any) => ({ ...input, id: `scan-${input.productId}` }));

    const result = await queueAmazonBatchProductScans({
      productIds: ['p1', 'p2', 'p3'],
    });

    expect(result.results).toHaveLength(3);
    expect(result.results[0]?.productId).toBe('p1');
    expect(result.results[1]?.productId).toBe('p2');
    expect(result.results[2]?.productId).toBe('p3');
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledTimes(3);
  });
});
