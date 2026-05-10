import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS,
} from '@/shared/lib/browser-execution/product-scrape-runtime-constants';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const {
  apiGetMock,
  apiPostMock,
  invalidateListingBadgesMock,
  invalidateProductsAndCountsMock,
  playwrightActionsStore,
  savePlaywrightActionsMock,
  toastMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  invalidateListingBadgesMock: vi.fn(),
  invalidateProductsAndCountsMock: vi.fn(),
  playwrightActionsStore: {
    data: [] as unknown,
    pending: false,
  },
  savePlaywrightActionsMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingBadges: (...args: unknown[]) => invalidateListingBadgesMock(...args),
  invalidateProductsAndCounts: (...args: unknown[]) => invalidateProductsAndCountsMock(...args),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    children,
    footer,
    headerActions,
    isOpen,
    lockClose,
    onClose,
    showClose = true,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    headerActions?: React.ReactNode;
    isOpen?: boolean;
    lockClose?: boolean;
    onClose?: () => void;
    showClose?: boolean;
    title?: React.ReactNode;
  }) =>
    isOpen === true ? (
      <div role='dialog' aria-label={typeof title === 'string' ? title : 'Modal'}>
        <div data-testid='app-modal-header-actions'>
          {headerActions}
          {showClose ? (
            <button type='button' onClick={onClose} disabled={lockClose === true}>
              Close
            </button>
          ) : null}
        </div>
        <div>{children}</div>
        {footer !== undefined && footer !== null ? <div>{footer}</div> : null}
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    loading,
    loadingText,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingText?: string;
  }) => (
    <button {...props} disabled={props.disabled === true || loading === true}>
      {loading === true && typeof loadingText === 'string' && loadingText.length > 0
        ? loadingText
        : children}
    </button>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    ariaLabel,
    disabled,
    id,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    disabled?: boolean;
    id?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    value?: string;
  }) => (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  ToggleRow: ({
    checked,
    children,
    label,
    loading,
    onCheckedChange,
  }: {
    checked?: boolean;
    children?: React.ReactNode;
    label: string;
    loading?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <label>
      <input
        aria-label={label}
        type='checkbox'
        checked={checked === true}
        disabled={loading === true}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/shared/hooks/usePlaywrightStepSequencer', () => ({
  usePlaywrightActions: () => ({ data: playwrightActionsStore.data }),
  useSavePlaywrightActionsMutation: () => ({
    isPending: playwrightActionsStore.pending,
    mutateAsync: savePlaywrightActionsMock,
  }),
}));

vi.mock('@/shared/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

const battleProfile: ProductScrapeProfile = {
  id: 'battlestock-warhammer-40k-30k',
  label: 'BattleStock Warhammer 40k / 30k',
  description: 'BattleStock category',
  siteHost: 'www.battle-stock.pl',
  sourceUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
  scripterId: 'battlestock-warhammer-40k-30k',
  runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
  targetCatalogName: 'BattleStock',
  defaultLimit: null,
  maxPages: 75,
  defaultSourcePriceCurrencyCode: 'PLN',
  sourcePriceCurrencyCodes: ['PLN', 'EUR'],
};

const otherProfile: ProductScrapeProfile = {
  ...battleProfile,
  id: 'other-profile',
  label: 'Other profile',
  siteHost: 'example.com',
  sourceUrl: 'https://example.com/products',
  scripterId: 'other-profile',
  runtimeActionKey: null,
  targetCatalogName: 'Other',
};

const createDraft = (
  input: Pick<ProductDraft, 'id' | 'name' | 'draftKind' | 'scrapeProfileId'>
): ProductDraft => {
  const draft = {
    ...input,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
  };
  return draft as ProductDraft;
};

const renderModal = (
  scrapeRuntime?: React.ComponentProps<typeof ProductScrapeProfilesModal>['scrapeRuntime']
): QueryClient => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ProductScrapeProfilesModal isOpen onClose={vi.fn()} scrapeRuntime={scrapeRuntime} />
    </QueryClientProvider>
  );
  return queryClient;
};

const getEnabledRunButton = async (): Promise<HTMLElement> => {
  const runButton = screen.getByRole('button', { name: /Run Profile/ });
  await waitFor(() => expect(runButton).not.toBeDisabled());
  return runButton;
};

