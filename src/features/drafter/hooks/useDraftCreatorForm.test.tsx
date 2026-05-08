/* eslint-disable max-lines */

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

const createDraft = (overrides: Partial<ProductDraft> = {}): ProductDraft => {
  const draft: ProductDraft = {
    id: 'draft-template',
    name: 'BattleStock Scrape Template',
    draftKind: 'scrape_template',
    scrapeProfileId: 'battlestock-warhammer-40k-30k',
    active: true,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    ...overrides,
  };
  return draft;
};
const createTermsForType = (type: ProductTitleTermType): ProductTitleTerm[] => {
  if (type === 'size') return [createTerm('size', '4 cm')];
  if (type === 'material') return [createTerm('material', 'Metal', 'Metal PL')];
  return [createTerm('theme', 'Attack On Titan', 'Atak Tytanow')];
};
const resetDraftCreatorFormMocks = (): void => {
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
    data: createTermsForType(type),
    isLoading: false,
  }));
};

type DraftCreatorFormHookReturn = ReturnType<
  typeof renderHook<ReturnType<typeof useDraftCreatorForm>, unknown>
>;
const renderDraftCreatorFormHook = (): DraftCreatorFormHookReturn =>
  renderHook(() => useDraftCreatorForm(null, handleSaveSuccessMock));
type DraftCreatorFormHookResult = ReturnType<typeof renderDraftCreatorFormHook>['result'];
const assertEditedScrapeTemplateMetadataRetained = async (): Promise<void> => {
  draftQueryState.data = createDraft();

  const { result } = renderHook(() =>
    useDraftCreatorForm('draft-template', handleSaveSuccessMock)
  );

  await waitFor(() => {
    expect(result.current.state.draftKind).toBe('scrape_template');
    expect(result.current.state.scrapeProfileId).toBe('battlestock-warhammer-40k-30k');
  });
};
const assertPolishStructuredTitleAutoFills = async (): Promise<void> => {
  const { result } = renderDraftCreatorFormHook();

  act(() => {
    result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Attack On Titan');
  });

  await waitFor(() => {
    expect(result.current.state.namePl).toBe(
      'Scout | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow'
    );
  });
};
const assertStructuredTitlePreselectsCategory = async (): Promise<void> => {
  const { result } = renderDraftCreatorFormHook();

  act(() => {
    result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Attack On Titan');
  });

  await waitFor(() => {
    expect(result.current.state.selectedCategoryId).toBe('category-anime-pin');
  });
};
const assertCustomPolishTitleBasePreserved = async (): Promise<void> => {
  const { result } = renderDraftCreatorFormHook();

  act(() => {
    result.current.state.setNamePl(
      'Wlasny tytul | Old size | Old material | Old category | Old theme'
    );
    result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Attack On Titan');
  });

  await waitFor(() => {
    expect(result.current.state.namePl).toBe(
      'Wlasny tytul | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow'
    );
  });
};
const expectedMaterialParameter = {
  parameterId: 'simple-material',
  value: 'Metal',
  valuesByLanguage: {
    en: 'Metal',
    pl: 'Metal PL',
  },
};
const assertLinkedParameterInferredWithCatalog = async (): Promise<void> => {
  const { result } = renderDraftCreatorFormHook();

  act(() => {
    result.current.state.setSelectedCatalogIds(['catalog-1']);
    result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Warhammer 40k');
  });

  await waitFor(() => {
    expect(result.current.state.parameterValues).toEqual([expectedMaterialParameter]);
  });
  expect(useTitleTermsMock).toHaveBeenCalledWith(undefined, 'size', {
    allowWithoutCatalog: true,
  });
  expect(useTitleTermsMock).toHaveBeenCalledWith(undefined, 'material', {
    allowWithoutCatalog: true,
  });
  expect(useTitleTermsMock).toHaveBeenCalledWith(undefined, 'theme', {
    allowWithoutCatalog: true,
  });
};

const assertLinkedParameterInferredWithoutCatalog = async (): Promise<void> => {
  const { result } = renderDraftCreatorFormHook();

  act(() => {
    result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Warhammer 40k');
  });

  await waitFor(() => {
    expect(result.current.state.parameterValues).toEqual([expectedMaterialParameter]);
  });
};

const setManualParameterMetadata = (): void => {
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
};

const assertLinkedParameterValueAppears = async (
  result: DraftCreatorFormHookResult
): Promise<void> => {
  act(() => {
    result.current.state.setSelectedCatalogIds(['catalog-1']);
    result.current.state.setNameEn('Scout | 4 cm | Metal | Anime Pin | Warhammer 40k');
  });

  await waitFor(() => {
    expect(result.current.state.parameterValues).toEqual([expectedMaterialParameter]);
  });
};

const assertManualParameterCanBeAdded = (result: DraftCreatorFormHookResult): void => {
  act(() => {
    result.current.state.addParameterValue();
  });

  expect(result.current.state.parameterValues).toEqual([
    { parameterId: '', value: '' },
    expectedMaterialParameter,
  ]);

  act(() => {
    result.current.state.updateParameterId(0, 'manual-condition');
    result.current.state.updateParameterValue(0, 'New');
  });

  expect(result.current.state.parameterValues).toEqual([
    { parameterId: 'manual-condition', value: 'New' },
    expectedMaterialParameter,
  ]);
};

const assertLinkedParameterDropsWhenTitleNoLongerMatches = async (
  result: DraftCreatorFormHookResult
): Promise<void> => {
  act(() => {
    result.current.state.setNameEn('Scout | 4 cm | Resin | Anime Pin | Warhammer 40k');
  });

  await waitFor(() => {
    expect(result.current.state.parameterValues).toEqual([
      { parameterId: 'manual-condition', value: 'New' },
    ]);
  });
};

const assertManualAndLinkedParametersCanCoexist = async (): Promise<void> => {
  setManualParameterMetadata();

  const { result } = renderDraftCreatorFormHook();

  await assertLinkedParameterValueAppears(result);
  assertManualParameterCanBeAdded(result);
  await assertLinkedParameterDropsWhenTitleNoLongerMatches(result);
};

describe('useDraftCreatorForm', () => {
  beforeEach(resetDraftCreatorFormMocks);
  it(
    'retains scrape template metadata from an edited draft',
    assertEditedScrapeTemplateMetadataRetained
  );
  it(
    'auto-fills Polish structured title segments from the draft English title',
    assertPolishStructuredTitleAutoFills
  );
  it(
    'preselects the matching draft category from the English structured title',
    assertStructuredTitlePreselectsCategory
  );
  it(
    'preserves a custom Polish title base while syncing translated segments',
    assertCustomPolishTitleBasePreserved
  );
  it(
    'infers linked simple parameter values from the draft English product name',
    assertLinkedParameterInferredWithCatalog
  );
  it(
    'infers linked simple parameter values before a catalog is selected',
    assertLinkedParameterInferredWithoutCatalog
  );
  it(
    'keeps linked title-term parameters derived while manual draft parameters can be created',
    assertManualAndLinkedParametersCanCoexist
  );
});
