import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DraftCreatorFormProvider,
  useDraftCreatorBasicInfo,
  useDraftCreatorImages,
  useDraftCreatorMetadata,
  useDraftCreatorParameters,
  useDraftCreatorProductData,
  type DraftCreatorFormContextValue,
} from './DraftCreatorFormContext';

const createContextValue = (): DraftCreatorFormContextValue => ({
  name: 'Draft',
  setName: vi.fn(),
  description: 'Description',
  setDescription: vi.fn(),
  validatorEnabled: true,
  setValidatorEnabled: vi.fn(),
  formatterEnabled: false,
  setFormatterEnabled: vi.fn(),
  icon: null,
  setIcon: vi.fn(),
  iconColorMode: 'theme',
  setIconColorMode: vi.fn(),
  iconColor: '#000000',
  setIconColor: vi.fn(),
  openProductFormTab: 'details',
  setOpenProductFormTab: vi.fn(),
  resolvedIconColor: '#000000',
  openIconLibrary: vi.fn(),
  sku: 'SKU-1',
  setSku: vi.fn(),
  identifierType: 'ean',
  setIdentifierType: vi.fn(),
  ean: '123',
  setEan: vi.fn(),
  gtin: '',
  setGtin: vi.fn(),
  asin: '',
  setAsin: vi.fn(),
  weight: '1',
  setWeight: vi.fn(),
  sizeLength: '2',
  setSizeLength: vi.fn(),
  sizeWidth: '3',
  setSizeWidth: vi.fn(),
  length: '4',
  setLength: vi.fn(),
  nameEn: 'Draft EN',
  setNameEn: vi.fn(),
  namePl: 'Draft PL',
  setNamePl: vi.fn(),
  nameDe: 'Draft DE',
  setNameDe: vi.fn(),
  descEn: 'Desc EN',
  setDescEn: vi.fn(),
  descPl: 'Desc PL',
  setDescPl: vi.fn(),
  descDe: 'Desc DE',
  setDescDe: vi.fn(),
  price: '10',
  setPrice: vi.fn(),
  stock: '5',
  setStock: vi.fn(),
  supplierName: 'Supplier',
  setSupplierName: vi.fn(),
  supplierLink: 'https://example.com',
  setSupplierLink: vi.fn(),
  priceComment: 'Comment',
  setPriceComment: vi.fn(),
  baseProductId: 'base-1',
  setBaseProductId: vi.fn(),
  catalogs: [],
  selectedCatalogIds: [],
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
  parameters: [],
  parametersLoading: false,
  parameterValues: [],
  addParameterValue: vi.fn(),
  updateParameterId: vi.fn(),
  updateParameterValue: vi.fn(),
  removeParameterValue: vi.fn(),
});

function Consumer(): React.JSX.Element {
  const basic = useDraftCreatorBasicInfo();
  const product = useDraftCreatorProductData();
  const metadata = useDraftCreatorMetadata();
  const images = useDraftCreatorImages();
  const parameters = useDraftCreatorParameters();

  return (
    <div>
      {basic.name}:{product.sku}:{String(metadata.categoryLoading)}:
      {String(images.showFileManager)}:{parameters.parameterValues.length}
    </div>
  );
}

describe('DraftCreatorFormContext', () => {
  it('throws outside provider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'useDraftCreatorBasicInfo must be used within a DraftCreatorFormProvider'
    );
  });

  it('exposes all section contexts inside provider', () => {
    render(
      <DraftCreatorFormProvider value={createContextValue()}>
        <Consumer />
      </DraftCreatorFormProvider>
    );

    expect(screen.getByText('Draft:SKU-1:false:false:0')).toBeInTheDocument();
  });
});
