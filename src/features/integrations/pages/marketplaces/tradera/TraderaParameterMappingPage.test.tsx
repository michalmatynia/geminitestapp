// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.hoisted(() => vi.fn());
const upsertConnectionMutateAsyncMock = vi.hoisted(() => vi.fn());
const fetchCatalogMutateAsyncMock = vi.hoisted(() => vi.fn());
const fetchExternalCategoriesMutateAsyncMock = vi.hoisted(() => vi.fn());
const refetchConnectionsMock = vi.hoisted(() => vi.fn());
const useExternalCategoriesMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('nextjs-toploader/app', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrations: () => ({
    data: [{ id: 'integration-tradera', slug: 'tradera', name: 'Tradera' }],
    isLoading: false,
  }),
  useIntegrationConnections: () => ({
    data: [
      {
        id: 'connection-1',
        integrationId: 'integration-tradera',
        name: 'Primary Tradera',
        traderaParameterMapperRulesJson: JSON.stringify({
          version: 1,
          rules: [
            {
              id: 'rule-1',
              externalCategoryId: 'cat-jewellery',
              externalCategoryName: 'Jewellery',
              externalCategoryPath: 'Accessories > Jewellery',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              parameterId: 'param-metal',
              parameterName: 'Metal',
              parameterCatalogId: 'catalog-a',
              sourceValue: 'Metal',
              targetOptionLabel: 'Silver',
              isActive: true,
              createdAt: '2026-04-08T10:00:00.000Z',
              updatedAt: '2026-04-08T10:00:00.000Z',
            },
            {
              id: 'rule-2',
              externalCategoryId: 'cat-watches',
              externalCategoryName: 'Watches',
              externalCategoryPath: 'Accessories > Watches',
              fieldLabel: 'Band Material',
              fieldKey: 'bandmaterial',
              parameterId: 'param-size',
              parameterName: 'Size',
              parameterCatalogId: 'catalog-a',
              sourceValue: 'Large',
              targetOptionLabel: 'Leather',
              isActive: true,
              createdAt: '2026-04-08T11:00:00.000Z',
              updatedAt: '2026-04-08T11:00:00.000Z',
            },
            {
              id: 'rule-3',
              externalCategoryId: 'cat-jewellery',
              externalCategoryName: 'Jewellery',
              externalCategoryPath: 'Accessories > Jewellery',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              parameterId: 'param-metal',
              parameterName: 'Metal',
              parameterCatalogId: 'catalog-a',
              sourceValue: 'Gold',
              targetOptionLabel: '24K',
              isActive: true,
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:00:00.000Z',
            },
          ],
        }),
        traderaParameterMapperCatalogJson: JSON.stringify({
          version: 1,
          entries: [
            {
              id: 'cat-jewellery:jewellerymaterial',
              externalCategoryId: 'cat-jewellery',
              externalCategoryName: 'Jewellery',
              externalCategoryPath: 'Accessories > Jewellery',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              optionLabels: ['18K', '24K'],
              source: 'playwright',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              runId: 'run-1',
            },
            {
              id: 'cat-jewellery:stonetype',
              externalCategoryId: 'cat-jewellery',
              externalCategoryName: 'Jewellery',
              externalCategoryPath: 'Accessories > Jewellery',
              fieldLabel: 'Stone Type',
              fieldKey: 'stonetype',
              optionLabels: ['Diamond'],
              source: 'playwright',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              runId: 'run-1',
            },
            {
              id: 'cat-jewellery:puritycode',
              externalCategoryId: 'cat-jewellery',
              externalCategoryName: 'Jewellery',
              externalCategoryPath: 'Accessories > Jewellery',
              fieldLabel: 'Purity Code',
              fieldKey: 'puritycode',
              optionLabels: ['24K'],
              source: 'playwright',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              runId: 'run-1',
            },
          ],
          categoryFetches: [
            {
              externalCategoryId: 'cat-jewellery',
              externalCategoryName: 'Jewellery',
              externalCategoryPath: 'Accessories > Jewellery',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              fieldCount: 3,
              runId: 'run-1',
            },
            {
              externalCategoryId: 'cat-watches',
              externalCategoryName: 'Watches',
              externalCategoryPath: 'Accessories > Watches',
              fetchedAt: '2026-04-08T11:00:00.000Z',
              fieldCount: 0,
              runId: 'run-2',
            },
          ],
        }),
      },
      {
        id: 'connection-2',
        integrationId: 'integration-tradera',
        name: 'Secondary Tradera',
        traderaParameterMapperRulesJson: null,
        traderaParameterMapperCatalogJson: null,
      },
    ],
    isLoading: false,
    refetch: refetchConnectionsMock,
  }),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpsertConnection: () => ({
    mutateAsync: upsertConnectionMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useMarketplaceMutations', () => ({
  useFetchExternalCategoriesMutation: () => ({
    mutateAsync: fetchExternalCategoriesMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useIntegrationProductQueries', () => ({
  useIntegrationCatalogs: () => ({
    data: [{ id: 'catalog-a', name: 'Main Catalog', isDefault: true }],
  }),
}));

vi.mock('@/features/integrations/hooks/useTraderaParameterMapper', () => ({
  useTraderaParameterMapperParameters: () => ({
    data: [
      {
        id: 'param-metal',
        catalogId: 'catalog-a',
        name: 'Metal',
        name_en: 'Metal',
        name_pl: null,
        name_de: null,
        selectorType: 'select',
        optionLabels: ['Metal'],
      },
      {
        id: 'param-size',
        catalogId: 'catalog-a',
        name: 'Size',
        name_en: 'Size',
        name_pl: null,
        name_de: null,
        selectorType: 'select',
        optionLabels: ['Large'],
      },
    ],
  }),
  useFetchTraderaParameterMapperCatalogMutation: () => ({
    mutateAsync: fetchCatalogMutateAsyncMock,
    isPending: false,
    variables: null,
  }),
}));

vi.mock('@/features/integrations/hooks/useMarketplaceQueries', () => ({
  useExternalCategories: (...args: unknown[]) => useExternalCategoriesMock(...args),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  CompactEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  LoadingState: ({ message, label }: { message?: string; label?: string }) => (
    <div>{message ?? label}</div>
  ),
  SectionHeader: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  UI_GRID_RELAXED_CLASSNAME: 'grid-relaxed',
  UI_GRID_ROOMY_CLASSNAME: 'grid-roomy',
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <span>{description}</span> : null}
      {children}
    </label>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    disabled,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value=''>Select an option</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type='button'>{children}</button>,
  useToast: () => ({
    toast: toastMock,
  }),
}));

import TraderaParameterMappingPage from './TraderaParameterMappingPage';

describe('TraderaParameterMappingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertConnectionMutateAsyncMock.mockResolvedValue(undefined);
    fetchExternalCategoriesMutateAsyncMock.mockResolvedValue({
      fetched: 2,
      total: 2,
      message: 'Successfully synced 2 categories from Tradera listing form picker.',
      source: 'Tradera listing form picker',
    });
    fetchCatalogMutateAsyncMock.mockResolvedValue({
      connectionId: 'connection-1',
      externalCategoryId: 'cat-jewellery',
      entries: [],
      message: 'No additional Tradera dropdown fields were detected.',
    });
    refetchConnectionsMock.mockResolvedValue(undefined);
    useExternalCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'external-1',
          externalId: 'cat-jewellery',
          name: 'Jewellery',
          path: 'Accessories > Jewellery',
          isLeaf: true,
          depth: 1,
          metadata: {
            categoryFetchSource: 'Tradera listing form picker',
          },
        },
        {
          id: 'external-2',
          externalId: 'cat-watches',
          name: 'Watches',
          path: 'Accessories > Watches',
          isLeaf: true,
          depth: 1,
          metadata: {
            categoryFetchSource: 'Tradera listing form picker',
          },
        },
      ],
      isLoading: false,
    });
  });

  it('clears a stale target option when switching to a different Tradera field', async () => {
    render(<TraderaParameterMappingPage />);

    fireEvent.change(screen.getByLabelText('Tradera option'), {
      target: { value: '24K' },
    });
    expect(screen.getByLabelText('Tradera option')).toHaveValue('24K');

    fireEvent.change(screen.getByLabelText('Tradera field'), {
      target: { value: 'cat-jewellery:stonetype' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Tradera option')).toHaveValue('');
    });

    fireEvent.change(screen.getByLabelText('Source value'), {
      target: { value: 'Metal' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save rule/i }));

    expect(upsertConnectionMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Choose the Tradera dropdown option to apply.',
      expect.objectContaining({ variant: 'error' })
    );
  });

  it('clears the target option when switching to a different field even if the label exists there too', async () => {
    render(<TraderaParameterMappingPage />);

    fireEvent.change(screen.getByLabelText('Tradera option'), {
      target: { value: '24K' },
    });

    expect(screen.getByLabelText('Tradera option')).toHaveValue('24K');

    fireEvent.change(screen.getByLabelText('Tradera field'), {
      target: { value: 'cat-jewellery:puritycode' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Tradera option')).toHaveValue('');
    });
  });

  it('clears the current draft when switching to a different Tradera connection', async () => {
    render(<TraderaParameterMappingPage />);

    fireEvent.change(screen.getByLabelText('Source value'), {
      target: { value: 'Metal' },
    });
    fireEvent.change(screen.getByLabelText('Tradera option'), {
      target: { value: '24K' },
    });

    expect(screen.getByLabelText('Source value')).toHaveValue('Metal');
    expect(screen.getByLabelText('Tradera option')).toHaveValue('24K');

    fireEvent.change(screen.getByLabelText('Tradera connection'), {
      target: { value: 'connection-2' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Source value')).toHaveValue('');
      expect(screen.getByLabelText('Tradera option')).toHaveValue('');
    });
  });

  it('clears the source value when switching to a different product parameter', async () => {
    render(<TraderaParameterMappingPage />);

    fireEvent.change(screen.getByLabelText('Source value'), {
      target: { value: 'Metal' },
    });

    expect(screen.getByLabelText('Source value')).toHaveValue('Metal');

    fireEvent.change(screen.getByLabelText('Product parameter'), {
      target: { value: 'param-size' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Source value')).toHaveValue('');
    });
  });

  it('lists all current Tradera categories with fetch status and actions', async () => {
    render(<TraderaParameterMappingPage />);

    expect(screen.getByText('2 stale mapping rules.')).toBeInTheDocument();
    expect(screen.getByText('2 fetched Tradera categories.')).toBeInTheDocument();
    expect(screen.getAllByText('Accessories > Jewellery').length).toBeGreaterThan(0);
    expect(screen.getByText('3 extra field catalogs stored.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1 stale mapping rule references this category.')).toBeInTheDocument();
    });
    expect(screen.getByText(/Last fetch:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refetch Dropdowns' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fetch Tradera category'), {
      target: { value: 'cat-watches' },
    });

    expect(screen.getAllByText('Accessories > Jewellery').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Accessories > Watches').length).toBeGreaterThan(0);
    expect(screen.getByText('3 field catalogs stored')).toBeInTheDocument();
    expect(screen.getByText('Fetched, no additional fields found')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Missing option: Silver')).toBeInTheDocument();
    expect(screen.getByText('Field missing from current catalog')).toBeInTheDocument();
    expect(screen.getAllByText('1 stale rule').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Refetch Dropdowns' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Refetch' }).length).toBeGreaterThan(0);
  });

  it('can focus the rules table on stale mappings only', async () => {
    render(<TraderaParameterMappingPage />);

    expect(screen.getByText('Showing all 3 mapping rules.')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Stale Only' }));

    await waitFor(() => {
      expect(screen.getByText('Showing 2 stale mapping rules.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(screen.getByText('Missing option: Silver')).toBeInTheDocument();
    expect(screen.getByText('Field missing from current catalog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show All Rules' }));

    await waitFor(() => {
      expect(screen.getByText('Showing all 3 mapping rules.')).toBeInTheDocument();
    });

    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('syncs the fetch panel selection when a category row refetch is used', async () => {
    render(<TraderaParameterMappingPage />);

    expect(screen.getByLabelText('Fetch Tradera category')).toHaveValue('cat-jewellery');

    const watchesRow = screen
      .getByText('Fetched, no additional fields found')
      .closest('tr');
    expect(watchesRow).not.toBeNull();

    fireEvent.click(within(watchesRow as HTMLElement).getByRole('button', { name: 'Refetch' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Fetch Tradera category')).toHaveValue('cat-watches');
    });

    expect(fetchCatalogMutateAsyncMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      externalCategoryId: 'cat-watches',
    });
  });

  it('opens the relevant category in the catalogs tab when reviewing a stale rule', async () => {
    render(<TraderaParameterMappingPage />);

    expect(screen.getByLabelText('Fetch Tradera category')).toHaveValue('cat-jewellery');

    const watchesRuleRow = screen.getByText('Band Material').closest('tr');
    expect(watchesRuleRow).not.toBeNull();

    fireEvent.click(within(watchesRuleRow as HTMLElement).getByRole('button', { name: 'Review' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Fetch Tradera category')).toHaveValue('cat-watches');
    });
  });

  it('jumps to the first stale category from the stale-rule banner', async () => {
    render(<TraderaParameterMappingPage />);

    expect(screen.getByLabelText('Fetch Tradera category')).toHaveValue('cat-jewellery');

    fireEvent.click(screen.getByRole('button', { name: 'Review Stale Rules' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Fetch Tradera category')).toHaveValue('cat-watches');
    });
  });

  it('warns when the synced Tradera tree still comes from shallow public taxonomy pages', () => {
    useExternalCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'external-1',
          externalId: 'cat-collectibles',
          name: 'Collectibles',
          path: 'Collectibles',
          isLeaf: true,
          depth: 0,
          metadata: {
            categoryFetchSource: 'Tradera public taxonomy pages',
          },
        },
        {
          id: 'external-2',
          externalId: 'cat-pins',
          name: 'Pins',
          path: 'Collectibles > Pins',
          isLeaf: true,
          depth: 1,
          metadata: {
            categoryFetchSource: 'Tradera public taxonomy pages',
          },
        },
      ],
      isLoading: false,
    });

    render(<TraderaParameterMappingPage />);

    expect(
      screen.getByText(
        /Synced Tradera category tree: Tradera public taxonomy pages\. Loaded 2 categories, 2 leaf categories, max depth 1\./i
      )
    ).toBeInTheDocument();
      expect(
        screen.getByText(
        /This tree still comes from the shallow public taxonomy pages\. Re-fetch Tradera categories in Category Mapper using Listing form picker/i
        )
      ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Category Mapper' })).toHaveAttribute(
      'href',
      '/admin/integrations/marketplaces/category-mapper?marketplace=tradera&connectionId=connection-1'
    );
  });

  it('still offers category resync when the Tradera tree comes from public taxonomy pages', () => {
    useExternalCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'external-1',
          externalId: 'cat-accessories',
          name: 'Accessories',
          path: 'Accessories',
          isLeaf: false,
          depth: 0,
          metadata: {
            categoryFetchSource: 'Tradera public taxonomy pages',
          },
        },
        {
          id: 'external-2',
          externalId: 'cat-patches',
          name: 'Patches & pins',
          path: 'Accessories > Patches & pins',
          isLeaf: false,
          depth: 1,
          metadata: {
            categoryFetchSource: 'Tradera public taxonomy pages',
          },
        },
        {
          id: 'external-3',
          externalId: 'cat-pins',
          name: 'Pins',
          path: 'Accessories > Patches & pins > Pins',
          isLeaf: true,
          depth: 2,
          metadata: {
            categoryFetchSource: 'Tradera public taxonomy pages',
          },
        },
      ],
      isLoading: false,
    });

    render(<TraderaParameterMappingPage />);

      expect(
        screen.getByText(
        /This tree comes from the public taxonomy pages\. If Tradera category matches still feel too broad, sync Tradera categories again using Listing form picker/i
        )
      ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync Tradera Categories' })).toBeInTheDocument();
  });

  it('warns when the synced Tradera tree is legacy and only reaches shallow levels', () => {
    useExternalCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'external-1',
          externalId: 'cat-collectibles',
          name: 'Collectibles',
          path: 'Collectibles',
          isLeaf: true,
          depth: 0,
          metadata: null,
        },
        {
          id: 'external-2',
          externalId: 'cat-pins',
          name: 'Pins',
          path: 'Collectibles > Pins',
          isLeaf: true,
          depth: 1,
          metadata: null,
        },
      ],
      isLoading: false,
    });

    render(<TraderaParameterMappingPage />);

    expect(
      screen.getByText(
        /Synced Tradera category tree: legacy \/ unknown source\. Loaded 2 categories, 2 leaf categories, max depth 1\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This tree appears to be legacy or missing source metadata and only reaches shallow levels\. Sync Tradera categories again using Listing form picker/i
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync Tradera Categories' })).toBeInTheDocument();
  });

  it('can sync Tradera categories directly from the shallow-tree warning', async () => {
    useExternalCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'external-1',
          externalId: 'cat-collectibles',
          name: 'Collectibles',
          path: 'Collectibles',
          isLeaf: true,
          depth: 0,
          metadata: {
            categoryFetchSource: 'Tradera public taxonomy pages',
          },
        },
      ],
      isLoading: false,
    });

    render(<TraderaParameterMappingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync Tradera Categories' }));

    await waitFor(() => {
      expect(fetchExternalCategoriesMutateAsyncMock).toHaveBeenCalledWith({
        connectionId: 'connection-1',
        categoryFetchMethod: 'playwright_listing_form',
      });
    });

    expect(toastMock).toHaveBeenCalledWith(
      'Successfully synced 2 categories from Tradera listing form picker.',
      expect.objectContaining({ variant: 'success' })
    );
  });
});
