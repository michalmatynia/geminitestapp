import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CategoryMapperProvider,
  useCategoryMapperActions,
  useCategoryMapperData,
  useCategoryMapperUIState,
} from './CategoryMapperContext';
import type { CategoryMappingWithDetails, ExternalCategory } from '@/shared/contracts/integrations/listings';
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

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/primitives.public')>(
    '@/shared/ui/primitives.public'
  );
  return {
    ...actual,
    useToast: () => ({
      toast: mocks.toast,
    }),
  };
});

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

const createCategoryMapping = (
  overrides: Partial<CategoryMappingWithDetails> & {
    id: string;
    externalCategoryId: string;
    internalCategoryId: string | null;
    externalCategory: ExternalCategory;
    internalCategory: ProductCategory | null;
  }
): CategoryMappingWithDetails => ({
  id: overrides.id,
  connectionId: overrides.connectionId ?? 'conn-1',
  externalCategoryId: overrides.externalCategoryId,
  internalCategoryId: overrides.internalCategoryId,
  catalogId: overrides.catalogId ?? 'catalog-1',
  isActive: overrides.isActive ?? true,
  externalCategory: overrides.externalCategory,
  internalCategory: overrides.internalCategory,
  createdAt: overrides.createdAt ?? '2026-03-22T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-22T00:00:00.000Z',
});

function Harness(): React.JSX.Element {
  const { selectedCatalogId, categoryTree } = useCategoryMapperData();
  const {
    pendingMappings,
    lastFetchWarning,
    staleMappings,
    stats,
    categoryFetchMethod,
  } = useCategoryMapperUIState();
  const {
    handleAutoMatchByName,
    getMappingForExternal,
    handleFetchExternalCategories,
    handleMappingChange,
    handleSave,
  } = useCategoryMapperActions();

  return (
    <div>
      <div data-testid='selected-catalog'>{selectedCatalogId ?? 'none'}</div>
      <div data-testid='pending-count'>{String(pendingMappings.size)}</div>
      <div data-testid='fetch-method'>{categoryFetchMethod}</div>
      <div data-testid='fetch-warning'>{lastFetchWarning?.message ?? 'none'}</div>
      <div data-testid='stale-count'>{String(stats.stale)}</div>
      <div data-testid='unmapped-count'>{String(stats.unmapped)}</div>
      <div data-testid='stale-summary'>
        {JSON.stringify(staleMappings)}
      </div>
      <div data-testid='mapping-ext-match'>
        {getMappingForExternal('market-ext-match') ?? 'none'}
      </div>
      <div data-testid='mapping-ext-saved'>
        {getMappingForExternal('market-ext-saved') ?? 'none'}
      </div>
      <div data-testid='tree-shape'>
        {JSON.stringify(
          categoryTree.map((node) => ({
            name: node.name,
            children: (node.subRows ?? []).map((child) => child.name),
          }))
        )}
      </div>
      <button type='button' onClick={handleAutoMatchByName}>
        Run auto match
      </button>
      <button type='button' onClick={() => void handleFetchExternalCategories()}>
        Fetch external categories
      </button>
      <button type='button' onClick={() => handleMappingChange('market-nonleaf', 'int-office')}>
        Set non-leaf mapping
      </button>
      <button type='button' onClick={() => void handleSave()}>
        Save mappings
      </button>
    </div>
  );
}

