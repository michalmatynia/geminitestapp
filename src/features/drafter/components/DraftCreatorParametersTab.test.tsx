import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductParameter } from '@/shared/contracts/products/parameters';

import {
  DraftCreatorFormProvider,
  type DraftCreatorFormContextValue,
} from './DraftCreatorFormContext';
import { DraftCreatorParametersTab } from './DraftCreatorFormFields';

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

const createContextValue = (): DraftCreatorFormContextValue => ({
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
  imageManagerController: {} as never,
  parameters: [createParameter('simple-material', 'material')],
  parametersLoading: false,
  parameterValues: [{ parameterId: 'simple-material', value: 'Metal' }],
  addParameterValue: vi.fn(),
  updateParameterId: vi.fn(),
  updateParameterValue: vi.fn(),
  removeParameterValue: vi.fn(),
});

describe('DraftCreatorParametersTab', () => {
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
  });
});