const runResponse: ProductScrapeProfileRunResponse = {
  profileId: battleProfile.id,
  profileLabel: battleProfile.label,
  dryRun: false,
  catalog: { id: 'catalog-battle', name: 'BattleStock' },
  scrapedCount: 1,
  createdCount: 1,
  updatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  issueCount: 0,
  runtime: {
    queueName: 'product-scrape-profile',
    runtimeActionId: 'runtime-action-battlestock',
    runtimeActionName: 'BattleStock Product Scrape',
    runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
    browserMode: 'headed',
    enabledStepCount: 3,
    imageImportMode: 'files',
    imageStepControls: {
      applyImagePayload: true,
      collectProductGalleryImages: true,
      collectScrapedImageLinks: true,
      downloadProductGalleryImages: true,
      downloadScrapedImages: true,
      uploadProductImages: true,
    },
    totalStepCount: 4,
  },
  products: [
    {
      index: 0,
      status: 'created',
      productId: 'product-1',
      sku: 'BATTLESTOCK-1',
      title: 'Rendered product',
      sourceUrl: battleProfile.sourceUrl,
      error: null,
    },
  ],
  summary: {
    rawCount: 1,
    mappedCount: 1,
    recordsWithErrors: 0,
    recordsWithWarnings: 0,
    totalIssues: 0,
  },
};

const queuedResponse: ProductScrapeProfileRunQueuedResponse = {
  status: 'queued',
  profileId: battleProfile.id,
  dryRun: false,
  jobId: 'job-1',
  imageImportMode: 'links',
  queueName: 'product-scrape-profile',
  enqueuedAt: '2026-05-08T00:00:00.000Z',
};

const createRuntimeAction = (
  input: Partial<PlaywrightAction> = {}
): PlaywrightAction => {
  const seed = getPlaywrightRuntimeActionSeed(PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY);
  if (seed === null) {
    throw new Error('Missing BattleStock runtime action seed.');
  }
  return {
    ...seed,
    ...input,
    executionSettings: {
      ...seed.executionSettings,
      ...(input.executionSettings ?? {}),
    },
  };
};

import { ProductScrapeProfilesModal } from './ProductScrapeProfilesModal';

const buildDraftsResponse = (): ProductDraft[] => [
  createDraft({
    id: 'template-any',
    name: 'Universal scrape template',
    draftKind: 'scrape_template',
    scrapeProfileId: null,
  }),
  createDraft({
    id: 'template-battle',
    name: 'BattleStock scrape template',
    draftKind: 'scrape_template',
    scrapeProfileId: battleProfile.id,
  }),
  createDraft({
    id: 'template-other',
    name: 'Other scrape template',
    draftKind: 'scrape_template',
    scrapeProfileId: otherProfile.id,
  }),
  createDraft({
    id: 'standard-draft',
    name: 'Standard draft',
    draftKind: 'standard',
    scrapeProfileId: null,
  }),
];

const freshPagedProductsResponse = {
  products: [
    {
      id: 'product-1',
      sku: 'BATTLESTOCK-1',
      name: { en: 'Rendered product', pl: null, de: null },
      description: { en: '', pl: null, de: null },
      name_en: 'Rendered product',
      name_pl: null,
      name_de: null,
      description_en: null,
      description_pl: null,
      description_de: null,
      baseProductId: null,
      importSource: 'scrape',
      defaultPriceGroupId: null,
      ean: null,
      gtin: null,
      asin: null,
      supplierName: 'BattleStock',
      supplierLink: battleProfile.sourceUrl,
      priceComment: null,
      stock: 1,
      sourcePrice: null,
      sourcePriceCurrencyCode: null,
      price: 10,
      sizeLength: null,
      sizeWidth: null,
      weight: null,
      length: null,
      published: true,
      archived: false,
      categoryId: null,
      shippingGroupId: null,
      studioProjectId: null,
      catalogId: 'catalog-battle',
      parameters: [{ parameterId: 'pin-condition', value: 'Used' }],
      customFields: [],
      marketplaceContentOverrides: [],
      imageLinks: [],
      imageBase64s: [],
      noteIds: [],
      images: [],
      catalogs: [{ productId: 'product-1', catalogId: 'catalog-battle', assignedAt: '' }],
      tags: [],
      producers: [],
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-04-30T00:00:00.000Z',
    },
  ],
  total: 1,
};

