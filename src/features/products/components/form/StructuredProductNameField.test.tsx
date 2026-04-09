// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

const {
  useProductFormCoreMock,
  useProductFormMetadataMock,
  useTitleTermsMock,
} = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  useProductFormMetadataMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

import { StructuredProductNameField } from './StructuredProductNameField';

type RenderFieldOptions = {
  categories?: Array<{
    id: string;
    name: string;
    color: string | null;
    parentId: string | null;
    catalogId: string;
  }>;
  initialName?: string;
  selectedCategoryId?: string | null;
};

function renderField(options: RenderFieldOptions = {}): { setCategoryId: ReturnType<typeof vi.fn> } {
  const setCategoryId = vi.fn();
  const categories = options.categories ?? [
    {
      id: 'parent',
      name: 'Pins',
      color: null,
      parentId: null,
      catalogId: 'catalog-a',
    },
    {
      id: 'child',
      name: 'Anime Pin',
      color: null,
      parentId: 'parent',
      catalogId: 'catalog-a',
    },
  ];

  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: options.initialName ?? '',
      } as ProductFormData,
    });
    return <FormProvider {...methods}>{children}</FormProvider>;
  }

  useProductFormCoreMock.mockReturnValue({
    errors: {},
  });
  useProductFormMetadataMock.mockReturnValue({
    selectedCatalogIds: ['catalog-a'],
    categories,
    selectedCategoryId: options.selectedCategoryId ?? null,
    setCategoryId,
  });
  useTitleTermsMock.mockImplementation(
    (_catalogId: string, type: 'size' | 'material' | 'theme') => ({
      data:
        type === 'size'
          ? [{ id: 'size-1', name: '4 cm', name_en: '4 cm', name_pl: '4 cm', catalogId: 'catalog-a', type }]
          : type === 'material'
            ? [
                {
                  id: 'material-1',
                  name: 'Metal',
                  name_en: 'Metal',
                  name_pl: 'Metal',
                  catalogId: 'catalog-a',
                  type,
                },
              ]
            : [
                {
                  id: 'theme-1',
                  name: 'Attack On Titan',
                  name_en: 'Attack On Titan',
                  name_pl: 'Atak Tytanow',
                  catalogId: 'catalog-a',
                  type,
                },
              ],
      isLoading: false,
    })
  );

  render(
    <Wrapper>
      <StructuredProductNameField />
    </Wrapper>
  );

  return { setCategoryId };
}

describe('StructuredProductNameField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens size suggestions after typing the first separator and inserts the chosen size', async () => {
    renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | ' } });
    input.setSelectionRange('Scout Regiment | '.length, 'Scout Regiment | '.length);
    fireEvent.keyUp(input, { key: ' ' });

    expect(await screen.findByText('Suggestions')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('4 cm')[0]!.closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('Scout Regiment | 4 cm | ');
    });
  });

  it('shows parent categories as disabled and syncs the selected category when a leaf is chosen', async () => {
    const { setCategoryId } = renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | ' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | '.length,
      'Scout Regiment | 4 cm | Metal | '.length
    );
    fireEvent.keyUp(input, { key: ' ' });

    const parentCategoryButton = (await screen.findByText('Pins')).closest('button');
    expect(parentCategoryButton).toBeDisabled();

    fireEvent.click((screen.getByText('Pins / Anime Pin').closest('button')) as HTMLButtonElement);

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Anime Pin | '
      );
    });
    expect(setCategoryId).toHaveBeenCalledWith('child');
  });

  it('skips disabled parent categories when choosing by keyboard', async () => {
    const { setCategoryId } = renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | ' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | '.length,
      'Scout Regiment | 4 cm | Metal | '.length
    );
    fireEvent.keyUp(input, { key: ' ' });

    await screen.findByText('Pins / Anime Pin');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Anime Pin | '
      );
    });
    expect(setCategoryId).toHaveBeenCalledWith('child');
  });

  it('syncs the real category when the user types an exact leaf category manually', async () => {
    const { setCategoryId } = renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin' },
    });

    await waitFor(() => {
      expect(setCategoryId).toHaveBeenCalledWith('child');
    });
  });

  it('does not overwrite a manually typed exact category when a stale category is already selected', async () => {
    const { setCategoryId } = renderField({
      selectedCategoryId: 'child',
      categories: [
        {
          id: 'parent',
          name: 'Pins',
          color: null,
          parentId: null,
          catalogId: 'catalog-a',
        },
        {
          id: 'child',
          name: 'Anime Pin',
          color: null,
          parentId: 'parent',
          catalogId: 'catalog-a',
        },
        {
          id: 'child-2',
          name: 'Gaming Pin',
          color: null,
          parentId: 'parent',
          catalogId: 'catalog-a',
        },
      ],
    });
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Gaming Pin' },
    });

    await waitFor(() => {
      expect(setCategoryId).toHaveBeenCalledWith('child-2');
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Gaming Pin'
      );
    });
  });

  it('fills the category segment when category is selected externally after the structured prefix exists', async () => {
    renderField({
      initialName: 'Scout Regiment | 4 cm | Metal',
      selectedCategoryId: 'child',
    });
    const input = screen.getByLabelText('English Name');

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Anime Pin | '
      );
    });
  });

  it('allows removing letters from the lore segment without reverting', async () => {
    renderField({
      initialName: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lore',
      selectedCategoryId: 'child',
    });
    const input = screen.getByLabelText('English Name');

    // Simulate deleting "Lore" character by character via change events
    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lor' },
    });
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Lor'
      );
    });

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | ' },
    });
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Anime Pin | '
      );
    });
  });

  it('opens dropdown on empty lore segment click showing a hint', async () => {
    renderField({
      initialName: 'Scout Regiment | 4 cm | Metal | Anime Pin | ',
      selectedCategoryId: 'child',
    });
    const input = screen.getByLabelText('English Name');

    // Simulate clicking into the lore segment (position after last pipe+space)
    const value = 'Scout Regiment | 4 cm | Metal | Anime Pin | ';
    input.setSelectionRange(value.length, value.length);
    fireEvent.keyUp(input, { key: 'ArrowRight' });

    expect(await screen.findByText('Theme')).toBeInTheDocument();
  });
});