describe('CategoryMapperProvider auto-match by name', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.fetchMutateAsync.mockReset();
    mocks.saveMutateAsync.mockReset();
    mocks.settingsMap = new Map();

    const deskLamps = createInternalCategory({ id: 'int-desk', name: 'Desk Lamps' });

    mocks.catalogs = [createCatalog({ id: 'catalog-1', name: 'Default catalog' })];
    mocks.internalCategories = [
      createInternalCategory({ id: 'int-office', name: 'office chairs' }),
      deskLamps,
      createInternalCategory({ id: 'int-light-1', name: 'Lighting' }),
      createInternalCategory({ id: 'int-light-2', name: 'Lighting' }),
    ];
    mocks.externalCategories = [
      createExternalCategory({ id: 'ext-match', name: ' Office   Chairs ' }),
      createExternalCategory({ id: 'ext-saved', name: 'Desk Lamps' }),
      createExternalCategory({ id: 'ext-ambiguous', name: 'Lighting' }),
      createExternalCategory({ id: 'ext-unmatched', name: 'Garden' }),
    ];
    mocks.mappings = [
      createCategoryMapping({
        id: 'mapping-1',
        externalCategoryId: 'market-ext-saved',
        internalCategoryId: 'int-desk',
        externalCategory: createExternalCategory({ id: 'ext-saved', name: 'Desk Lamps' }),
        internalCategory: deskLamps,
      }),
      createCategoryMapping({
        id: 'mapping-stale',
        externalCategoryId: 'market-ext-stale',
        internalCategoryId: 'int-office',
        externalCategory: createExternalCategory({
          id: 'ext-stale',
          externalId: 'market-ext-stale',
          name: '[Missing external category: Legacy Office Chairs]',
        }),
        internalCategory: createInternalCategory({ id: 'int-office', name: 'office chairs' }),
      }),
    ];
  });

  it('adds unique name matches as pending mappings and preserves existing saved mappings', async () => {
    const user = userEvent.setup();

    render(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Base'>
        <Harness />
      </CategoryMapperProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-catalog')).toHaveTextContent('catalog-1')
    );

    await user.click(screen.getByRole('button', { name: 'Run auto match' }));

    await waitFor(() => expect(screen.getByTestId('pending-count')).toHaveTextContent('1'));

    expect(screen.getByTestId('mapping-ext-match')).toHaveTextContent('int-office');
    expect(screen.getByTestId('mapping-ext-saved')).toHaveTextContent('int-desk');
    expect(screen.getByTestId('stale-count')).toHaveTextContent('1');
    expect(screen.getByTestId('unmapped-count')).toHaveTextContent('2');
    expect(screen.getByTestId('stale-summary')).toHaveTextContent('Legacy Office Chairs');
    expect(screen.getByTestId('stale-summary')).toHaveTextContent('"externalCategoryPath":null');
    expect(screen.getByTestId('stale-summary')).toHaveTextContent('office chairs');
    expect(mocks.toast).toHaveBeenCalledWith(
      'Matched 1 category, 1 already mapped, 1 ambiguous, 1 unmatched.',
      { variant: 'success' }
    );
  });

  it('defaults browser Tradera fetches to the listing form picker when no setting is saved', async () => {
    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <Harness />
      </CategoryMapperProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('fetch-method')).toHaveTextContent('playwright_listing_form')
    );
  });

  it('does not let an old saved public Tradera setting override the listing form default', async () => {
    const user = userEvent.setup();
    mocks.settingsMap = new Map([['tradera_category_fetch_method', 'playwright']]);
    mocks.fetchMutateAsync.mockResolvedValue({
      fetched: 0,
      total: 0,
      source: 'Tradera listing form picker',
      message: 'No categories found in Tradera listing form picker.',
      categoryStats: {
        rootCount: 0,
        withParentCount: 0,
        maxDepth: 0,
        depthHistogram: {},
      },
    });

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationSlug='tradera'
      >
        <Harness />
      </CategoryMapperProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('fetch-method')).toHaveTextContent('playwright_listing_form')
    );

    await user.click(screen.getByRole('button', { name: 'Fetch external categories' }));

    await waitFor(() =>
      expect(mocks.fetchMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        categoryFetchMethod: 'playwright_listing_form',
      })
    );
  });

  it('builds a nested tree from parent external ids instead of returning only roots', async () => {
    mocks.internalCategories = [];
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
    mocks.mappings = [];

    render(
      <CategoryMapperProvider connectionId='conn-1' connectionName='Base'>
        <Harness />
      </CategoryMapperProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('tree-shape')).toHaveTextContent(
        JSON.stringify([
          {
            name: 'PINS',
            children: ['Anime Pins', 'Gaming Pins', 'Movie Pins'],
          },
        ])
      )
    );
  });

  it('shows the fetch error directly when category sync fails', async () => {
    const user = userEvent.setup();
    mocks.fetchMutateAsync.mockRejectedValue(
      new Error(
        'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed.'
      )
    );

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationId='integration-tradera'
        integrationSlug='tradera'
      >
        <Harness />
      </CategoryMapperProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Fetch external categories' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed.',
        { variant: 'error' }
      )
    );
  });

  it('stores and clears the shallow Tradera fetch warning around successive fetch attempts', async () => {
    const user = userEvent.setup();
    const shallowFetchError = new ApiError(
      'Tradera public taxonomy pages returned a shallower category tree than the categories already stored. Existing categories were kept. Retry the fetch using Listing form picker.',
      422
    );
    shallowFetchError.payload = {
      message: shallowFetchError.message,
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

    mocks.fetchMutateAsync
      .mockRejectedValueOnce(shallowFetchError)
      .mockResolvedValueOnce({
        fetched: 4,
        total: 4,
        source: 'Tradera listing form picker',
        message: 'Successfully synced 4 categories from Tradera listing form picker (roots: 1, max depth: 3).',
        categoryStats: {
          rootCount: 1,
          withParentCount: 3,
          maxDepth: 3,
          depthHistogram: { '0': 1, '1': 1, '2': 1, '3': 1 },
        },
      });

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationId='integration-tradera'
        integrationSlug='tradera'
      >
        <Harness />
      </CategoryMapperProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Fetch external categories' }));

    await waitFor(() =>
      expect(screen.getByTestId('fetch-warning')).toHaveTextContent(
        'Tradera public taxonomy pages returned a shallower category tree than the categories already stored. Existing categories were kept.'
      )
    );

    await user.click(screen.getByRole('button', { name: 'Fetch external categories' }));

    await waitFor(() => expect(screen.getByTestId('fetch-warning')).toHaveTextContent('none'));
  });

  it('skips non-leaf Tradera categories during auto-match', async () => {
    const user = userEvent.setup();

    mocks.internalCategories = [
      createInternalCategory({ id: 'int-pins', name: 'Pins & needles' }),
    ];
    mocks.externalCategories = [
      createExternalCategory({
        id: 'ext-parent',
        externalId: 'market-parent',
        name: 'Pins & needles',
        path: 'Collectibles > Pins & needles',
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'ext-leaf',
        externalId: 'market-leaf',
        name: 'Other pins & needles',
        path: 'Collectibles > Pins & needles > Other pins & needles',
        isLeaf: true,
      }),
    ];
    mocks.mappings = [];

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationId='integration-tradera'
        integrationSlug='tradera'
      >
        <Harness />
      </CategoryMapperProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-catalog')).toHaveTextContent('catalog-1')
    );

    await user.click(screen.getByRole('button', { name: 'Run auto match' }));

    expect(screen.getByTestId('pending-count')).toHaveTextContent('0');
    expect(mocks.toast).toHaveBeenCalledWith('Matched 0 categories, 1 unmatched.', {
      variant: 'info',
    });
  });

  it('blocks saving non-leaf Tradera mappings before the request is sent', async () => {
    const user = userEvent.setup();

    mocks.externalCategories = [
      createExternalCategory({
        id: 'ext-parent',
        externalId: 'market-nonleaf',
        name: 'Pins & needles',
        path: 'Collectibles > Pins & needles',
        isLeaf: false,
      }),
      createExternalCategory({
        id: 'ext-leaf',
        externalId: 'market-leaf',
        name: 'Other pins & needles',
        path: 'Collectibles > Pins & needles > Other pins & needles',
        isLeaf: true,
      }),
    ];
    mocks.mappings = [];

    render(
      <CategoryMapperProvider
        connectionId='conn-1'
        connectionName='Tradera'
        integrationId='integration-tradera'
        integrationSlug='tradera'
      >
        <Harness />
      </CategoryMapperProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-catalog')).toHaveTextContent('catalog-1')
    );

    await user.click(screen.getByRole('button', { name: 'Set non-leaf mapping' }));
    await user.click(screen.getByRole('button', { name: 'Save mappings' }));

    expect(mocks.saveMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Tradera mappings must target the deepest category. "Collectibles > Pins & needles" still has child categories. Choose a leaf Tradera category and save again.',
      { variant: 'error' }
    );
  });
});
