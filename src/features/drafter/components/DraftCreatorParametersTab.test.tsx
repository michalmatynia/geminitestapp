/* eslint-disable max-lines-per-function */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

const { apiGetMock, saveParameterMutationMock, useTitleTermsMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  saveParameterMutationMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSaveParameterMutation: () => ({
    isPending: false,
    mutateAsync: saveParameterMutationMock,
  }),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

import {
  DraftCreatorFormProvider,
  type DraftCreatorFormContextValue,
} from './DraftCreatorFormContext';
import { DraftCreatorDetailsTab, DraftCreatorParametersTab } from './DraftCreatorFormFields';

const createParameter = (
  id: string,
  linkedTitleTermType: ProductParameter['linkedTitleTermType']
): ProductParameter => ({
  id,
  catalogId: 'catalog-1',
  name: id,
  name_en: linkedTitleTermType === 'material' ? 'Material' : id,
  name_pl: null,
  name_de: null,
  selectorType: 'text',
  optionLabels: [],
  linkedTitleTermType,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const createCatalog = (id: string, isDefault = false): CatalogRecord => ({
  id,
  name: id,
  isDefault,
  languageIds: [],
  defaultLanguageId: null,
  defaultPriceGroupId: null,
  priceGroupIds: [],
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const createCategory = (id: string, name: string): ProductCategory => ({
  id,
  name,
  name_en: name,
  name_pl: null,
  name_de: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: null,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const createImageManagerController = (): ProductImageManagerController => ({
  imageSlots: [],
  imageLinks: [],
  imageBase64s: [],
  setImageLinkAt: vi.fn(),
  setImageBase64At: vi.fn(),
  handleSlotImageChange: vi.fn(),
  handleSlotFileSelect: vi.fn(),
  handleSlotDisconnectImage: vi.fn(),
  setShowFileManager: vi.fn(),
  swapImageSlots: vi.fn(),
  setImagesReordering: vi.fn(),
});

const createContextValue = (
  overrides: Partial<DraftCreatorFormContextValue> = {}
): DraftCreatorFormContextValue => ({
  name: 'Draft',
  setName: vi.fn(),
  draftKind: 'standard',
  setDraftKind: vi.fn(),
  scrapeProfileId: null,
  setScrapeProfileId: vi.fn(),
  description: '',
  setDescription: vi.fn(),
  validatorEnabled: true,
  setValidatorEnabled: vi.fn(),
  formatterEnabled: false,
  setFormatterEnabled: vi.fn(),
  icon: null,
  setIcon: vi.fn(),
  iconColorMode: 'theme',
  setIconColorMode: vi.fn(),
  iconColor: '#60a5fa',
  setIconColor: vi.fn(),
  openProductFormTab: 'general',
  setOpenProductFormTab: vi.fn(),
  resolvedIconColor: '#60a5fa',
  openIconLibrary: vi.fn(),
  sku: '',
  setSku: vi.fn(),
  identifierType: 'ean',
  setIdentifierType: vi.fn(),
  ean: '',
  setEan: vi.fn(),
  gtin: '',
  setGtin: vi.fn(),
  asin: '',
  setAsin: vi.fn(),
  weight: '',
  setWeight: vi.fn(),
  sizeLength: '',
  setSizeLength: vi.fn(),
  sizeWidth: '',
  setSizeWidth: vi.fn(),
  length: '',
  setLength: vi.fn(),
  nameEn: '',
  setNameEn: vi.fn(),
  namePl: '',
  setNamePl: vi.fn(),
  nameDe: '',
  setNameDe: vi.fn(),
  descEn: '',
  setDescEn: vi.fn(),
  descPl: '',
  setDescPl: vi.fn(),
  descDe: '',
  setDescDe: vi.fn(),
  price: '',
  setPrice: vi.fn(),
  stock: '',
  setStock: vi.fn(),
  supplierName: '',
  setSupplierName: vi.fn(),
  supplierLink: '',
  setSupplierLink: vi.fn(),
  priceComment: '',
  setPriceComment: vi.fn(),
  baseProductId: '',
  setBaseProductId: vi.fn(),
  catalogs: [],
  selectedCatalogIds: ['catalog-1'],
  setSelectedCatalogIds: vi.fn(),
  categories: [],
  categoryLoading: false,
  selectedCategoryId: null,
  setSelectedCategoryId: vi.fn(),
  tags: [],
  tagLoading: false,
  selectedTagIds: [],
  setSelectedTagIds: vi.fn(),
  producers: [],
  producersLoading: false,
  selectedProducerIds: [],
  setSelectedProducerIds: vi.fn(),
  showFileManager: false,
  setShowFileManager: vi.fn(),
  handleMultiFileSelect: vi.fn(),
  imageManagerController: createImageManagerController(),
  parameters: [createParameter('simple-material', 'material')],
  parametersLoading: false,
  parameterValues: [{ parameterId: 'simple-material', value: 'Metal' }],
  addParameterValue: vi.fn(),
  updateParameterId: vi.fn(),
  updateParameterValue: vi.fn(),
  removeParameterValue: vi.fn(),
  ...overrides,
});

describe('DraftCreatorParametersTab', () => {
  beforeEach(() => {
    apiGetMock.mockResolvedValue({ profiles: [] });
    saveParameterMutationMock.mockReset();
    useTitleTermsMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders linked title-term parameter values as synced and read-only', () => {
    render(
      <DraftCreatorFormProvider value={createContextValue()}>
        <DraftCreatorParametersTab />
      </DraftCreatorFormProvider>
    );

    expect(screen.getByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByText('Material term')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Value' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create parameter' })).toBeEnabled();
  });

  it('creates a parameter definition from the Drafter parameters tab', async () => {
    saveParameterMutationMock.mockResolvedValue(createParameter('condition', null));
    render(
      <DraftCreatorFormProvider value={createContextValue()}>
        <DraftCreatorParametersTab />
      </DraftCreatorFormProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create parameter' }));
    fireEvent.change(screen.getByLabelText('Field name in English'), {
      target: { value: 'Condition' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveParameterMutationMock).toHaveBeenCalledWith({
        id: undefined,
        data: {
          name_en: 'Condition',
          name_pl: null,
          name_de: null,
          catalogId: 'catalog-1',
          selectorType: 'text',
          optionLabels: [],
          linkedTitleTermType: null,
        },
      });
    });
  });

  it('creates a parameter definition through the default catalog when no catalog is selected', async () => {
    saveParameterMutationMock.mockResolvedValue(createParameter('condition', null));
    render(
      <DraftCreatorFormProvider
        value={createContextValue({
          catalogs: [createCatalog('catalog-default', true)],
          selectedCatalogIds: [],
        })}
      >
        <DraftCreatorParametersTab />
      </DraftCreatorFormProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create parameter' }));
    fireEvent.change(screen.getByLabelText('Field name in English'), {
      target: { value: 'Condition' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveParameterMutationMock).toHaveBeenCalledWith({
        id: undefined,
        data: {
          name_en: 'Condition',
          name_pl: null,
          name_de: null,
          catalogId: 'catalog-default',
          selectorType: 'text',
          optionLabels: [],
          linkedTitleTermType: null,
        },
      });
    });
  });
});

const renderDetailsTab = (
  overrides: Partial<DraftCreatorFormContextValue> = {}
): ReturnType<typeof render> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DraftCreatorFormProvider value={createContextValue(overrides)}>
        <DraftCreatorDetailsTab />
      </DraftCreatorFormProvider>
    </QueryClientProvider>
  );
};

describe('DraftCreatorDetailsTab', () => {
  beforeEach(() => {
    apiGetMock.mockResolvedValue({ profiles: [] });
    saveParameterMutationMock.mockReset();
    useTitleTermsMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders an enabled category selector and writes the selected category to draft state', async () => {
    const user = userEvent.setup();
    const setSelectedCategoryId = vi.fn();

    renderDetailsTab({
      categories: [createCategory('category-anime-pin', 'Anime Pin')],
      setSelectedCategoryId,
    });

    const categoryButton = screen.getByRole('button', { name: 'Categories' });
    expect(categoryButton).toBeEnabled();
    expect(categoryButton).toHaveTextContent('Select category');

    await user.click(categoryButton);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Anime Pin' }));

    expect(setSelectedCategoryId).toHaveBeenCalledWith('category-anime-pin');
  });
});
