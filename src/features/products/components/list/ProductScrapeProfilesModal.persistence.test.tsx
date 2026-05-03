import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';

const { apiGetMock, apiPostMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingBadges: vi.fn(),
  invalidateProductsAndCounts: vi.fn(),
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
    isOpen,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen?: boolean;
    title?: React.ReactNode;
  }) =>
    isOpen === true ? (
      <div role='dialog' aria-label={typeof title === 'string' ? title : 'Modal'}>
        <div>{children}</div>
        <div>{footer}</div>
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
      {loading === true && loadingText !== undefined && loadingText.length > 0
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
      disabled={disabled === true}
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

const createDraft = (id: string, name: string, scrapeProfileId: string | null): ProductDraft => ({
  id,
  name,
  draftKind: 'scrape_template',
  scrapeProfileId,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const renderModal = (): { unmount: () => void } => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ProductScrapeProfilesModal isOpen onClose={vi.fn()} />
    </QueryClientProvider>
  );
  return { unmount: rendered.unmount };
};

const runResponse: ProductScrapeProfileRunResponse = {
  profileId: otherProfile.id,
  profileLabel: otherProfile.label,
  dryRun: true,
  catalog: { id: 'catalog-other', name: 'Other' },
  scrapedCount: 0,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  issueCount: 0,
  products: [],
  summary: {
    rawCount: 0,
    mappedCount: 0,
    recordsWithErrors: 0,
    recordsWithWarnings: 0,
    totalIssues: 0,
  },
};

import { ProductScrapeProfilesModal } from './ProductScrapeProfilesModal';

describe('ProductScrapeProfilesModal persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/api/v2/products/scrape-profiles') {
        return { profiles: [battleProfile, otherProfile] };
      }
      if (url === '/api/drafts') {
        return [
          createDraft('template-any', 'Universal scrape template', null),
          createDraft('template-other', 'Other scrape template', otherProfile.id),
        ];
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    apiPostMock.mockResolvedValue(runResponse);
  });

  it('retains profile settings across modal remounts', async () => {
    const firstRender = renderModal();

    await screen.findByText('BattleStock Warhammer 40k / 30k');
    fireEvent.click(screen.getByRole('button', { name: /Other profile/ }));
    await screen.findByText('Other scrape template');
    fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Select scrape draft template'), {
      target: { value: 'template-other' },
    });
    fireEvent.change(screen.getByLabelText('Select source price currency'), {
      target: { value: 'EUR' },
    });
    fireEvent.click(screen.getByLabelText('Dry run'));

    firstRender.unmount();
    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Other profile/ })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByLabelText('Limit')).toHaveValue('25');
      expect(screen.getByLabelText('Select scrape draft template')).toHaveValue('template-other');
      expect(screen.getByLabelText('Select source price currency')).toHaveValue('EUR');
      expect(screen.getByLabelText('Dry run')).toBeChecked();
    });

    fireEvent.click(screen.getByRole('button', { name: /Run Profile/ }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scrape-profiles/run',
        {
          profileId: otherProfile.id,
          dryRun: true,
          imageImportMode: 'links',
          sourcePriceCurrencyCode: 'EUR',
          skipRecordsWithErrors: true,
          limit: 25,
          draftTemplateId: 'template-other',
        },
        { timeout: 300_000 }
      );
    });
  });
});
