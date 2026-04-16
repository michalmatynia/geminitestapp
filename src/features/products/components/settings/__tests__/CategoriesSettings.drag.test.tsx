/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  onRefreshCategories: vi.fn(),
  reorderMutateAsync: vi.fn(),
  saveMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSettingsStore: () => ({
    map: new Map<string, string>(),
    isLoading: false,
    isFetching: false,
    error: null,
    get: () => undefined,
    getBoolean: (_key: string, fallback: boolean = false) => fallback,
    getNumber: (_key: string, fallback?: number) => fallback,
    refetch: vi.fn(),
  }),
  useSettingsStoreFetching: () => false,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/features/products/hooks/useCategoryQueries', () => ({
  useProductCategoryTree: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSaveCategoryMutation: () => ({
    mutateAsync: mocks.saveMutateAsync,
    isPending: false,
  }),
  useDeleteCategoryMutation: () => ({
    mutateAsync: mocks.deleteMutateAsync,
  }),
  useReorderCategoryMutation: () => ({
    mutateAsync: mocks.reorderMutateAsync,
  }),
}));

vi.mock('@/features/products/components/settings/ProductSettingsContext', () => ({
  useProductSettingsCategoriesContext: vi.fn(),
}));

const { useProductSettingsCategoriesContext } = await import(
  '@/features/products/components/settings/ProductSettingsContext'
);

const createDataTransfer = (): DataTransfer => {
  const store = new Map<string, string>();
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ''),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
};

