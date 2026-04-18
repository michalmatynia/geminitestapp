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
  resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorTriageConfigMock: vi.fn(),
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfigMock: vi.fn(),
  resolveProductScanner1688CandidateEvaluatorConfigMock: vi.fn(),
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
    mocks.updateProductScanMock.mockImplementation(
      async (id: string, updates: Partial<ProductScanRecord>) => ({
        ...createScan({ id }),
        ...updates,
        id,
      })
    );
    mocks.resolveProductScannerAmazonCandidateEvaluatorProbeConfigMock.mockResolvedValue({
      enabled: false,
    });
    mocks.resolveProductScannerAmazonCandidateEvaluatorTriageConfigMock.mockResolvedValue({
      enabled: false,
    });
  });

  it('surfaces captcha waiting guidance while a headed scan run is still running', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      completedAt: null,
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message:
              'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
            stage: 'google_candidates',
            currentUrl: 'https://lens.google.com/search',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        stage: 'google_candidates',
        currentUrl: 'https://lens.google.com/search',
      },
      finalUrl: 'https://lens.google.com/search',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        rawResult: expect.objectContaining({
          status: 'captcha_required',
          manualVerificationPending: true,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'running',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
      })
    );
  });

  it('relaunches a running headless captcha-blocked scan in headed mode before it times out', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      completedAt: null,
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
            stage: 'google_captcha',
            currentUrl: 'https://www.google.com/sorry/index',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
        stage: 'google_captcha',
        currentUrl: 'https://www.google.com/sorry/index',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      runId: 'run-1',
      runStatus: 'running',
      latestStage: 'google_captcha',
      latestStageUrl: 'https://www.google.com/sorry/index',
      runtimePosture: {
        browser: {
          headless: true,
        },
      },
      rawResult: {
        stage: 'google_captcha',
        currentUrl: 'https://www.google.com/sorry/index',
      },
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightSettingsOverrides: {
        headless: true,
        timeout: 45000,
      },
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {
        timeout: 45000,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-headed-1',
      status: 'running',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.getProductScannerSettingsMock).toHaveBeenCalledTimes(1);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          personaId: 'persona-1',
          browserEngine: 'chromium',
          settingsOverrides: expect.objectContaining({
            timeout: 45000,
            headless: false,
          }),
          launchOptions: expect.objectContaining({
            channel: 'chrome',
          }),
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Product 1',
            existingAsin: null,
            allowManualVerification: true,
            manualVerificationTimeoutMs: 180000,
          }),
        }),
      })
    );
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-headed-1',
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-headed-1',
        status: 'running',
      })
    );
  });

  it('clears manual verification messaging once the running scan continues past captcha', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      rawResult: {
        runId: 'run-1',
        manualVerificationPending: true,
        manualVerificationMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        manualVerificationTimeoutMs: 180000,
      },
      asinUpdateMessage:
        'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      completedAt: null,
      result: {
        outputs: {
          result: {
            status: 'matched',
            asin: 'B000123456',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'matched',
        asin: 'B000123456',
      },
      finalUrl: 'https://www.amazon.com/dp/B000123456',
    });

    await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        rawResult: expect.objectContaining({
          runId: 'run-1',
          runStatus: 'running',
          manualVerificationPending: false,
          manualVerificationMessage: null,
          manualVerificationTimeoutMs: 180000,
        }),
      })
    );
  });

  it('does not keep manual verification pending after the active run reaches Amazon stages', async () => {
    const now = Date.now();
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      rawResult: {
        runId: 'run-1',
        manualVerificationPending: true,
        manualVerificationMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
        manualVerificationTimeoutMs: 180000,
      },
      asinUpdateMessage:
        'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'running',
      completedAt: null,
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            stage: 'google_candidates',
            currentUrl: 'https://www.google.com/search',
          },
        },
      },
      updatedAt: new Date(now - 5_000).toISOString(),
      startedAt: new Date(now - 30_000).toISOString(),
      createdAt: new Date(now - 30_000).toISOString(),
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        stage: 'google_candidates',
        currentUrl: 'https://www.google.com/search',
      },
      finalUrl: 'https://www.amazon.com/dp/B000123456',
    });
    mocks.buildPlaywrightEngineRunFailureMetaMock.mockReturnValue({
      latestStage: 'amazon_content_ready',
      latestStageUrl: 'https://www.amazon.com/dp/B000123456',
      runId: 'run-1',
      runStatus: 'running',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        rawResult: expect.objectContaining({
          runId: 'run-1',
          runStatus: 'running',
          latestStage: 'amazon_content_ready',
          latestStageUrl: 'https://www.amazon.com/dp/B000123456',
          manualVerificationPending: false,
          manualVerificationMessage: null,
          manualVerificationTimeoutMs: 180000,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'running',
        asinUpdateMessage: null,
      })
    );
  });

  it('relaunches a captcha-blocked headless run in headed mode and keeps the scan active', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: '/tmp/product-1.jpg',
          url: 'https://cdn.example.com/product-1.jpg',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
            stage: 'google_candidates',
            currentUrl: 'https://www.google.com/sorry/index',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
        stage: 'google_candidates',
        currentUrl: 'https://www.google.com/sorry/index',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightSettingsOverrides: {
        headless: true,
        timeout: 45000,
      },
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {
        timeout: 45000,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-headed-1',
      status: 'running',
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.getProductScannerSettingsMock).toHaveBeenCalledTimes(1);
    expect(mocks.startPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          personaId: 'persona-1',
          browserEngine: 'chromium',
          settingsOverrides: expect.objectContaining({
            timeout: 45000,
            headless: false,
          }),
          launchOptions: expect.objectContaining({
            channel: 'chrome',
          }),
          input: expect.objectContaining({
            productId: 'product-1',
            productName: 'Product 1',
            existingAsin: null,
            allowManualVerification: true,
            manualVerificationTimeoutMs: 180000,
          }),
        }),
      })
    );
    expect(mocks.updateProductScanMock).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({
        engineRunId: 'run-headed-1',
        status: 'running',
        asinUpdateStatus: 'pending',
        asinUpdateMessage:
          'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-headed-1',
        status: 'running',
      })
    );
  });

  it('does not show manual verification guidance until a captcha retry is actually running', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
      imageCandidates: [
        {
          id: 'image-1',
          filepath: '/tmp/product-1.jpg',
          url: 'https://cdn.example.com/product-1.jpg',
          filename: 'product-1.jpg',
        },
      ],
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
            stage: 'google_candidates',
            currentUrl: 'https://www.google.com/sorry/index',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
        stage: 'google_candidates',
        currentUrl: 'https://www.google.com/sorry/index',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightSettingsOverrides: {
        headless: true,
      },
    });
    mocks.buildProductScannerEngineRequestOptionsMock.mockReturnValue({
      personaId: 'persona-1',
      settingsOverrides: {},
      launchOptions: {
        channel: 'chrome',
      },
    });
    mocks.startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-headed-queued',
      status: 'queued',
    });

    const result = await synchronizeProductScan(scan);

    expect(result).toEqual(
      expect.objectContaining({
        engineRunId: 'run-headed-queued',
        status: 'queued',
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        rawResult: expect.objectContaining({
          manualVerificationPending: false,
          manualVerificationMessage: null,
        }),
      })
    );
  });

  it('fails a captcha-blocked run when scanner settings are configured not to reopen a visible browser', async () => {
    const scan = createScan({
      status: 'running',
      engineRunId: 'run-1',
    });

    mocks.readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      completedAt: '2026-04-11T04:05:00.000Z',
      result: {
        outputs: {
          result: {
            status: 'captcha_required',
            message: 'Google Lens requested captcha verification.',
          },
        },
      },
    });
    mocks.resolvePlaywrightEngineRunOutputsMock.mockReturnValue({
      resultValue: {
        status: 'captcha_required',
        message: 'Google Lens requested captcha verification.',
      },
      finalUrl: 'https://www.google.com/sorry/index',
    });
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      asin: null,
      name_en: 'Product 1',
    });
    mocks.getProductScannerSettingsMock.mockResolvedValue({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 120000,
      amazonImageSearchProvider: 'google_images_upload',
      playwrightSettingsOverrides: {
        headless: true,
      },
    });

    const result = await synchronizeProductScan(scan);

    expect(mocks.startPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        asinUpdateStatus: 'failed',
        asinUpdateMessage:
          'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.',
      })
    );
  });
});
