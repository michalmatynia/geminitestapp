import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryMapperProvider } from '@/features/integrations/context/CategoryMapperContext';
import { CategoryMapperTable } from './CategoryMapperTable';
import type { ExternalCategory } from '@/shared/contracts/integrations/listings';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import { ApiError } from '@/shared/lib/api-client';

const mocks = vi.hoisted(() => ({
  catalogs: [] as unknown[],
  internalCategories: [] as unknown[],
  externalCategories: [] as unknown[],
  mappings: [] as unknown[],
  settingsMap: new Map<string, string>(),
  toast: vi.fn(),
  fetchMutateAsync: vi.fn(),
  saveMutateAsync: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Alert: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid='mapper-alert'>{children}</div>,
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    ariaLabel,
    title,
  }: {
    value: string | undefined;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>{placeholder ?? 'Select catalog'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  CompactEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  StandardDataTablePanel: ({
    title,
    description,
    headerActions,
    filters,
    alerts,
    data,
    expanded,
    getSubRows,
    emptyState,
  }: {
    title: string;
    description?: string;
    headerActions?: React.ReactNode;
    filters?: React.ReactNode;
    alerts?: React.ReactNode;
    data?: Array<{ id: string; name: string; subRows?: Array<{ id: string; name: string }> }>;
    expanded?: Record<string, boolean>;
    getSubRows?: (
      row: { id: string; name: string; subRows?: Array<{ id: string; name: string }> }
    ) => Array<{ id: string; name: string; subRows?: Array<{ id: string; name: string }> }> | undefined;
    emptyState?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {headerActions}
      {filters}
      {alerts}
      {(data ?? []).length === 0 && emptyState ? <div data-testid='panel-empty-state'>{emptyState}</div> : null}
      <ul data-testid='category-tree'>
        {(data ?? []).map(function renderRow(row) {
          const subRows = getSubRows?.(row) ?? row.subRows ?? [];
          const isExpanded = expanded?.[row.id] ?? false;

          return (
            <li key={row.id}>
              <span>{row.name}</span>
              {isExpanded && subRows.length > 0 ? (
                <ul>
                  {subRows.map((child) => renderRow(child))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  ),
  GenericMapperStats: ({
    total,
    mapped,
    unmapped,
    pending,
    itemLabel,
  }: {
    total: number;
    mapped: number;
    unmapped?: number;
    pending: number;
    itemLabel?: string;
  }) => (
    <div data-testid='mapper-stats'>
      {itemLabel}:{total}:{mapped}:{unmapped ?? 'na'}:{pending}
    </div>
  ),
}));

vi.mock('@/features/integrations/hooks/useIntegrationProductQueries', () => ({
  useIntegrationCatalogs: () => ({
    data: mocks.catalogs,
    isLoading: false,
  }),
  useIntegrationProductCategories: () => ({
    data: mocks.internalCategories,
    isLoading: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useMarketplaceQueries', () => ({
  useExternalCategories: () => ({
    data: mocks.externalCategories,
    isLoading: false,
  }),
  useCategoryMappings: () => ({
    data: mocks.mappings,
    isLoading: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useMarketplaceMutations', () => ({
  useFetchExternalCategoriesMutation: () => ({
    isPending: false,
    mutateAsync: mocks.fetchMutateAsync,
  }),
  useSaveMappingsMutation: () => ({
    isPending: false,
    mutateAsync: mocks.saveMutateAsync,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: mocks.settingsMap,
  }),
}));

const createCatalog = (
  overrides: Partial<CatalogRecord> & Pick<CatalogRecord, 'id' | 'name'>
): CatalogRecord => ({
  id: overrides.id,
  name: overrides.name,
  description: overrides.description ?? null,
  isDefault: overrides.isDefault ?? true,
  languageIds: overrides.languageIds ?? ['pl'],
  defaultLanguageId: overrides.defaultLanguageId ?? 'pl',
  defaultPriceGroupId: overrides.defaultPriceGroupId ?? null,
  priceGroupIds: overrides.priceGroupIds ?? [],
  createdAt: overrides.createdAt ?? '2026-03-22T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-22T00:00:00.000Z',
});

const createInternalCategory = (
  overrides: Partial<ProductCategory> & Pick<ProductCategory, 'id' | 'name'>
): ProductCategory => ({
  id: overrides.id,
  name: overrides.name,
  description: overrides.description ?? null,
  name_en: overrides.name_en ?? null,
  name_pl: overrides.name_pl ?? null,
  name_de: overrides.name_de ?? null,
  color: overrides.color ?? null,
  parentId: overrides.parentId ?? null,
  catalogId: overrides.catalogId ?? 'catalog-1',
  sortIndex: overrides.sortIndex ?? null,
  createdAt: overrides.createdAt ?? '2026-03-22T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-22T00:00:00.000Z',
});

const createExternalCategory = (
  overrides: Partial<ExternalCategory> & Pick<ExternalCategory, 'id' | 'name'>
): ExternalCategory => ({
  id: overrides.id,
  connectionId: overrides.connectionId ?? 'conn-1',
  externalId: overrides.externalId ?? `market-${overrides.id}`,
  name: overrides.name,
  parentExternalId: overrides.parentExternalId ?? null,
  path: overrides.path ?? null,
  depth: overrides.depth ?? 0,
  isLeaf: overrides.isLeaf ?? true,
  metadata: overrides.metadata ?? null,
  fetchedAt: overrides.fetchedAt ?? '2026-03-22T00:00:00.000Z',
  createdAt: overrides.createdAt ?? '2026-03-22T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-22T00:00:00.000Z',
});

describe('CategoryMapperTable', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.fetchMutateAsync.mockReset();
    mocks.saveMutateAsync.mockReset();
    mocks.settingsMap = new Map();

    mocks.catalogs = [createCatalog({ id: 'catalog-1', name: 'Default catalog' })];
    mocks.internalCategories = [createInternalCategory({ id: 'int-1', name: 'office chairs' })];
    mocks.externalCategories = [
      createExternalCategory({ id: 'ext-1', name: ' Office   Chairs ' }),
    ];
    mocks.mappings = [];
  });

  it('updates the visible save count after auto-matching names', async () => {
    const user = userEvent.setup();

    render(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Base'>
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    const autoMatchButton = await screen.findByRole('button', { name: 'Auto-match Paths & Names' });

    await waitFor(() => expect(autoMatchButton).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByTestId('mapper-stats')).toHaveTextContent('Categories:1:0:1:0');

    await user.click(autoMatchButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save (1)' })).toBeEnabled()
    );

    expect(mocks.toast).toHaveBeenCalledWith('Matched 1 category.', {
      variant: 'success',
    });
  });

  it('shows the listing form picker method for browser Tradera connections', async () => {
    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    expect(
      screen.getByRole('option', { name: 'Listing form picker' })
    ).toBeInTheDocument();
  });

  it('orders browser Tradera fetch methods with listing form picker first', async () => {
    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    const fetchMethodSelect = screen.getByLabelText('Category fetch method');
    const optionLabels = within(fetchMethodSelect)
      .getAllByRole('option')
      .map((option) => option.textContent?.trim() ?? '')
      .filter((label) => label && label !== 'Select catalog');

    expect(optionLabels).toEqual([
      'Listing form picker',
      'Public taxonomy pages',
    ]);
  });

  it('renders nested external categories in the left-column tree when parent-child links exist', async () => {
    mocks.externalCategories = [
      createExternalCategory({
        id: 'pins-root',
        externalId: 'pins',
        name: 'PINS',
        depth: 0,
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'pins-anime',
        externalId: 'pins-anime',
        name: 'Anime Pins',
        parentExternalId: 'pins',
        depth: 1,
      }),
      createExternalCategory({
        id: 'pins-gaming',
        externalId: 'pins-gaming',
        name: 'Gaming Pins',
        parentExternalId: 'pins',
        depth: 1,
      }),
      createExternalCategory({
        id: 'pins-movie',
        externalId: 'pins-movie',
        name: 'Movie Pins',
        parentExternalId: 'pins',
        depth: 1,
      }),
    ];

    render(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Base'>
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('PINS')).toBeInTheDocument();
      expect(screen.getByText('Anime Pins')).toBeInTheDocument();
      expect(screen.getByText('Gaming Pins')).toBeInTheDocument();
      expect(screen.getByText('Movie Pins')).toBeInTheDocument();
    });
  });

  it('shows a warning when saved mappings point to missing marketplace categories', async () => {
    mocks.mappings = [
      {
        id: 'mapping-stale',
        connectionId: 'conn-1',
        externalCategoryId: 'market-missing',
        internalCategoryId: 'int-1',
        catalogId: 'catalog-1',
        isActive: true,
        createdAt: '2026-03-22T00:00:00.000Z',
        updatedAt: '2026-03-22T00:00:00.000Z',
        externalCategory: createExternalCategory({
          id: 'ext-missing',
          externalId: 'market-missing',
          name: '[Missing external category: Office Chairs]',
          path: 'Furniture > Office Chairs',
        }),
        internalCategory: createInternalCategory({ id: 'int-1', name: 'office chairs' }),
      },
    ];

    render(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Tradera'>
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    expect(await screen.findByTestId('mapper-alert')).toHaveTextContent(
      '1 saved mapping points to a missing marketplace category. Fetch categories and remap it before listing.'
    );
    expect(screen.getByTestId('mapper-alert')).toHaveTextContent(
      'Furniture > Office Chairs -> office chairs'
    );
  });

  it('shows a Tradera warning when saved mappings point to non-leaf marketplace categories', async () => {
    mocks.externalCategories = [
      createExternalCategory({
        id: 'ext-collectibles',
        externalId: '49',
        name: 'Collectibles',
        path: 'Collectibles',
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'ext-pins',
        externalId: '2929',
        name: 'Pins & needles',
        parentExternalId: '49',
        path: 'Collectibles > Pins & needles',
        depth: 1,
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'ext-other-pins',
        externalId: '292904',
        name: 'Other pins & needles',
        parentExternalId: '2929',
        path: 'Collectibles > Pins & needles > Other pins & needles',
        depth: 2,
        isLeaf: true,
      }),
    ];

    mocks.mappings = [
      {
        id: 'mapping-parent',
        connectionId: 'conn-1',
        externalCategoryId: '2929',
        internalCategoryId: 'int-1',
        catalogId: 'catalog-1',
        isActive: true,
        createdAt: '2026-03-22T00:00:00.000Z',
        updatedAt: '2026-03-22T00:00:00.000Z',
        externalCategory: createExternalCategory({
          id: 'ext-pins',
          externalId: '2929',
          name: 'Pins & needles',
          parentExternalId: '49',
          path: 'Collectibles > Pins & needles',
          depth: 1,
          isLeaf: false,
        }),
        internalCategory: createInternalCategory({ id: 'int-1', name: 'office chairs' }),
      },
    ];

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    const alerts = await screen.findAllByTestId('mapper-alert');
    expect(alerts[0]).toHaveTextContent(
      '1 saved Tradera mapping points to a parent category that still has child categories. Remap it to the deepest Tradera category before listing.'
    );
    expect(alerts[0]).toHaveTextContent(
      'Collectibles > Pins & needles -> office chairs'
    );
  });

  it('rerenders cleanly when fetched external categories appear after an empty state', async () => {
    mocks.externalCategories = [];

    const view = render(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Tradera'>
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    expect(screen.getByText('No external categories found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fetch Categories' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Marketplace Categories' })).toBeInTheDocument();

    mocks.externalCategories = [
      createExternalCategory({
        id: 'tradera-jewellery',
        externalId: 'tradera-jewellery',
        name: 'Jewellery',
      }),
    ];

    view.rerender(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Tradera'>
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Marketplace Categories' })).toBeInTheDocument();
      expect(screen.getByText('Jewellery')).toBeInTheDocument();
    });
  });

  it('shows Tradera fetch diagnostics after fetching categories from the public fallback', async () => {
    const user = userEvent.setup();
    mocks.fetchMutateAsync.mockResolvedValue({
      fetched: 12,
      total: 12,
      source: 'Tradera public taxonomy pages',
      message:
        'Successfully synced 12 categories from Tradera public taxonomy pages (roots: 4, max depth: 1).',
      categoryStats: {
        rootCount: 4,
        withParentCount: 8,
        maxDepth: 1,
        depthHistogram: {
          '0': 4,
          '1': 8,
        },
      },
    });

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Fetch Categories' }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(
        'Successfully synced 12 categories from Tradera public taxonomy pages (roots: 4, max depth: 1).',
        { variant: 'success' }
      );
    });

    const alerts = screen.getAllByTestId('mapper-alert');
    expect(alerts[0]).toHaveTextContent(
      'Category source: Tradera public taxonomy pages. Loaded 12 categories.'
    );
    expect(alerts[0]).toHaveTextContent(
      'Roots: 4. Categories with parents: 8. Max depth: 1.'
    );
    expect(alerts[0]).toHaveTextContent(
      'Tradera is using the public taxonomy-page fallback and only reached shallow levels. Switch to Listing form picker for deeper category coverage.'
    );
  });

  it('shows persisted fetch diagnostics from loaded external category metadata after reload', async () => {
    mocks.externalCategories = [
      createExternalCategory({
        id: 'ext-collectibles',
        externalId: '49',
        name: 'Collectibles',
        path: 'Collectibles',
        isLeaf: false,
        metadata: {
          categoryFetchSource: 'Tradera listing form picker',
        },
      }),
      createExternalCategory({
        id: 'ext-pins',
        externalId: '2929',
        name: 'Pins & needles',
        parentExternalId: '49',
        path: 'Collectibles > Pins & needles',
        depth: 1,
        isLeaf: false,
        metadata: {
          categoryFetchSource: 'Tradera listing form picker',
        },
      }),
      createExternalCategory({
        id: 'ext-other-pins',
        externalId: '292904',
        name: 'Other pins & needles',
        parentExternalId: '2929',
        path: 'Collectibles > Pins & needles > Other pins & needles',
        depth: 2,
        isLeaf: true,
        metadata: {
          categoryFetchSource: 'Tradera listing form picker',
        },
      }),
    ];

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    const alerts = await screen.findAllByTestId('mapper-alert');
    expect(alerts[0]).toHaveTextContent(
      'Category source: Tradera listing form picker. Loaded 3 categories.'
    );
    expect(alerts[0]).toHaveTextContent(
      'Roots: 1. Categories with parents: 2. Max depth: 2.'
    );
    expect(alerts[0]).not.toHaveTextContent(
      'Tradera is using the public taxonomy-page fallback and only reached shallow levels.'
    );
  });

  it('shows an inline warning when a shallow Tradera fallback fetch is rejected and existing categories are kept', async () => {
    const user = userEvent.setup();
    mocks.externalCategories = [
      createExternalCategory({
        id: 'ext-collectibles',
        externalId: '49',
        name: 'Collectibles',
        path: 'Collectibles',
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'ext-pins',
        externalId: '2929',
        name: 'Pins & needles',
        parentExternalId: '49',
        path: 'Collectibles > Pins & needles',
        depth: 1,
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'ext-other-pins',
        externalId: '292904',
        name: 'Other pins & needles',
        parentExternalId: '2929',
        path: 'Collectibles > Pins & needles > Other pins & needles',
        depth: 2,
        isLeaf: true,
      }),
    ];

    const error = new ApiError(
      'Tradera public taxonomy pages returned a shallower category tree than the categories already stored. Existing categories were kept. Retry the fetch using Listing form picker.',
      422
    );
    error.payload = {
      message: error.message,
      code: 'UNPROCESSABLE_ENTITY',
      httpStatus: 422,
      meta: {
        sourceName: 'Tradera public taxonomy pages',
        existingTotal: 3,
        existingMaxDepth: 2,
        fetchedTotal: 2,
        fetchedMaxDepth: 1,
      },
    };
    mocks.fetchMutateAsync.mockRejectedValue(error);

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <CategoryMapperTable />
      </CategoryMapperProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Fetch Categories' }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(error.message, { variant: 'error' });
    });

    const alerts = screen.getAllByTestId('mapper-alert');
    expect(alerts[0]).toHaveTextContent(
      'Tradera public taxonomy pages returned a shallower category tree than the categories already stored. Existing categories were kept.'
    );
    expect(alerts[0]).toHaveTextContent(
      'Stored categories kept: 3. Current max depth: 2. Rejected fetch max depth: 1.'
    );
    expect(alerts[0]).toHaveTextContent(
      'Current loaded tree roots: 1. Categories with parents: 2.'
    );
  });
});
