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
import type { CategoryMappingWithDetails, ExternalCategory } from '@/shared/contracts/integrations';
import type { CatalogRecord, ProductCategory } from '@/shared/contracts/products';

const mocks = vi.hoisted(() => ({
  catalogs: [] as unknown[],
  internalCategories: [] as unknown[],
  externalCategories: [] as unknown[],
  mappings: [] as unknown[],
  toast: vi.fn(),
  fetchMutateAsync: vi.fn(),
  saveMutateAsync: vi.fn(),
}));

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
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
  const { pendingMappings, staleMappings, stats } = useCategoryMapperUIState();
  const { handleAutoMatchByName, getMappingForExternal } = useCategoryMapperActions();

  return (
    <div>
      <div data-testid='selected-catalog'>{selectedCatalogId ?? 'none'}</div>
      <div data-testid='pending-count'>{String(pendingMappings.size)}</div>
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
    </div>
  );
}

describe('CategoryMapperProvider auto-match by name', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.fetchMutateAsync.mockReset();
    mocks.saveMutateAsync.mockReset();

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
});
