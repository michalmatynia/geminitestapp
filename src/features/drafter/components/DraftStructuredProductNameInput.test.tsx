import React, { useMemo, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
};

const categories = [createCategory('category-anime-pin', 'Anime Pin')];

function StructuredInputHarness({
  initialCategoryId = null,
  initialValue = '',
  onCategoryChange = (): void => {},
  placeholderDropdownEnabled = false,
}: StructuredInputHarnessProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const [selectedCategoryId, setSelectedCategoryIdState] = useState<string | null>(
    initialCategoryId
  );
  const metadata = useMemo<DraftCreatorMetadata>(
    () => ({
      catalogs: [],
      selectedCatalogIds: ['catalog-1'],
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
    [onCategoryChange, selectedCategoryId]
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

describe('DraftStructuredProductNameInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTitleTermsMock.mockImplementation((_catalogId: string, type: ProductTitleTermType) => ({
      data:
        type === 'size'
          ? [createTerm('size', '4 cm')]
          : type === 'material'
            ? [createTerm('material', 'Metal')]
            : [createTerm('theme', 'Warhammer 40k')],
      isLoading: false,
    }));
  });

  it('preselects the matching category when the structured category segment is typed', async () => {
    const onCategoryChange = vi.fn();
    render(<StructuredInputHarness onCategoryChange={onCategoryChange} />);

    const input = screen.getByRole('textbox', { name: 'Product name' });
    fireEvent.change(input, {
      target: { value: 'Scout | 4 cm | Metal | Anime Pin | Warhammer 40k' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected-category-id')).toHaveTextContent('category-anime-pin');
    });
    expect(onCategoryChange).toHaveBeenCalledWith('category-anime-pin');
    expect(screen.getByText('Selected category: Anime Pin')).toBeInTheDocument();
  });

  it('offers product title term suggestions inside draft product names', async () => {
    render(<StructuredInputHarness />);

    const input = screen.getByRole('textbox', { name: 'Product name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Scout | 4' } });
    input.setSelectionRange(input.value.length, input.value.length);
    fireEvent.keyUp(input, { key: '4' });

    const option = await screen.findByRole('option', { name: /4 cm/i });
    fireEvent.click(option);

    await waitFor(() => {
      expect(input).toHaveValue('Scout | 4 cm | ');
    });
  });

  it('keeps scrape placeholder insertion available for scrape template draft names', async () => {
    render(<StructuredInputHarness placeholderDropdownEnabled />);

    const input = screen.getByRole('textbox', { name: 'Product name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '[' } });
    input.setSelectionRange(1, 1);
    fireEvent.keyDown(input, { key: '[' });

    await waitFor(() => {
      expect(screen.getByText('[name]')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('[name]'));

    expect(input).toHaveValue('[name]');
  });
});
