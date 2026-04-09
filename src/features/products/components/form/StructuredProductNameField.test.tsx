// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
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
  sizeTerms?: string[];
  materialTerms?: string[];
  themeTerms?: string[];
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
  const sizeTerms = options.sizeTerms ?? ['4 cm'];
  const materialTerms = options.materialTerms ?? ['Metal'];
  const themeTerms = options.themeTerms ?? ['Attack On Titan'];

  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: options.initialName ?? '',
        categoryId: '',
      } as ProductFormData,
    });
    return <FormProvider {...methods}>{children}</FormProvider>;
  }

  function CategoryValueProbe(): React.JSX.Element {
    const methods = useFormContext<ProductFormData>();
    const watchedCategoryId = methods.watch('categoryId') ?? '';

    return <output data-testid='mapped-category-id'>{watchedCategoryId}</output>;
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
          ? sizeTerms.map((term, index) => ({
              id: `size-${index}`,
              name: term,
              name_en: term,
              name_pl: term,
              catalogId: 'catalog-a',
              type,
            }))
          : type === 'material'
            ? materialTerms.map((term, index) => ({
                id: `material-${index}`,
                name: term,
                name_en: term,
                name_pl: term,
                catalogId: 'catalog-a',
                type,
              }))
            : themeTerms.map((term, index) => ({
                id: `theme-${index}`,
                name: term,
                name_en: term,
                name_pl: term,
                catalogId: 'catalog-a',
                type,
              })),
      isLoading: false,
    })
  );

  render(
    <Wrapper>
      <StructuredProductNameField />
      <CategoryValueProbe />
    </Wrapper>
  );

  return { setCategoryId };
}

