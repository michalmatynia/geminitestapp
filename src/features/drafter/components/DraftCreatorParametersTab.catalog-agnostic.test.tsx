import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

const { saveParameterMutationMock } = vi.hoisted(() => ({
  saveParameterMutationMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSaveParameterMutation: () => ({
    isPending: false,
    mutateAsync: saveParameterMutationMock,
  }),
}));

import {
  DraftCreatorFormProvider,
  type DraftCreatorFormContextValue,
} from './DraftCreatorFormContext';
import { DraftCreatorParametersTab } from './DraftCreatorFormFields';

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

const createParameter = (): ProductParameter => ({
  id: 'pin-condition',
  catalogId: 'catalog-pin',
  name: 'Pin condition',
  name_en: 'Pin condition',
  name_pl: null,
  name_de: null,
  selectorType: 'text',
  optionLabels: [],
  linkedTitleTermType: null,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const baseContextValue: Omit<DraftCreatorFormContextValue, 'updateParameterId'> = {
  name: 'Bstocl scrape template',
  setName: vi.fn(),
  draftKind: 'scrape_template',
  setDraftKind: vi.fn(),
  scrapeProfileId: 'battlestock-warhammer-40k-30k',
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
  selectedCatalogIds: ['catalog-battlestock'],
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
  parameters: [createParameter()],
  parametersLoading: false,
  parameterValues: [{ parameterId: '', value: '' }],
  addParameterValue: vi.fn(),
  updateParameterValue: vi.fn(),
  removeParameterValue: vi.fn(),
};

const createContextValue = (
  updateParameterId: (index: number, parameterId: string) => void
): DraftCreatorFormContextValue => ({
  ...baseContextValue,
  updateParameterId,
});

describe('DraftCreatorParametersTab catalog-agnostic options', () => {
  beforeEach((): void => {
    saveParameterMutationMock.mockReset();
  });

  it('offers Pin-catalog parameters in a BattleStock scrape template draft', async () => {
    const updateParameterId = vi.fn();

    render(
      <DraftCreatorFormProvider value={createContextValue(updateParameterId)}>
        <DraftCreatorParametersTab />
      </DraftCreatorFormProvider>
    );

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Parameter' }),
      'pin-condition'
    );

    expect(updateParameterId).toHaveBeenCalledWith(0, 'pin-condition');
  });
});
