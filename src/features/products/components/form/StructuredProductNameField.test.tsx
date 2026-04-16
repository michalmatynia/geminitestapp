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
    name_en?: string | null;
    name_pl?: string | null;
    name_de?: string | null;
    color: string | null;
    parentId: string | null;
    catalogId: string;
  }>;
  initialName?: string;
  initialNamePl?: string;
  fieldName?: 'name_en' | 'name_pl';
  locale?: 'en' | 'pl';
  selectedCategoryId?: string | null;
  sizeTerms?: Array<string | { name_en: string; name_pl?: string | null }>;
  materialTerms?: Array<string | { name_en: string; name_pl?: string | null }>;
  themeTerms?: Array<string | { name_en: string; name_pl?: string | null }>;
};

const toTitleTermFixture = (
  term: string | { name_en: string; name_pl?: string | null },
  type: 'size' | 'material' | 'theme',
  index: number
) => {
  const nameEn = typeof term === 'string' ? term : term.name_en;
  const namePl = typeof term === 'string' ? term : (term.name_pl ?? null);
  return {
    id: `${type}-${index}`,
    name: nameEn,
    name_en: nameEn,
    name_pl: namePl,
    catalogId: 'catalog-a',
    type,
  };
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
        name_pl: options.initialNamePl ?? '',
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
    normalizeNameError: null,
    setNormalizeNameError: vi.fn(),
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
          ? sizeTerms.map((term, index) => toTitleTermFixture(term, type, index))
          : type === 'material'
            ? materialTerms.map((term, index) => toTitleTermFixture(term, type, index))
            : themeTerms.map((term, index) => toTitleTermFixture(term, type, index)),
      isLoading: false,
    })
  );

  render(
    <Wrapper>
      <StructuredProductNameField
        fieldName={options.fieldName ?? 'name_en'}
        config={{ locale: options.locale ?? 'en' }}
      />
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
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-owns', listbox.id);
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

  it('renders a title-terms shortcut next to English Name for the active catalog', () => {
    renderField();

    const titleTermsLink = screen.getByRole('link', { name: /open title terms/i });

    expect(titleTermsLink).toHaveAttribute(
      'href',
      '/admin/products/title-terms?catalogId=catalog-a'
    );
    expect(titleTermsLink).toHaveAttribute('target', '_blank');
  });

  it('prefers the normalize error and clears it on manual edit', () => {
    const setNormalizeNameError = vi.fn();
    useProductFormCoreMock.mockReturnValue({
      errors: {
        name_en: {
          message: 'Schema error',
        },
      },
      normalizeNameError: 'Normalize failed: invalid title format.',
      setNormalizeNameError,
    });
    useProductFormMetadataMock.mockReturnValue({
      selectedCatalogIds: ['catalog-a'],
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          name_en: 'Scout Regiment | 4 cm | Metal | Anime Pins | Anime',
          categoryId: '',
        } as ProductFormData,
      });
      return <FormProvider {...methods}>{children}</FormProvider>;
    }

    render(
      <Wrapper>
        <StructuredProductNameField />
      </Wrapper>
    );

    expect(screen.getByText('Normalize failed: invalid title format.')).toBeInTheDocument();
    const input = screen.getByLabelText('English Name');
    fireEvent.change(input, {
      target: {
        value: 'Scout Regiment Badge | 4 cm | Metal | Anime Pins | Anime',
      },
    });

    expect(setNormalizeNameError).toHaveBeenCalledWith(null);
  });

  it('sorts matching non-category suggestions alphabetically inside the dropdown', async () => {
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
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
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

  it('keeps the typed segment in the input while showing matches in one bounded dropdown', async () => {
    renderField({
      sizeTerms: ['1 cm', '2 cm', '3 cm', '4 cm', '5 cm', '6 cm'],
    });
    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, { target: { value: 'Scout Regiment | cm' } });
    input.setSelectionRange('Scout Regiment | cm'.length, 'Scout Regiment | cm'.length);
    fireEvent.keyUp(input, { key: 'm' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
    const scrollRegion = listbox.firstElementChild;

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyUp(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyUp(input, { key: 'ArrowDown' });

    expect((input as HTMLInputElement).value).toBe('Scout Regiment | cm');
    expect(listbox.className).toContain('left-0');
    expect(listbox.className).toContain('right-0');
    expect(listbox.className).toContain('overflow-hidden');
    expect(scrollRegion?.className ?? '').toContain('overflow-y-auto');
    expect(within(listbox).getByRole('option', { name: '1 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '2 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '3 cm' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(listbox).getByRole('option', { name: '4 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '5 cm' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '6 cm' })).toBeInTheDocument();
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

  it('uses translated Polish title term suggestions with English fallback', async () => {
    renderField({
      fieldName: 'name_pl',
      locale: 'pl',
      initialNamePl: 'Scout Regiment | du',
      sizeTerms: [
        { name_en: 'Large', name_pl: 'Duzy' },
        { name_en: '4 cm', name_pl: null },
      ],
    });
    const input = screen.getByLabelText('Polish Name');

    input.setSelectionRange('Scout Regiment | du'.length, 'Scout Regiment | du'.length);
    fireEvent.keyUp(input, { key: 'u' });

    const listbox = await screen.findByRole('listbox', { name: 'Size suggestions' });
    expect(within(listbox).getByText('Duzy')).toBeInTheDocument();
    expect(within(listbox).getByText('Large')).toBeInTheDocument();

    fireEvent.click(within(listbox).getByText('Duzy').closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('Scout Regiment | Duzy | ');
    });
  });

  it('uses translated Polish category suggestions and syncs the selected category', async () => {
    const { setCategoryId } = renderField({
      fieldName: 'name_pl',
      locale: 'pl',
      initialNamePl: 'Scout Regiment | 4 cm | Metal | przy',
      categories: [
        {
          id: 'parent',
          name: 'Pins',
          name_en: 'Pins',
          name_pl: 'Przypinki',
          color: null,
          parentId: null,
          catalogId: 'catalog-a',
        },
        {
          id: 'child',
          name: 'Anime Pin',
          name_en: 'Anime Pin',
          name_pl: 'Przypinka Anime',
          color: null,
          parentId: 'parent',
          catalogId: 'catalog-a',
        },
      ],
    });
    const input = screen.getByLabelText('Polish Name');

    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | przy'.length,
      'Scout Regiment | 4 cm | Metal | przy'.length
    );
    fireEvent.keyUp(input, { key: 'y' });

    const listbox = await screen.findByRole('listbox', { name: 'Category suggestions' });
    const childCategoryButton = within(listbox)
      .getByText('Przypinki / Przypinka Anime')
      .closest('button');

    fireEvent.click(childCategoryButton as HTMLButtonElement);

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        'Scout Regiment | 4 cm | Metal | Przypinka Anime | '
      );
    });
    expect(setCategoryId).toHaveBeenCalledWith('child');
  });
});
