import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@/__tests__/test-utils';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as productSettingsApi from '@/features/products/api/settings';
import {
  productSettingsKeys,
  useCreateValidationPatternMutation,
  useDeleteCategoryMutation,
  useDeleteCatalogMutation,
  useDeleteParameterMutation,
  useDeletePriceGroupMutation,
  useDeleteTagMutation,
  useDeleteValidationPatternMutation,
  useReorderValidationPatternsMutation,
  useReorderCategoryMutation,
  useSaveCatalogMutation,
  useSavePriceGroupMutation,
  useSaveCategoryMutation,
  useSaveParameterMutation,
  useSaveTagMutation,
  useProductValidatorConfig,
  useUpdateValidationPatternMutation,
  useUpdatePriceGroupMutation,
  useUpdateValidatorSettingsMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

vi.mock('@/features/products/api/settings', () => ({
  updatePriceGroup: vi.fn(),
  savePriceGroup: vi.fn(),
  deletePriceGroup: vi.fn(),
  deleteCatalog: vi.fn(),
  createCatalog: vi.fn(),
  updateTag: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategory: vi.fn(),
  updateParameter: vi.fn(),
  deleteParameter: vi.fn(),
  createValidationPattern: vi.fn(),
  updateValidationPattern: vi.fn(),
  reorderValidationPatterns: vi.fn(),
  deleteValidationPattern: vi.fn(),
  updateCategory: vi.fn(),
  createCategory: vi.fn(),
  deleteTag: vi.fn(),
  getProductValidatorConfig: vi.fn(),
  updateValidatorSettings: vi.fn(),
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useProductSettingsQueries invalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useSaveCategoryMutation invalidates metadata/settings/tree category keys', async () => {
    vi.mocked(productSettingsApi.updateCategory).mockResolvedValue({
      id: 'cat-1',
      name: 'Category',
      catalogId: 'catalog-1',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveCategoryMutation(), { wrapper });

    await result.current.mutateAsync({
      id: 'cat-1',
      data: { catalogId: 'catalog-1', name: 'Category' },
    });

    expect(productSettingsApi.updateCategory).toHaveBeenCalledWith('cat-1', {
      catalogId: 'catalog-1',
      name: 'Category',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.categories('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.simpleParameters('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.categories('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.categoryTree('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.simpleParameters('catalog-1'),
    });
  });

  it('useDeleteTagMutation invalidates both metadata and settings tag keys', async () => {
    vi.mocked(productSettingsApi.deleteTag).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteTagMutation(), { wrapper });

    await result.current.mutateAsync({ id: 'tag-1', catalogId: 'catalog-1' });

    expect(productSettingsApi.deleteTag).toHaveBeenCalledWith('tag-1');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.tags('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.tags('catalog-1'),
    });
  });

  it('useUpdateValidatorSettingsMutation invalidates settings/config key family', async () => {
    vi.mocked(productSettingsApi.updateValidatorSettings).mockResolvedValue({
      enabledByDefault: true,
      formatterEnabledByDefault: true,
      instanceDenyBehavior: {
        draft_template: 'ask_again',
        product_create: 'ask_again',
        product_edit: 'ask_again',
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateValidatorSettingsMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({ enabledByDefault: true });

    expect(productSettingsApi.updateValidatorSettings).toHaveBeenCalledWith(
      {
        enabledByDefault: true,
      },
      expect.objectContaining({
        queryClient: expect.any(QueryClient),
      })
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(4));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorSettings(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(true),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(false),
    });
  });

  it('useProductValidatorConfig refetches on mount when an invalidated cache entry is stale', async () => {
    vi.mocked(productSettingsApi.getProductValidatorConfig)
      .mockResolvedValueOnce({
        enabledByDefault: true,
        formatterEnabledByDefault: true,
        patterns: [],
        instanceDenyBehavior: null,
      } as never)
      .mockResolvedValueOnce({
        enabledByDefault: true,
        formatterEnabledByDefault: false,
        patterns: [],
        instanceDenyBehavior: null,
      } as never);

    const firstRender = renderHook(() => useProductValidatorConfig(), { wrapper });

    await waitFor(() =>
      expect(firstRender.result.current.data?.formatterEnabledByDefault).toBe(true)
    );
    expect(productSettingsApi.getProductValidatorConfig).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    await queryClient.invalidateQueries({
      queryKey: productSettingsKeys.validatorConfig(false),
    });

    const secondRender = renderHook(() => useProductValidatorConfig(), { wrapper });

    await waitFor(() =>
      expect(secondRender.result.current.data?.formatterEnabledByDefault).toBe(false)
    );
    expect(productSettingsApi.getProductValidatorConfig).toHaveBeenCalledTimes(2);
  });

  it('useUpdatePriceGroupMutation invalidates metadata/settings price-group keys', async () => {
    vi.mocked(productSettingsApi.updatePriceGroup).mockResolvedValue({
      id: 'pg-1',
      groupId: 'group-1',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdatePriceGroupMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      id: 'pg-1',
      groupId: 'group-1',
    } as never);

    expect(productSettingsApi.updatePriceGroup).toHaveBeenCalledWith({
      id: 'pg-1',
      groupId: 'group-1',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.priceGroups(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.priceGroups(),
    });
  });

  it('useSavePriceGroupMutation invalidates metadata/settings price-group keys', async () => {
    vi.mocked(productSettingsApi.savePriceGroup).mockResolvedValue({
      id: 'pg-2',
      groupId: 'group-2',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSavePriceGroupMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      id: 'pg-2',
      data: { groupId: 'group-2' },
    });

    expect(productSettingsApi.savePriceGroup).toHaveBeenCalledWith('pg-2', {
      groupId: 'group-2',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.priceGroups(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.priceGroups(),
    });
  });

  it('useDeletePriceGroupMutation invalidates metadata/settings price-group keys', async () => {
    vi.mocked(productSettingsApi.deletePriceGroup).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeletePriceGroupMutation(), {
      wrapper,
    });

    await result.current.mutateAsync('pg-2');

    expect(productSettingsApi.deletePriceGroup).toHaveBeenCalledWith('pg-2');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.priceGroups(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.priceGroups(),
    });
  });

  it('useSaveCatalogMutation invalidates metadata/settings catalog keys', async () => {
    vi.mocked(productSettingsApi.createCatalog).mockResolvedValue({
      id: 'catalog-2',
      name: 'Catalog 2',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveCatalogMutation(), { wrapper });

    await result.current.mutateAsync({
      data: { name: 'Catalog 2' },
    });

    expect(productSettingsApi.createCatalog).toHaveBeenCalledWith({
      name: 'Catalog 2',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.catalogs(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.catalogs(),
    });
  });

  it('useDeleteCatalogMutation invalidates metadata/settings catalog keys', async () => {
    vi.mocked(productSettingsApi.deleteCatalog).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCatalogMutation(), { wrapper });

    await result.current.mutateAsync('catalog-2');

    expect(productSettingsApi.deleteCatalog).toHaveBeenCalledWith('catalog-2');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.catalogs(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.catalogs(),
    });
  });

  it('useDeleteCategoryMutation invalidates metadata/settings/tree category keys', async () => {
    vi.mocked(productSettingsApi.deleteCategory).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCategoryMutation(), { wrapper });

    await result.current.mutateAsync({ id: 'cat-1', catalogId: 'catalog-1' });

    expect(productSettingsApi.deleteCategory).toHaveBeenCalledWith('cat-1');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.categories('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.categories('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.categoryTree('catalog-1'),
    });
  });

  it('useReorderCategoryMutation invalidates metadata/settings/tree category keys', async () => {
    vi.mocked(productSettingsApi.reorderCategory).mockResolvedValue({
      id: 'cat-1',
      catalogId: 'catalog-1',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReorderCategoryMutation(), { wrapper });

    await result.current.mutateAsync({
      categoryId: 'cat-1',
      parentId: null,
      position: 'inside',
      catalogId: 'catalog-1',
    });

    expect(productSettingsApi.reorderCategory).toHaveBeenCalledWith({
      categoryId: 'cat-1',
      parentId: null,
      position: 'inside',
      catalogId: 'catalog-1',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.categories('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.categories('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.categoryTree('catalog-1'),
    });
  });

  it('useSaveTagMutation invalidates metadata/settings tag keys', async () => {
    vi.mocked(productSettingsApi.updateTag).mockResolvedValue({
      id: 'tag-1',
      catalogId: 'catalog-1',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveTagMutation(), { wrapper });

    await result.current.mutateAsync({
      id: 'tag-1',
      data: { catalogId: 'catalog-1', name: 'Featured' },
    });

    expect(productSettingsApi.updateTag).toHaveBeenCalledWith('tag-1', {
      catalogId: 'catalog-1',
      name: 'Featured',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.tags('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.tags('catalog-1'),
    });
  });

  it('useSaveParameterMutation invalidates metadata/settings parameter keys', async () => {
    vi.mocked(productSettingsApi.updateParameter).mockResolvedValue({
      id: 'param-1',
      catalogId: 'catalog-1',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveParameterMutation(), { wrapper });

    await result.current.mutateAsync({
      id: 'param-1',
      data: { catalogId: 'catalog-1', name_en: 'Length' },
    });

    expect(productSettingsApi.updateParameter).toHaveBeenCalledWith('param-1', {
      catalogId: 'catalog-1',
      name_en: 'Length',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.parameters('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.simpleParameters('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.parameters('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.simpleParameters('catalog-1'),
    });
  });

  it('useDeleteParameterMutation invalidates metadata/settings parameter keys', async () => {
    vi.mocked(productSettingsApi.deleteParameter).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteParameterMutation(), { wrapper });

    await result.current.mutateAsync({ id: 'param-1', catalogId: 'catalog-1' });

    expect(productSettingsApi.deleteParameter).toHaveBeenCalledWith('param-1');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(9));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.parameters('catalog-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.parameters('catalog-1'),
    });
  });

  it('useCreateValidationPatternMutation invalidates validator patterns/config keys', async () => {
    vi.mocked(productSettingsApi.createValidationPattern).mockResolvedValue({
      id: 'pattern-1',
      label: 'no-empty-name',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateValidationPatternMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      label: 'no-empty-name',
      target: 'name',
      regex: '.+',
      message: 'Name is required',
    } as never);

    expect(productSettingsApi.createValidationPattern).toHaveBeenCalledWith(
      {
        label: 'no-empty-name',
        target: 'name',
        regex: '.+',
        message: 'Name is required',
      },
      expect.objectContaining({
        queryClient: expect.any(QueryClient),
      })
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(4));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorPatterns(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(true),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(false),
    });
  });

  it('useUpdateValidationPatternMutation invalidates validator patterns/config keys', async () => {
    vi.mocked(productSettingsApi.updateValidationPattern).mockResolvedValue({
      id: 'pattern-1',
      label: 'no-empty-name',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateValidationPatternMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      id: 'pattern-1',
      data: { label: 'no-empty-name' } as never,
    });

    expect(productSettingsApi.updateValidationPattern).toHaveBeenCalledWith('pattern-1', {
      label: 'no-empty-name',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(4));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorPatterns(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(true),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(false),
    });
  });

  it('useReorderValidationPatternsMutation invalidates validator patterns/config keys', async () => {
    vi.mocked(productSettingsApi.reorderValidationPatterns).mockResolvedValue({
      updated: [],
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReorderValidationPatternsMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      updates: [
        {
          id: 'pattern-1',
          sequence: 10,
          expectedUpdatedAt: '2026-02-01T00:00:00.000Z',
        },
      ],
    });

    expect(productSettingsApi.reorderValidationPatterns).toHaveBeenCalledWith({
      updates: [
        {
          id: 'pattern-1',
          sequence: 10,
          expectedUpdatedAt: '2026-02-01T00:00:00.000Z',
        },
      ],
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(4));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorPatterns(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(true),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(false),
    });
  });

  it('useDeleteValidationPatternMutation invalidates validator patterns/config keys', async () => {
    vi.mocked(productSettingsApi.deleteValidationPattern).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteValidationPatternMutation(), {
      wrapper,
    });

    await result.current.mutateAsync('pattern-1');

    expect(productSettingsApi.deleteValidationPattern).toHaveBeenCalledWith('pattern-1');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(4));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorPatterns(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(true),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productSettingsKeys.validatorConfig(false),
    });
  });
});
