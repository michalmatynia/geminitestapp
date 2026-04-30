import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';

const {
  createDraftMutationMock,
  handleSaveSuccessMock,
  productImagesResult,
  updateDraftMutationMock,
  useDraftMetadataMock,
  useTitleTermsMock,
} = vi.hoisted(() => ({
  createDraftMutationMock: vi.fn(),
  handleSaveSuccessMock: vi.fn(),
  productImagesResult: {
    imageSlots: Array.from({ length: 15 }, () => null),
    imageLinks: Array.from({ length: 15 }, () => ''),
    imageBase64s: Array.from({ length: 15 }, () => ''),
    handleSlotImageChange: vi.fn(),
    handleSlotFileSelect: vi.fn(),
    setImageLinkAt: vi.fn(),
    setImageBase64At: vi.fn(),
    showFileManager: false,
    setShowFileManager: vi.fn(),
    handleSlotDisconnectImage: vi.fn(),
    handleMultiImageChange: vi.fn(),
    handleMultiFileSelect: vi.fn(),
    swapImageSlots: vi.fn(),
    setImagesReordering: vi.fn(),
    refreshFromProduct: vi.fn(),
  },
  updateDraftMutationMock: vi.fn(),
  useDraftMetadataMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/drafter/hooks/useDraftQueries', () => ({
  useDraft: () => ({ data: undefined, isLoading: false }),
  useCreateDraftMutation: () => ({ mutateAsync: createDraftMutationMock }),
  useUpdateDraftMutation: () => ({ mutateAsync: updateDraftMutationMock }),
}));

vi.mock('@/features/products/forms.public', () => ({
  useCatalogs: () => ({ data: [] }),
  useProducers: () => ({ data: [], isLoading: false }),
  useProductImages: () => productImagesResult,
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

vi.mock('./useDraftMetadata', () => ({
  useDraftMetadata: (...args: unknown[]) => useDraftMetadataMock(...args),
}));

import { useDraftCreatorForm } from './useDraftCreatorForm';

const createSimpleParameter = (
  id: string,
  linkedTitleTermType: ProductTitleTermType
): ProductSimpleParameter => ({
  id,
  label: id,
  type: 'text',
  options: [],
  catalogId: 'catalog-1',
  name: id,
  name_en: id,
  name_pl: null,
  name_de: null,
  linkedTitleTermType,
});

const createTerm = (
  type: ProductTitleTermType,
  nameEn: string,
  namePl: string | null = null
): ProductTitleTerm => ({
  id: `${type}-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
  type,
  catalogId: 'catalog-1',
  name_en: nameEn,
  name_pl: namePl,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

describe('useDraftCreatorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDraftMetadataMock.mockReturnValue({
      categories: [],
      categoryLoading: false,
      tags: [],
      tagLoading: false,
      parameters: [],
      simpleParameters: [createSimpleParameter('simple-material', 'material')],
      parametersLoading: false,
    });
    useTitleTermsMock.mockImplementation((_catalogId: string, type: ProductTitleTermType) => ({
      data: type === 'material' ? [createTerm('material', 'Metal', 'Metal PL')] : [],
      isLoading: false,
    }));
  });

  it('infers linked simple parameter values from the draft English product name', async () => {
    const { result } = renderHook(() =>
      useDraftCreatorForm(null, handleSaveSuccessMock)
    );

    act(() => {
      result.current.state.setSelectedCatalogIds(['catalog-1']);
      result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Warhammer 40k');
    });

    await waitFor(() => {
      expect(result.current.state.parameterValues).toEqual([
        {
          parameterId: 'simple-material',
          value: 'Metal',
          valuesByLanguage: {
            en: 'Metal',
            pl: 'Metal PL',
          },
        },
      ]);
    });
  });
});