describe('StructuredProductNameField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for the first typed size character before opening suggestions and inserts the chosen size', async () => {
    renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | ' } });
    input.setSelectionRange('Scout Regiment | '.length, 'Scout Regiment | '.length);
    fireEvent.keyUp(input, { key: ' ' });

    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Scout Regiment | c' } });
    input.setSelectionRange('Scout Regiment | c'.length, 'Scout Regiment | c'.length);
    fireEvent.keyUp(input, { key: 'c' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
    const sizeOption = within(listbox).getByRole('option', { name: '4 cm' });
    expect(sizeOption).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(within(listbox).getByText('4 cm')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('4 cm')[0]!.closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('Scout Regiment | 4 cm | ');
    });
  });

  it('matches material suggestions by contains', async () => {
    renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | et' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | et'.length,
      'Scout Regiment | 4 cm | et'.length
    );
    fireEvent.keyUp(input, { key: 't' });

    const listbox = await screen.findByRole('listbox', { name: 'Material suggestions' });
    expect(within(listbox).getByText('Metal')).toBeInTheDocument();
  });

  it('sorts matching non-category suggestions alphabetically before rendering the split window', async () => {
    renderField({
      sizeTerms: ['8 cm', '2 cm', '6 cm', '4 cm'],
    });
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | cm' } });
    input.setSelectionRange('Scout Regiment | cm'.length, 'Scout Regiment | cm'.length);
    fireEvent.keyUp(input, { key: 'm' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
    const optionTexts = within(listbox)
      .getAllByRole('option')
      .map((option) => option.textContent?.trim());

    expect(optionTexts).toEqual(['2 cm', '4 cm', '6 cm', '8 cm']);
  });

  it('matches theme suggestions by contains', async () => {
    renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | tit' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | Anime Pin | tit'.length,
      'Scout Regiment | 4 cm | Metal | Anime Pin | tit'.length
    );
    fireEvent.keyUp(input, { key: 't' });

    const listbox = await screen.findByRole('listbox', { name: 'Theme suggestions' });
    expect(within(listbox).getByText('Attack On Titan')).toBeInTheDocument();
  });

  it('hides the suggestion overlay entirely when the typed value does not exist on the list', async () => {
    renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | zz' } });
    input.setSelectionRange('Scout Regiment | zz'.length, 'Scout Regiment | zz'.length);
    fireEvent.keyUp(input, { key: 'z' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Size suggestions' })).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Use custom value')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('lets the user move up and down through the anchored list before choosing a size', async () => {
    renderField({
      sizeTerms: ['2 cm', '4 cm', '6 cm'],
    });
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | cm' } });
    input.setSelectionRange('Scout Regiment | cm'.length, 'Scout Regiment | cm'.length);
    fireEvent.keyUp(input, { key: 'm' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
    expect(within(listbox).getByRole('option', { name: '2 cm' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyUp(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyUp(input, { key: 'ArrowDown' });

    const selectedOption = within(listbox).getByRole('option', { name: '6 cm' });
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', selectedOption.id);

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('Scout Regiment | 6 cm | ');
    });
  });

  it('updates the highlighted suggestion when the user hovers a different row', async () => {
    renderField({
      sizeTerms: ['2 cm', '4 cm', '6 cm'],
    });
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | cm' } });
    input.setSelectionRange('Scout Regiment | cm'.length, 'Scout Regiment | cm'.length);
    fireEvent.keyUp(input, { key: 'm' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
    const hoveredOption = within(listbox).getByRole('option', { name: '4 cm' });

    fireEvent.mouseEnter(hoveredOption);

    expect(hoveredOption).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', hoveredOption.id);
  });

  it('keeps the typed segment in the input while showing matches above and below the active suggestion', async () => {
    renderField({
      sizeTerms: ['1 cm', '2 cm', '3 cm', '4 cm', '5 cm', '6 cm'],
    });
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | cm' } });
    input.setSelectionRange('Scout Regiment | cm'.length, 'Scout Regiment | cm'.length);
    fireEvent.keyUp(input, { key: 'm' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyUp(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyUp(input, { key: 'ArrowDown' });

    expect((input as HTMLInputElement).value).toBe('Scout Regiment | cm');
    expect(within(listbox).getByRole('option', { name: '1 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '2 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '3 cm' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(listbox).getByRole('option', { name: '4 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '5 cm' })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: '6 cm' })).not.toBeInTheDocument();
  });

  it('shows parent categories as disabled and syncs the selected category when a leaf is chosen', async () => {
    const { setCategoryId } = renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | p' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | p'.length,
      'Scout Regiment | 4 cm | Metal | p'.length
    );
    fireEvent.keyUp(input, { key: 'p' });

    const listbox = await screen.findByRole('listbox', { name: 'Category suggestions' });
    const parentCategoryButton = within(listbox).getByText('Pins').closest('button');
    const childCategoryButton = within(listbox).getByText('Pins / Anime Pin').closest('button');

    expect(parentCategoryButton).toBeDisabled();
    expect(parentCategoryButton?.className).toContain('cursor-not-allowed');
    expect(childCategoryButton?.className).toContain('cursor-pointer');
    expect(childCategoryButton).toHaveAttribute('aria-selected', 'true');
    expect(childCategoryButton?.className).toContain('bg-foreground/12');

    fireEvent.click(
      childCategoryButton as HTMLButtonElement
    );

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Anime Pin | '
      );
    });
    expect(screen.getByTestId('mapped-category-id')).toHaveTextContent('child');
    expect(setCategoryId).toHaveBeenCalledWith('child');
  });

  it('skips disabled parent categories when choosing by keyboard', async () => {
    const { setCategoryId } = renderField();
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | p' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | p'.length,
      'Scout Regiment | 4 cm | Metal | p'.length
    );
    fireEvent.keyUp(input, { key: 'p' });

    await screen.findByRole('listbox', { name: 'Category suggestions' });
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

  it('waits for the first lore character before opening the theme dropdown', async () => {
    renderField({
      initialName: 'Scout Regiment | 4 cm | Metal | Anime Pin | ',
      selectedCategoryId: 'child',
    });
    const input = screen.getByLabelText('English Name');

    // Simulate clicking into the lore segment (position after last pipe+space)
    const value = 'Scout Regiment | 4 cm | Metal | Anime Pin | ';
    input.setSelectionRange(value.length, value.length);
    fireEvent.keyUp(input, { key: 'ArrowRight' });

    expect(screen.queryByRole('listbox', { name: 'Theme suggestions' })).not.toBeInTheDocument();

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | t' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | Anime Pin | t'.length,
      'Scout Regiment | 4 cm | Metal | Anime Pin | t'.length
    );
    fireEvent.keyUp(input, { key: 't' });

    expect(await screen.findByRole('listbox', { name: 'Theme suggestions' })).toBeInTheDocument();
  });
});