const handleApiGet = (
  url: string
): ProductScrapeProfileRunResponse | ProductDraft[] | {
  profiles: ProductScrapeProfile[];
} | typeof freshPagedProductsResponse => {
  if (url === '/api/v2/products/scrape-profiles') {
    return { profiles: [battleProfile, otherProfile] };
  }
  if (url === '/api/drafts') return buildDraftsResponse();
  if (url === '/api/v2/products/paged') return freshPagedProductsResponse;
  throw new Error(`Unexpected GET ${url}`);
};

describe('ProductScrapeProfilesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    playwrightActionsStore.data = [];
    playwrightActionsStore.pending = false;
    savePlaywrightActionsMock.mockResolvedValue(undefined);
    apiGetMock.mockImplementation((url: string) => Promise.resolve(handleApiGet(url)));
    apiPostMock.mockResolvedValue(queuedResponse);
  });

  it('renders Run Profile in the header before the single Close button', async () => {
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');

    const runButton = screen.getByRole('button', { name: /Run Profile/ });
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    expect(closeButtons).toHaveLength(1);

    const closeButton = closeButtons[0];
    if (closeButton === undefined) {
      throw new Error('Expected modal close button.');
    }

    const headerActions = screen.getByTestId('app-modal-header-actions');
    const headerButtons = within(headerActions).getAllByRole('button');
    expect(headerButtons[0]).toBe(runButton);
    expect(headerButtons[1]).toBe(closeButton);
  });

  it('runs the selected scrape profile with a compatible scrape template', async () => {
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    const templateSelect = await screen.findByLabelText('Select scrape draft template');

    expect(screen.getByText('Universal scrape template')).toBeInTheDocument();
    expect(screen.getByText('BattleStock scrape template')).toBeInTheDocument();
    expect(screen.queryByText('Other scrape template')).not.toBeInTheDocument();
    expect(screen.queryByText('Standard draft')).not.toBeInTheDocument();

    fireEvent.change(templateSelect, { target: { value: 'template-battle' } });
    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scrape-profiles/run',
        {
          profileId: battleProfile.id,
          dryRun: false,
          imageImportMode: 'links',
          sourcePriceCurrencyCode: 'PLN',
          skipRecordsWithErrors: true,
          draftTemplateId: 'template-battle',
        },
        { timeout: 30_000 }
      );
    });
    await waitFor(() => {
      expect(invalidateProductsAndCountsMock).not.toHaveBeenCalled();
      expect(invalidateListingBadgesMock).not.toHaveBeenCalled();
      expect(screen.getByText('Queued in Redis runtime')).toBeInTheDocument();
      expect(screen.getByText('Redis queue: product-scrape-profile')).toBeInTheDocument();
      expect(screen.getByText('Job ID: job-1')).toBeInTheDocument();
    });
  });

  it('shows terminal Redis runtime failures from polling instead of the stale queued card', async () => {
    renderModal({
      activeRun: null,
      isActive: false,
      isUpdating: false,
      latestRun: {
        completedAt: '2026-05-08T00:03:00.000Z',
        createdAt: queuedResponse.enqueuedAt,
        dryRun: false,
        error: 'Scrape profile run was marked failed after being queued for over 2 minutes without Redis worker pickup.',
        id: queuedResponse.jobId,
        imageImportMode: 'links',
        profileId: queuedResponse.profileId,
        queueName: queuedResponse.queueName,
        result: null,
        startedAt: null,
        status: 'failed',
        updatedAt: '2026-05-08T00:03:00.000Z',
      },
      pauseActiveRun: vi.fn(),
      registerQueuedRun: vi.fn(),
      resumeActiveRun: vi.fn(),
    });

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(await getEnabledRunButton());

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText(/without Redis worker pickup/)).toBeInTheDocument();
      expect(screen.queryByText('Queued in Redis runtime')).not.toBeInTheDocument();
    });
  });

  it('keeps the modal close button enabled while the Redis launch request is pending', async () => {
    apiPostMock.mockImplementation(
      () =>
        new Promise((): void => {
          // Keep the request pending for this interaction-state assertion.
        })
    );
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(await getEnabledRunButton());

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Close' })).not.toBeDisabled();
    });
  });

  it('shows completed runtime image import mode and image sequencer step controls', async () => {
    apiPostMock.mockResolvedValueOnce(runResponse);
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(await getEnabledRunButton());

    await waitFor(() => {
      expect(screen.getAllByText('Download as files').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Download scraped files: Enabled')).toBeInTheDocument();
      expect(screen.getByText('Upload product files: Enabled')).toBeInTheDocument();
      expect(screen.getByText('Apply image payload: Enabled')).toBeInTheDocument();
    });
  });

  it('shows the connected Playwright runtime action that governs the scrape profile', async () => {
    playwrightActionsStore.data = [
      createRuntimeAction({
        id: 'runtime-action-custom-battlestock',
        name: 'Custom BattleStock scrape flow',
        description: 'Custom scrape flow from the Step Sequencer.',
        executionSettings: {
          ...getPlaywrightRuntimeActionSeed(PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY)!
            .executionSettings,
          headless: false,
        },
        updatedAt: '2026-05-08T08:00:00.000Z',
      }),
    ];

    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    expect(screen.getByText('Connected scraping action')).toBeInTheDocument();
    expect(screen.getByText('Custom BattleStock scrape flow')).toBeInTheDocument();
    expect(screen.getByText('Custom scrape flow from the Step Sequencer.')).toBeInTheDocument();
    expect(screen.getByText(PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY)).toBeInTheDocument();
    expect(screen.getByText('Saved action')).toBeInTheDocument();
    expect(screen.getByText('Headed')).toBeInTheDocument();
    expect(screen.getByText('Action ID: runtime-action-custom-battlestock')).toBeInTheDocument();
    expect(screen.getByText('Playwright sequencer steps')).toBeInTheDocument();
    expect(screen.getByText('Download scraped image files')).toBeInTheDocument();
    expect(screen.getByText('Upload product images to storage')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Custom BattleStock scrape flow' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime-action-custom-battlestock'
    );
    await waitFor(() => {
      expect(screen.getByText('Current: Headed')).toBeInTheDocument();
    });
  });

  it('shows the seeded modular action when a saved scrape action is missing image steps', async () => {
    const seed = getPlaywrightRuntimeActionSeed(PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY);
    if (seed === null) throw new Error('Missing BattleStock runtime action seed.');
    playwrightActionsStore.data = [
      createRuntimeAction({
        id: 'old-battlestock-action',
        blocks: seed.blocks.filter(
          (block) => block.refId !== PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.uploadProductImages
        ),
      }),
    ];

    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    expect(screen.getByText('Seed default')).toBeInTheDocument();
    expect(screen.getByText('Seed fallback active')).toBeInTheDocument();
    expect(screen.getByText(/product_scrape_upload_product_images/)).toBeInTheDocument();
    expect(screen.getByText('Upload product images to storage')).toBeInTheDocument();
  });

  it('saves runtime browser mode changes before launching the Redis scrape run', async () => {
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(screen.getByLabelText('Action browser mode'));
    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(savePlaywrightActionsMock).toHaveBeenCalledTimes(1);
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scrape-profiles/run',
        expect.objectContaining({ profileId: battleProfile.id }),
        { timeout: 30_000 }
      );
    });

    const savedPayload = savePlaywrightActionsMock.mock.calls[0]?.[0] as
      | { actions?: PlaywrightAction[] }
      | undefined;
    const savedRuntimeAction = savedPayload?.actions?.find(
      (action) => action.runtimeKey === PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY
    );
    expect(savedRuntimeAction?.executionSettings.headless).toBe(false);
  });

  it('repairs outdated scrape runtime actions when saving browser mode before launch', async () => {
    const seed = getPlaywrightRuntimeActionSeed(PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY);
    if (seed === null) throw new Error('Missing BattleStock runtime action seed.');
    playwrightActionsStore.data = [
      createRuntimeAction({
        id: 'old-battlestock-action',
        blocks: seed.blocks.filter(
          (block) => block.refId !== PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.uploadProductImages
        ),
      }),
    ];

    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(screen.getByLabelText('Action browser mode'));
    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(savePlaywrightActionsMock).toHaveBeenCalledTimes(1);
    });

    const savedPayload = savePlaywrightActionsMock.mock.calls[0]?.[0] as
      | { actions?: PlaywrightAction[] }
      | undefined;
    const savedRuntimeActions =
      savedPayload?.actions?.filter(
        (action) => action.runtimeKey === PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY
      ) ?? [];
    const savedRuntimeAction = savedRuntimeActions[0];

    expect(savedRuntimeActions).toHaveLength(1);
    expect(savedRuntimeAction?.id).toBe(`runtime_action__${PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY}`);
    expect(savedRuntimeAction?.executionSettings.headless).toBe(false);
    expect(savedRuntimeAction?.blocks.map((block) => block.refId)).toContain(
      PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.uploadProductImages
    );
  });

  it('does not block on product refresh while the Redis scrape job runs', async () => {
    const queryClient = renderModal();
    const filters = { page: 1, pageSize: 20 };
    const queryKey = [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;
    queryClient.setQueryData(queryKey, {
      items: [
        {
          id: 'product-1',
          sku: 'BATTLESTOCK-1',
          parameters: [],
        },
      ],
      total: 1,
    });

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(await getEnabledRunButton());

    await waitFor(() => {
      expect(screen.getByText('Queued in Redis runtime')).toBeInTheDocument();
    });

    expect(queryClient.getQueryData(queryKey)).toEqual({
      items: [
        {
          id: 'product-1',
          sku: 'BATTLESTOCK-1',
          parameters: [],
        },
      ],
      total: 1,
    });
    expect(apiGetMock).not.toHaveBeenCalledWith('/api/v2/products/paged', expect.anything());
  });

  it('clears a selected profile-specific template when switching profiles', async () => {
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    const templateSelect = await screen.findByLabelText('Select scrape draft template');

    fireEvent.change(templateSelect, { target: { value: 'template-battle' } });
    fireEvent.click(screen.getByRole('button', { name: /Other profile/ }));

    await waitFor(() => {
      expect(screen.queryByText('BattleStock scrape template')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scrape-profiles/run',
        {
          profileId: otherProfile.id,
          dryRun: false,
          imageImportMode: 'links',
          sourcePriceCurrencyCode: 'PLN',
          skipRecordsWithErrors: true,
        },
        { timeout: 30_000 }
      );
    });
  });

  it('sends file image import mode when selected', async () => {
    apiPostMock.mockResolvedValueOnce({
      ...queuedResponse,
      imageImportMode: 'files',
      run: {
        completedAt: null,
        createdAt: queuedResponse.enqueuedAt,
        dryRun: false,
        error: null,
        id: queuedResponse.jobId,
        imageImportMode: 'files',
        profileId: queuedResponse.profileId,
        queueName: queuedResponse.queueName,
        result: null,
        startedAt: null,
        status: 'queued',
        updatedAt: queuedResponse.enqueuedAt,
      },
    });
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    const imageModeSelect = screen.getByLabelText('Select scrape image import mode');
    await waitFor(() => expect(imageModeSelect).toHaveValue('links'));
    fireEvent.change(imageModeSelect, {
      target: { value: 'files' },
    });
    await waitFor(() => expect(imageModeSelect).toHaveValue('files'));
    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scrape-profiles/run',
        {
          profileId: battleProfile.id,
          dryRun: false,
          imageImportMode: 'files',
          sourcePriceCurrencyCode: 'PLN',
          skipRecordsWithErrors: true,
        },
        { timeout: 30_000 }
      );
    });
    expect(screen.getAllByText('Download as files').length).toBeGreaterThanOrEqual(2);
  });

  it('sends the selected source price currency', async () => {
    renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    const currencySelect = screen.getByLabelText('Select source price currency');
    await waitFor(() => expect(currencySelect).toHaveValue('PLN'));
    fireEvent.change(currencySelect, {
      target: { value: 'EUR' },
    });
    await waitFor(() => expect(currencySelect).toHaveValue('EUR'));
    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scrape-profiles/run',
        {
          profileId: battleProfile.id,
          dryRun: false,
          imageImportMode: 'links',
          sourcePriceCurrencyCode: 'EUR',
          skipRecordsWithErrors: true,
        },
        { timeout: 30_000 }
      );
    });
  });
});
