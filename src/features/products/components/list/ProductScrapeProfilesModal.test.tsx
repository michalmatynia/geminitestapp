/* eslint-disable max-lines, max-lines-per-function */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';

const {
  apiGetMock,
  apiPostMock,
  invalidateListingBadgesMock,
  invalidateProductsAndCountsMock,
  toastMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  invalidateListingBadgesMock: vi.fn(),
  invalidateProductsAndCountsMock: vi.fn(),
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

const renderModal = (): QueryClient => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ProductScrapeProfilesModal isOpen onClose={vi.fn()} />
    </QueryClientProvider>
  );
  return queryClient;
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

const handleApiGet = (url: string): ProductScrapeProfileRunResponse | ProductDraft[] | {
  profiles: ProductScrapeProfile[];
} => {
  if (url === '/api/v2/products/scrape-profiles') {
    return { profiles: [battleProfile, otherProfile] };
  }
  if (url === '/api/drafts') return buildDraftsResponse();
  throw new Error(`Unexpected GET ${url}`);
};

describe('ProductScrapeProfilesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    apiGetMock.mockImplementation((url: string) => Promise.resolve(handleApiGet(url)));
    apiPostMock.mockResolvedValue(runResponse);
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
        { timeout: 300_000 }
      );
    });
    await waitFor(() => {
      expect(invalidateProductsAndCountsMock).toHaveBeenCalledWith(expect.any(QueryClient));
      expect(invalidateListingBadgesMock).toHaveBeenCalledWith(expect.any(QueryClient));
    });
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
        { timeout: 300_000 }
      );
    });
  });

  it('sends file image import mode when selected', async () => {
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
        { timeout: 300_000 }
      );
    });
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
        { timeout: 300_000 }
      );
    });
  });
});