const catalog: Catalog = {
  id: 'catalog-1',
  name: 'Default Catalog',
  isDefault: true,
  languageIds: ['lang-en'],
  defaultLanguageId: 'lang-en',
  defaultPriceGroupId: null,
  priceGroupIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createCategory = (
  overrides: Partial<ProductCategoryWithChildren>
): ProductCategoryWithChildren => ({
  id: 'category-id',
  name: 'Category',
  description: null,
  color: '#10b981',
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  children: [],
  ...overrides,
});

describe('CategoriesSettings drag and drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reorderMutateAsync.mockResolvedValue(undefined);
    mocks.saveMutateAsync.mockResolvedValue(undefined);
    mocks.deleteMutateAsync.mockResolvedValue(undefined);

    vi.mocked(useProductSettingsCategoriesContext).mockReturnValue({
      loadingCategories: false,
      categories: [
        createCategory({ id: 'root-a', name: 'Root A', sortIndex: 0 }),
        createCategory({ id: 'root-b', name: 'Root B', sortIndex: 1 }),
      ],
      catalogs: [catalog],
      selectedCategoryCatalogId: 'catalog-1',
      onCategoryCatalogChange: vi.fn(),
      onRefreshCategories: mocks.onRefreshCategories,
    });
  });

  it('persists an inside move when native dragstart targets the row wrapper', async () => {
    const { container } = render(<CategoriesSettings />);

    const sourceNode = container.querySelector(
      '[data-master-tree-node-id="category:root-a"]'
    ) as HTMLDivElement | null;
    const targetNode = container.querySelector(
      '[data-master-tree-node-id="category:root-b"]'
    ) as HTMLDivElement | null;

    expect(sourceNode).toBeTruthy();
    expect(targetNode).toBeTruthy();

    if (!sourceNode || !targetNode) {
      throw new Error('Expected source and target category tree nodes to render.');
    }

    const sourceHandle = sourceNode.querySelector(
      '[data-master-tree-drag-handle="category"]'
    ) as HTMLSpanElement | null;
    const sourceSurface = sourceNode.querySelector(
      '[data-master-tree-drag-surface="category"]'
    ) as HTMLDivElement | null;

    expect(sourceHandle).toBeTruthy();
    expect(sourceSurface).toBeTruthy();

    if (!sourceHandle || !sourceSurface) {
      throw new Error('Expected source category drag affordances to render.');
    }

    const rect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      width: 240,
      height: 36,
      bottom: 36,
      right: 240,
      toJSON: () => ({}),
    } satisfies DOMRect;

    sourceNode.getBoundingClientRect = vi.fn(() => rect);
    targetNode.getBoundingClientRect = vi.fn(() => rect);
    sourceHandle.getBoundingClientRect = vi.fn(() => rect);
    sourceSurface.getBoundingClientRect = vi.fn(() => rect);

    const dataTransfer = createDataTransfer();
    const originalElementFromPoint = document.elementFromPoint;
    const elementFromPoint = vi.fn(() => sourceSurface);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      writable: true,
      value: elementFromPoint,
    });

    try {
      fireEvent.dragStart(sourceNode, { dataTransfer, clientX: 24, clientY: 18 });
      fireEvent.dragOver(targetNode, { dataTransfer, clientY: 18 });
      fireEvent.drop(targetNode, { dataTransfer, clientY: 18 });
      fireEvent.dragEnd(sourceNode, { dataTransfer });

      await waitFor(() => {
        expect(mocks.reorderMutateAsync).toHaveBeenCalledWith({
          categoryId: 'root-a',
          parentId: 'root-b',
          position: 'inside',
          targetId: 'root-b',
          catalogId: 'catalog-1',
        });
      });
    } finally {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        writable: true,
        value: originalElementFromPoint,
      });
    }
  });

  it('does not start a drag when the pointer is over an inline action button', async () => {
    const { container } = render(<CategoriesSettings />);

    const sourceNode = container.querySelector(
      '[data-master-tree-node-id="category:root-a"]'
    ) as HTMLDivElement | null;
    const targetNode = container.querySelector(
      '[data-master-tree-node-id="category:root-b"]'
    ) as HTMLDivElement | null;

    expect(sourceNode).toBeTruthy();
    expect(targetNode).toBeTruthy();

    if (!sourceNode || !targetNode) {
      throw new Error('Expected source and target category tree nodes to render.');
    }

    const addButton = sourceNode.querySelector('button[title="Add subcategory"]') as
      | HTMLButtonElement
      | null;
    expect(addButton).toBeTruthy();

    if (!addButton) {
      throw new Error('Expected inline add button to render.');
    }

    const rect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      width: 240,
      height: 36,
      bottom: 36,
      right: 240,
      toJSON: () => ({}),
    } satisfies DOMRect;

    sourceNode.getBoundingClientRect = vi.fn(() => rect);
    targetNode.getBoundingClientRect = vi.fn(() => rect);
    addButton.getBoundingClientRect = vi.fn(() => rect);

    const dataTransfer = createDataTransfer();
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      writable: true,
      value: vi.fn(() => addButton),
    });

    try {
      fireEvent.dragStart(sourceNode, { dataTransfer, clientX: 24, clientY: 18 });
      fireEvent.dragOver(targetNode, { dataTransfer, clientY: 18 });
      fireEvent.drop(targetNode, { dataTransfer, clientY: 18 });
      fireEvent.dragEnd(sourceNode, { dataTransfer });

      await Promise.resolve();
      expect(mocks.reorderMutateAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        writable: true,
        value: originalElementFromPoint,
      });
    }
  });

  it('submits Polish category names from the create form', async () => {
    render(<CategoriesSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    fireEvent.change(screen.getByLabelText('English category name'), {
      target: { value: 'Keychains' },
    });
    fireEvent.change(screen.getByLabelText('Polish category name'), {
      target: { value: ' Breloki ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mocks.saveMutateAsync).toHaveBeenCalledWith({
        id: undefined,
        data: expect.objectContaining({
          name: 'Keychains',
          name_pl: 'Breloki',
          catalogId: 'catalog-1',
        }),
      });
    });
  });

  it('prefills and submits Polish category names from the edit form', async () => {
    vi.mocked(useProductSettingsCategoriesContext).mockReturnValue({
      loadingCategories: false,
      categories: [
        createCategory({ id: 'root-a', name: 'Root A', name_pl: 'Korzen A', sortIndex: 0 }),
      ],
      catalogs: [catalog],
      selectedCategoryCatalogId: 'catalog-1',
      onCategoryCatalogChange: vi.fn(),
      onRefreshCategories: mocks.onRefreshCategories,
    });

    const { container } = render(<CategoriesSettings />);
    const editButton = container.querySelector(
      '[data-master-tree-node-id="category:root-a"] button[title="Edit category"]'
    ) as HTMLButtonElement | null;

    expect(editButton).toBeTruthy();
    if (!editButton) {
      throw new Error('Expected inline edit button to render.');
    }

    fireEvent.click(editButton);

    const polishNameInput = screen.getByLabelText('Polish category name') as HTMLInputElement;
    expect(polishNameInput.value).toBe('Korzen A');

    fireEvent.change(polishNameInput, {
      target: { value: ' Zmieniony korzen ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mocks.saveMutateAsync).toHaveBeenCalledWith({
        id: 'root-a',
        data: expect.objectContaining({
          name: 'Root A',
          name_pl: 'Zmieniony korzen',
          catalogId: 'catalog-1',
        }),
      });
    });
  });
});
