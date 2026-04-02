import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProductByIdMock, runPlaywrightListingScriptMock, updateConnectionMock, accessMock, statMock } = vi.hoisted(() => ({
  getProductByIdMock: vi.fn(),
  runPlaywrightListingScriptMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  accessMock: vi.fn(),
  statMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => accessMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  default: {
    access: (...args: unknown[]) => accessMock(...args),
    stat: (...args: unknown[]) => statMock(...args),
  },
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (value: string) => `decrypted:${value}`,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: getProductByIdMock,
  }),
}));

vi.mock('../integration-repository', () => ({
  getIntegrationRepository: async () => ({
    updateConnection: updateConnectionMock,
  }),
}));

vi.mock('../playwright-listing/runner', () => ({
  runPlaywrightListingScript: (...args: unknown[]) =>
    runPlaywrightListingScriptMock(...args) as Promise<unknown>,
}));

import { ensureLoggedIn, runTraderaBrowserListing } from './browser';
import { LOGIN_SUCCESS_SELECTOR } from './config';
import { TRADERA_SUCCESS_SELECTOR } from '../tradera-browser-test-utils';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';

describe('DEFAULT_TRADERA_QUICKLIST_SCRIPT', () => {
  it('avoids dynamic imports that the vm runner cannot execute', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("await import('node:fs/promises')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('page.context().request.get');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('buffer: bytes');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('AUTH_REQUIRED: Tradera login requires manual verification.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await usernameInput.fill(username);');
  });

  it('opens the create listing form from the selling landing page when needed', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('tradera-quicklist-default:v6');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('artifacts,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const LEGACY_SELL_URL = 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizedConfiguredSellUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CREATE_LISTING_TRIGGER_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CONTINUE_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Create a New Listing")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Skapa en ny annons")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.auth.initial'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await page.goto('https://www.tradera.com/en/login'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('async function captureFailureArtifacts');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('auth-required'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('run-failure'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageUploadsToSettle = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const advancePastImagesStep = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const localImagePaths = Array.isArray(input?.localImagePaths)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolveUploadFiles = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isListingFormReady = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[name="shortDescription"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('#tip-tap-editor');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('#price_fixedPrice');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForSellEntryPoint = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const openCreateListingPage = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await page.goto(DIRECT_SELL_URL");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const opened = entryPoint === 'trigger' ? await openCreateListingPage() : false;");
  });
});

describe('runTraderaBrowserListing scripted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockResolvedValue(undefined);
    statMock.mockResolvedValue({
      isFile: () => true,
      size: 20_000,
    });
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
    });
  });

  it('returns scripted run metadata on success', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-123',
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      publishVerified: true,
      rawResult: { listingUrl: 'https://www.tradera.com/item/123' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        relistPolicy: {
          enabled: true,
          leadMinutes: 30,
          durationHours: 48,
          templateId: 'template-1',
        },
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: 'export default async function run() {}',
        browserMode: 'headed',
        input: expect.objectContaining({
          baseProductId: 'BASE-1',
          sku: 'SKU-1',
          title: 'Example title',
          description: 'Example description',
          price: 123,
          localImagePaths: expect.arrayContaining([
            expect.stringContaining('/public/uploads/products/SKU-1/example.png'),
          ]),
          imageUrls: expect.arrayContaining([
            'https://cdn.example.com/a.jpg',
            'http://localhost:3000/uploads/products/SKU-1/example.png',
          ]),
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
          },
        }),
      })
    );
    expect(result).toEqual({
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'connection',
        runId: 'run-123',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        rawResult: { listingUrl: 'https://www.tradera.com/item/123' },
        publishVerified: true,
      },
    });
  });

  it('refreshes legacy default scripts that still rely on dynamic imports', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-456',
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
      publishVerified: true,
      rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript:
          "export default async function run() { const fs = await import('node:fs/promises'); return fs; }\n// tradera-quicklist",
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
    expect(result).toEqual({
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        runId: 'run-456',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
        publishVerified: true,
      },
    });
  });

  it('refreshes stale managed default scripts that predate the selling-page handoff fix', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-789',
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
      publishVerified: true,
      rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
    });

    const staleManagedDefaultScript = `export default async function run({ page, input, emit, log }) {
  const ACTIVE_URL = 'https://www.tradera.com/en/my/listings?tab=active';
  log?.('tradera.quicklist.start', { baseProductId: input?.baseProductId ?? null });
  throw new Error('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.');
}`;

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: staleManagedDefaultScript,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
    expect(result).toEqual({
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        runId: 'run-789',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
        publishVerified: true,
      },
    });
  });

  it('attaches run diagnostics when the scripted result is invalid', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-999',
      externalListingId: null,
      listingUrl: null,
      publishVerified: null,
      rawResult: { warning: 'missing external id' },
    });

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('run run-999'),
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        requestedBrowserMode: 'headed',
        runId: 'run-999',
        rawResult: { warning: 'missing external id' },
        publishVerified: null,
      }),
    });
  });

  it('preserves script source diagnostics when the scripted runner fails before producing a result', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(new Error('Script execution failed'), {
        meta: {
          runId: 'run-failed-2',
          runStatus: 'failed',
        },
      })
    );

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: 'Script execution failed',
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        requestedBrowserMode: 'headed',
        runId: 'run-failed-2',
        runStatus: 'failed',
      }),
    });
  });

  it('uses the scripted Tradera path when a manual relist requests a browser-mode override', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-headed-recovery',
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
      publishVerified: true,
      rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'builtin',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'relist',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
      })
    );
    expect(result).toEqual({
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'default-fallback',
        runId: 'run-headed-recovery',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
        publishVerified: true,
      },
    });
  });
});

describe('ensureLoggedIn', () => {
  it('reuses a session that lands on an authenticated /my route even without a visible logout link', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/my/listings?tab=active'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (selector: string) => ({
        first: () => ({
          isVisible: async () => {
            if (selector === LOGIN_SUCCESS_SELECTOR) return false;
            return false;
          },
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
    };

    await ensureLoggedIn(
      page as never,
      {
        username: 'user@example.com',
        password: 'encrypted-password',
      } as never,
      'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts'
    );

    expect(gotoMock).toHaveBeenNthCalledWith(
      1,
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
    expect(gotoMock).toHaveBeenNthCalledWith(
      2,
      'https://www.tradera.com/en/selling/new',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
    expect(gotoMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the worker and manual-login success selectors aligned', () => {
    expect(LOGIN_SUCCESS_SELECTOR).toBe(TRADERA_SUCCESS_SELECTOR);
    expect(LOGIN_SUCCESS_SELECTOR).toContain('a[href*="/my"]');
    expect(LOGIN_SUCCESS_SELECTOR).toContain('button[aria-label*="Account"]');
  });

  it('requires manual verification instead of retrying credential login when a stored session is invalid', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/login'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (_selector: string) => ({
        first: () => ({
          isVisible: async () => false,
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
    };

    await expect(
      ensureLoggedIn(
        page as never,
        {
          username: 'user@example.com',
          password: 'encrypted-password',
          playwrightStorageState: 'stored-state',
        } as never,
        'https://www.tradera.com/en/selling/new'
      )
    ).rejects.toThrow('AUTH_REQUIRED: Stored Tradera session expired or requires manual verification.');

    expect(gotoMock).toHaveBeenCalledTimes(1);
    expect(gotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
  });
});
