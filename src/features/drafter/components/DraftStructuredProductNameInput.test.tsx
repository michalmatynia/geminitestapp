import React, { useMemo, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';

const { useTitleTermsMock } = vi.hoisted(() => ({
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

import {
  MetadataContext,
  type DraftCreatorMetadata,
} from './DraftCreatorFormContext';
import { DraftStructuredProductNameInput } from './DraftStructuredProductNameInput';

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

type StructuredInputHarnessProps = {
  initialCategoryId?: string | null;
  initialValue?: string;
  onCategoryChange?: (nextId: string | null) => void;
  placeholderDropdownEnabled?: boolean;
  selectedCatalogIds?: string[];
};

const categories = [createCategory('category-anime-pin', 'Anime Pin')];

function StructuredInputHarness({
  initialCategoryId = null,
  initialValue = '',
  onCategoryChange = (): void => {},
  placeholderDropdownEnabled = false,
  selectedCatalogIds = ['catalog-1'],
}: StructuredInputHarnessProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const [selectedCategoryId, setSelectedCategoryIdState] = useState<string | null>(
    initialCategoryId
  );
  const metadata = useMemo<DraftCreatorMetadata>(
    () => ({
      catalogs: [],
      selectedCatalogIds,
      setSelectedCatalogIds: vi.fn(),
      categories,
      categoryLoading: false,
      selectedCategoryId,
      setSelectedCategoryId: (nextId: string | null): void => {
        onCategoryChange(nextId);
        setSelectedCategoryIdState(nextId);
      },
      tags: [],
      tagLoading: false,
      selectedTagIds: [],
      setSelectedTagIds: vi.fn(),
      producers: [],
      producersLoading: false,
      selectedProducerIds: [],
      setSelectedProducerIds: vi.fn(),
    }),
    [onCategoryChange, selectedCatalogIds, selectedCategoryId]
  );

  return (
    <MetadataContext.Provider value={metadata}>
      <DraftStructuredProductNameInput
        value={value}
        onValueChange={setValue}
        placeholder='Product name'
        ariaLabel='Product name'
        title='Product name'
        placeholderDropdownEnabled={placeholderDropdownEnabled}
      />
      <output data-testid='selected-category-id'>{selectedCategoryId ?? ''}</output>
    </MetadataContext.Provider>
  );
}

const getProductNameInput = (): HTMLInputElement => {
  const input = screen.getByRole('textbox', { name: 'Product name' });
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected product name input.');
  return input;
};

const createTermsForType = (type: ProductTitleTermType): ProductTitleTerm[] => {
  if (type === 'size') return [createTerm('size', '4 cm')];
  if (type === 'material') return [createTerm('material', 'Metal')];
  return [createTerm('theme', 'Warhammer 40k')];
};

const resetTitleTermMocks = (): void => {
  vi.clearAllMocks();
  useTitleTermsMock.mockImplementation((_catalogId: string, type: ProductTitleTermType) => ({
    data: createTermsForType(type),
    isLoading: false,
  }));
};

const assertMatchingCategoryPreselects = async (): Promise<void> => {
  const onCategoryChange = vi.fn();
  render(<StructuredInputHarness onCategoryChange={onCategoryChange} />);

  const input = getProductNameInput();
  fireEvent.change(input, {
    target: { value: 'Scout | 4 cm | Metal | Anime Pin | Warhammer 40k' },
  });

  await waitFor(() => {
    expect(screen.getByTestId('selected-category-id')).toHaveTextContent('category-anime-pin');
  });
  expect(onCategoryChange).toHaveBeenCalledWith('category-anime-pin');
  expect(screen.getByText('Selected category: Anime Pin')).toBeInTheDocument();
};

const assertTitleTermSuggestionsInsert = async (): Promise<void> => {
  render(<StructuredInputHarness />);

  const input = getProductNameInput();
  fireEvent.change(input, { target: { value: 'Scout | 4' } });
  input.setSelectionRange(input.value.length, input.value.length);
  fireEvent.keyUp(input, { key: '4' });

  const option = await screen.findByRole('option', { name: /4 cm/i });
  fireEvent.click(option);

  await waitFor(() => {
    expect(input).toHaveValue('Scout | 4 cm | ');
  });
};

const assertSuggestionsWorkWithoutCatalog = async (): Promise<void> => {
  render(<StructuredInputHarness selectedCatalogIds={[]} />);

  const input = getProductNameInput();
  fireEvent.change(input, { target: { value: 'Scout | 4' } });
  input.setSelectionRange(input.value.length, input.value.length);
  fireEvent.keyUp(input, { key: '4' });

  expect(screen.queryByText(/Select a catalog first/i)).not.toBeInTheDocument();
  expect(useTitleTermsMock).toHaveBeenCalledWith('', 'size', { allowWithoutCatalog: true });

  const option = await screen.findByRole('option', { name: /4 cm/i });
  fireEvent.click(option);

  await waitFor(() => {
    expect(input).toHaveValue('Scout | 4 cm | ');
  });
};

const assertSizeSuggestionsAfterPlaceholder = async (): Promise<void> => {
  render(<StructuredInputHarness placeholderDropdownEnabled />);

  const input = getProductNameInput();
  fireEvent.change(input, { target: { value: '[name] | 4' } });
  input.setSelectionRange(input.value.length, input.value.length);
  fireEvent.keyUp(input, { key: '4' });

  const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
  expect(listbox.parentElement).toBe(document.body);
  expect(listbox).toHaveClass('fixed');
  expect(listbox.className).toContain('z-[70]');

  const option = within(listbox).getByRole('option', { name: /4 cm/i });
  fireEvent.click(option);

  await waitFor(() => {
    expect(input).toHaveValue('[name] | 4 cm | ');
  });
};

const assertScrapePlaceholderInsertionWorks = async (): Promise<void> => {
  render(<StructuredInputHarness placeholderDropdownEnabled />);

  const input = getProductNameInput();
  fireEvent.change(input, { target: { value: '[' } });
  input.setSelectionRange(1, 1);
  fireEvent.keyDown(input, { key: '[' });

  await waitFor(() => {
    expect(screen.getByText('[name]')).toBeInTheDocument();
  });

  fireEvent.mouseDown(screen.getByRole('option', { name: '[name]' }));

  expect(input).toHaveValue('[name]');
};

const assertTransformedPlaceholderInsertionWorks = async (): Promise<void> => {
  render(<StructuredInputHarness placeholderDropdownEnabled />);

  const input = getProductNameInput();
  fireEvent.change(input, { target: { value: '[name(' } });
  input.setSelectionRange(6, 6);
  fireEvent.keyUp(input, { key: '(' });

  await waitFor(() => {
    expect(screen.getByText('[name(TitleCase)]')).toBeInTheDocument();
  });

  fireEvent.mouseDown(screen.getByRole('option', { name: '[name(TitleCase)]' }));

  expect(input).toHaveValue('[name(TitleCase)]');
};

const assertScrapePlaceholderFilteringWorks = async (): Promise<void> => {
  render(<StructuredInputHarness placeholderDropdownEnabled />);

  const input = getProductNameInput();
  fireEvent.change(input, { target: { value: '[sou' } });
  input.setSelectionRange(4, 4);
  fireEvent.keyUp(input, { key: 'u' });

  await waitFor(() => {
    expect(screen.getByText('[sourceUrl]')).toBeInTheDocument();
  });

  expect(screen.queryByText('[name]')).not.toBeInTheDocument();

  fireEvent.mouseDown(screen.getByRole('option', { name: '[sourceUrl]' }));

  expect(input).toHaveValue('[sourceUrl]');
};

describe('DraftStructuredProductNameInput', () => {
  beforeEach(resetTitleTermMocks);
  it(
    'preselects the matching category when the structured category segment is typed',
    assertMatchingCategoryPreselects
  );
  it('offers product title term suggestions inside draft product names', assertTitleTermSuggestionsInsert);
  it('offers structured title suggestions before a draft catalog is selected', assertSuggestionsWorkWithoutCatalog);
  it('offers size suggestions after a scrape placeholder title segment', assertSizeSuggestionsAfterPlaceholder);
  it('keeps scrape placeholder insertion available for scrape template draft names', assertScrapePlaceholderInsertionWorks);
  it(
    'inserts transformed scrape placeholders inside structured draft names',
    assertTransformedPlaceholderInsertionWorks
  );
  it('filters scrape placeholders while typing inside structured draft names', assertScrapePlaceholderFilteringWorks);
});
