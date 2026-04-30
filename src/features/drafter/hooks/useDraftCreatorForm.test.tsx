import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';

const {
  createDraftMutationMock,
  draftQueryState,
  handleSaveSuccessMock,
  productImagesResult,
  updateDraftMutationMock,
  useDraftMetadataMock,
  useTitleTermsMock,
} = vi.hoisted(() => ({
  createDraftMutationMock: vi.fn(),
  draftQueryState: {
    data: undefined as ProductDraft | undefined,
  },
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
  useDraft: () => ({ data: draftQueryState.data, isLoading: false }),
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
  linkedTitleTermType: ProductSimpleParameter['linkedTitleTermType'] = null
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

const createCategory = (
  id: string,
  nameEn: string,
  namePl: string | null = null
): ProductCategory => ({
  id,
  name: nameEn,
  name_en: nameEn,
  name_pl: namePl,
  name_de: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: null,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const createDraft = (overrides: Partial<ProductDraft> = {}): ProductDraft =>
  ({
    id: 'draft-template',
    name: 'BattleStock Scrape Template',
    draftKind: 'scrape_template',
    scrapeProfileId: 'battlestock-warhammer-40k-30k',
    active: true,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    ...overrides,
  }) as ProductDraft;

describe('useDraftCreatorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    draftQueryState.data = undefined;
    useDraftMetadataMock.mockReturnValue({
      categories: [createCategory('category-anime-pin', 'Anime Pin', 'Przypinka Anime')],
      categoryLoading: false,
      tags: [],
      tagLoading: false,
      parameters: [],
      simpleParameters: [createSimpleParameter('simple-material', 'material')],
      parametersLoading: false,
    });
    useTitleTermsMock.mockImplementation((_catalogId: string, type: ProductTitleTermType) => ({
      data:
        type === 'size'
          ? [createTerm('size', '4 cm')]
          : type === 'material'
            ? [createTerm('material', 'Metal', 'Metal PL')]
            : [createTerm('theme', 'Attack On Titan', 'Atak Tytanow')],
      isLoading: false,
    }));
  });

  it('retains scrape template metadata from an edited draft', async () => {
    draftQueryState.data = createDraft();

    const { result } = renderHook(() =>
      useDraftCreatorForm('draft-template', handleSaveSuccessMock)
    );

    await waitFor(() => {
      expect(result.current.state.draftKind).toBe('scrape_template');
      expect(result.current.state.scrapeProfileId).toBe('battlestock-warhammer-40k-30k');
    });
  });

  it('auto-fills Polish structured title segments from the draft English title', async () => {
    const { result } = renderHook(() =>
      useDraftCreatorForm(null, handleSaveSuccessMock)
    );

    act(() => {
      result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Attack On Titan');
    });

    await waitFor(() => {
      expect(result.current.state.namePl).toBe(
        'Scout | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow'
      );
    });
  });

  it('preserves a custom Polish title base while syncing translated segments', async () => {
    const { result } = renderHook(() =>
      useDraftCreatorForm(null, handleSaveSuccessMock)
    );

    act(() => {
      result.current.state.setNamePl('Wlasny tytul | Old size | Old material | Old category | Old theme');
      result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Attack On Titan');
    });

    await waitFor(() => {
      expect(result.current.state.namePl).toBe(
        'Wlasny tytul | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow'
      );
    });
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

  it('infers linked simple parameter values before a catalog is selected', async () => {
    const { result } = renderHook(() =>
      useDraftCreatorForm(null, handleSaveSuccessMock)
    );

    act(() => {
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

  it('keeps linked title-term parameters derived while manual draft parameters can be created', async () => {
    useDraftMetadataMock.mockReturnValue({
      categories: [],
      categoryLoading: false,
      tags: [],
      tagLoading: false,
      parameters: [],
      simpleParameters: [
        createSimpleParameter('simple-material', 'material'),
        createSimpleParameter('manual-condition'),
      ],
      parametersLoading: false,
    });

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

    act(() => {
      result.current.state.addParameterValue();
    });

    expect(result.current.state.parameterValues).toEqual([
      { parameterId: '', value: '' },
      {
        parameterId: 'simple-material',
        value: 'Metal',
        valuesByLanguage: {
          en: 'Metal',
          pl: 'Metal PL',
        },
      },
    ]);

    act(() => {
      result.current.state.updateParameterId(0, 'manual-condition');
      result.current.state.updateParameterValue(0, 'New');
    });

    expect(result.current.state.parameterValues).toEqual([
      { parameterId: 'manual-condition', value: 'New' },
      {
        parameterId: 'simple-material',
        value: 'Metal',
        valuesByLanguage: {
          en: 'Metal',
          pl: 'Metal PL',
        },
      },
    ]);

    act(() => {
      result.current.state.setNameEn('Scout | 4 cm | Resin | Anime Pin | Warhammer 40k');
    });

    await waitFor(() => {
      expect(result.current.state.parameterValues).toEqual([
        { parameterId: 'manual-condition', value: 'New' },
      ]);
    });
  });
});
