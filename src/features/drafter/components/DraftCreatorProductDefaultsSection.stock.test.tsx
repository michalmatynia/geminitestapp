import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftCreatorProductData } from './DraftCreatorFormContext';

const { productDataMock, setStockMock } = vi.hoisted(() => ({
  productDataMock: vi.fn(),
  setStockMock: vi.fn(),
}));

type PlaceholderInputProps = {
  id?: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

vi.mock('./DraftCreatorFormContext', () => ({
  useDraftCreatorBasicInfo: () => ({ draftKind: 'standard' }),
  useDraftCreatorProductData: () => productDataMock(),
}));

vi.mock('./DraftPlaceholderTextInput', async () => {
  const ReactRuntime = await import('react');
  return {
    DraftPlaceholderTextInput: ({
      ariaLabel,
      id,
      onValueChange,
      placeholder,
      value,
    }: PlaceholderInputProps): React.JSX.Element =>
      ReactRuntime.createElement('input', {
        'aria-label': ariaLabel ?? placeholder,
        id,
        onChange: (event: React.ChangeEvent<HTMLInputElement>): void =>
          onValueChange(event.target.value),
        placeholder,
        value,
      }),
  };
});

vi.mock('./DraftStructuredProductNameInput', async () => {
  const ReactRuntime = await import('react');
  return {
    DraftStructuredProductNameInput: ({
      ariaLabel,
      id,
      onValueChange,
      placeholder,
      value,
    }: PlaceholderInputProps): React.JSX.Element =>
      ReactRuntime.createElement('input', {
        'aria-label': ariaLabel ?? placeholder,
        id,
        onChange: (event: React.ChangeEvent<HTMLInputElement>): void =>
          onValueChange(event.target.value),
        placeholder,
        value,
      }),
  };
});

const createProductData = (): DraftCreatorProductData => ({
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
  stock: '7',
  setStock: setStockMock,
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
  supplierName: '',
  setSupplierName: vi.fn(),
  supplierLink: '',
  setSupplierLink: vi.fn(),
  priceComment: '',
  setPriceComment: vi.fn(),
  baseProductId: '',
  setBaseProductId: vi.fn(),
});

import { DraftCreatorProductDefaultsSection } from './DraftCreatorFormFields';

describe('DraftCreatorProductDefaultsSection', () => {
  beforeEach(() => {
    setStockMock.mockReset();
    productDataMock.mockReturnValue(createProductData());
  });

  it('renders editable stock as a non-negative whole-number default', () => {
    render(<DraftCreatorProductDefaultsSection />);

    const stockInput = screen.getByLabelText('Stock');
    expect(stockInput).toHaveAttribute('min', '0');
    expect(stockInput).toHaveAttribute('step', '1');

    fireEvent.change(stockInput, { target: { value: '12' } });

    expect(setStockMock).toHaveBeenCalledWith('12');
  });
});
