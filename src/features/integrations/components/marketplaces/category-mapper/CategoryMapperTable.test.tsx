import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryMapperProvider } from '@/features/integrations/context/CategoryMapperContext';
import { CategoryMapperTable } from './CategoryMapperTable';
import type { ExternalCategory } from '@/shared/contracts/integrations';
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

vi.mock('@/shared/ui', () => ({
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
  StandardDataTablePanel: ({
    title,
    description,
    headerActions,
    alerts,
    data,
    expanded,
    getSubRows,
  }: {
    title: string;
    description?: string;
    headerActions?: React.ReactNode;
    alerts?: React.ReactNode;
    data?: Array<{ id: string; name: string; subRows?: Array<{ id: string; name: string }> }>;
    expanded?: Record<string, boolean>;
    getSubRows?: (
      row: { id: string; name: string; subRows?: Array<{ id: string; name: string }> }
    ) => Array<{ id: string; name: string; subRows?: Array<{ id: string; name: string }> }> | undefined;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {headerActions}
      {alerts}
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
  GenericMapperStats: ({
    total,
    mapped,
    pending,
    itemLabel,
  }: {
    total: number;
    mapped: number;
    pending: number;
    itemLabel?: string;
  }) => (
    <div data-testid='mapper-stats'>
      {itemLabel}:{total}:{mapped}:{pending}
    </div>
  ),
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
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
  useToast: () => ({
    toast: mocks.toast,
  }),
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

    const autoMatchButton = await screen.findByRole('button', { name: 'Auto-match Names' });

    await waitFor(() => expect(autoMatchButton).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.click(autoMatchButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save (1)' })).toBeEnabled()
    );

    expect(mocks.toast).toHaveBeenCalledWith('Matched 1 category.', {
      variant: 'success',
    });
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
});
