import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { useWatch } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';

import {
  ProductFormCoreProvider,
  useProductFormCoreState,
  resolveProductFormDefaultValues,
  resolveProductFormDefaultSku,
} from './ProductFormCoreContext';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-EDIT-1',
    importSource: null,
    ...overrides,
  }) as ProductWithImages;

const createDraft = (overrides: Partial<ProductDraft> = {}): ProductDraft =>
  ({
    id: 'draft-1',
    name: 'Draft Template',
    sku: 'OLD-DRAFT-SKU',
    importSource: null,
    ...overrides,
  }) as ProductDraft;

describe('resolveProductFormDefaultSku', () => {
  it('uses the saved product SKU when editing an existing product', () => {
    expect(
      resolveProductFormDefaultSku({
        product: createProduct({ sku: 'SKU-EDIT-9' }),
        draft: createDraft(),
        initialSku: 'IGNORED',
      })
    ).toBe('SKU-EDIT-9');
  });

  it('uses an explicit initial SKU for standard create flows', () => {
    expect(
      resolveProductFormDefaultSku({
        product: undefined,
        draft: null,
        initialSku: 'MANUAL-SKU-1',
      })
    ).toBe('MANUAL-SKU-1');
  });

  it('uses the validator placeholder for create-from-draft instead of the draft SKU', () => {
    expect(
      resolveProductFormDefaultSku({
        product: undefined,
        draft: createDraft({ sku: 'OLD-DRAFT-SKU' }),
      })
    ).toBe(PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER);
  });

  it('leaves the SKU empty for plain create when no initial SKU is provided', () => {
    expect(
      resolveProductFormDefaultSku({
        product: undefined,
        draft: null,
      })
    ).toBe('');
  });
});

describe('resolveProductFormDefaultValues', () => {
  it('hydrates marketplace copy overrides from a saved product and normalizes nullable text for the form', () => {
    expect(
      resolveProductFormDefaultValues({
        product: createProduct({
          marketplaceContentOverrides: [
            {
              integrationIds: ['tradera-1'],
              title: ' Tradera title ',
              description: null,
            },
          ],
        }),
      }).marketplaceContentOverrides
    ).toEqual([
      {
        integrationIds: ['tradera-1'],
        title: 'Tradera title',
        description: '',
      },
    ]);
  });

  it('hydrates marketplace copy overrides from a draft when creating from draft', () => {
    expect(
      resolveProductFormDefaultValues({
        draft: createDraft({
          marketplaceContentOverrides: [
            {
              integrationIds: ['vinted-1', 'tradera-1'],
              title: '',
              description: ' Draft-specific description ',
            },
          ],
        }),
      }).marketplaceContentOverrides
    ).toEqual([
      {
        integrationIds: ['vinted-1', 'tradera-1'],
        title: '',
        description: 'Draft-specific description',
      },
    ]);
  });

  it('hydrates product notes from the edited product into form defaults', () => {
    expect(
      resolveProductFormDefaultValues({
        product: createProduct({
          notes: {
            text: 'Internal note',
            color: '#fde68a',
          },
        }),
      }).notes
    ).toEqual({
      text: 'Internal note',
      color: '#fde68a',
    });
  });
});

function ImportSourceProbe(): React.JSX.Element {
  const { methods } = useProductFormCoreState();
  return createElement(
    'div',
    { 'data-testid': 'import-source' },
    methods.getValues('importSource') ?? 'missing'
  );
}

function DescriptionProbe(): React.JSX.Element {
  const { methods } = useProductFormCoreState();
  const description = useWatch({
    control: methods.control,
    name: 'description_en',
  });
  return createElement(
    'div',
    { 'data-testid': 'description-en' },
    description ?? 'missing'
  );
}

function NameProbe(): React.JSX.Element {
  const { methods } = useProductFormCoreState();
  const name = useWatch({
    control: methods.control,
    name: 'name_en',
  });
  return createElement('div', { 'data-testid': 'name-en' }, name ?? 'missing');
}

function DirtyDescriptionProbe(): React.JSX.Element {
  const { methods } = useProductFormCoreState();
  const description = useWatch({
    control: methods.control,
    name: 'description_en',
  });
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          methods.setValue('description_en', 'Local draft', { shouldDirty: true });
        },
      },
      'Dirty description'
    ),
    createElement(
      'div',
      { 'data-testid': 'description-en' },
      description ?? 'missing'
    )
  );
}

function DirtyNameProbe(): React.JSX.Element {
  const { methods } = useProductFormCoreState();
  const name = useWatch({
    control: methods.control,
    name: 'name_en',
  });
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          methods.setValue('name_en', 'Scout Regiment | 4 cm | Metal | Anime Pin | Lo', {
            shouldDirty: true,
          });
        },
      },
      'Dirty name'
    ),
    createElement('div', { 'data-testid': 'name-en' }, name ?? 'missing')
  );
}

describe('ProductFormCoreProvider', () => {
  it('hydrates importSource from the edited product into form defaults', () => {
    render(
      createElement(
        ProductFormCoreProvider,
        { product: createProduct({ importSource: 'base' }) },
        createElement(ImportSourceProbe)
      )
    );

    expect(screen.getByTestId('import-source')).toHaveTextContent('base');
  });

  it('hydrates importSource from a draft into form defaults when creating from draft', () => {
    render(
      createElement(
        ProductFormCoreProvider,
        { draft: createDraft({ importSource: 'base' }) },
        createElement(ImportSourceProbe)
      )
    );

    expect(screen.getByTestId('import-source')).toHaveTextContent('base');
  });

  it('refreshes non-dirty form fields when the same product receives newer content', async () => {
    const { rerender } = render(
      createElement(
        ProductFormCoreProvider,
        { product: createProduct({ description_en: 'Old description' }) },
        createElement(DescriptionProbe)
      )
    );

    expect(screen.getByTestId('description-en')).toHaveTextContent('Old description');

    rerender(
      createElement(
        ProductFormCoreProvider,
        {
          product: createProduct({
            description_en: 'Fresh AI description',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        },
        createElement(DescriptionProbe)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('description-en')).toHaveTextContent('Fresh AI description');
    });
  });

  it('keeps dirty form fields when synced product detail changes underneath the editor', async () => {
    const { rerender } = render(
      createElement(
        ProductFormCoreProvider,
        { product: createProduct({ description_en: 'Old description' }) },
        createElement(DirtyDescriptionProbe)
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dirty description' }));

    await waitFor(() => {
      expect(screen.getByTestId('description-en')).toHaveTextContent('Local draft');
    });

    rerender(
      createElement(
        ProductFormCoreProvider,
        {
          product: createProduct({
            description_en: 'Fresh AI description',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        },
        createElement(DirtyDescriptionProbe)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('description-en')).toHaveTextContent('Local draft');
    });
  });

  it('keeps dirty english product names when a draft refreshes with the same saved values', async () => {
    const baseDraft = createDraft({
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lore',
      updatedAt: '2026-03-27T10:00:00.000Z',
    });

    const { rerender } = render(
      createElement(
        ProductFormCoreProvider,
        { draft: baseDraft },
        createElement(DirtyNameProbe)
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dirty name' }));

    await waitFor(() => {
      expect(screen.getByTestId('name-en')).toHaveTextContent(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Lo'
      );
    });

    rerender(
      createElement(
        ProductFormCoreProvider,
        {
          draft: {
            ...baseDraft,
            updatedAt: '2026-03-27T11:00:00.000Z',
          },
        },
        createElement(DirtyNameProbe)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('name-en')).toHaveTextContent(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Lo'
      );
    });
  });

  it('refreshes non-dirty english product names when the draft content actually changes', async () => {
    const { rerender } = render(
      createElement(
        ProductFormCoreProvider,
        {
          draft: createDraft({
            name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lore',
            updatedAt: '2026-03-27T10:00:00.000Z',
          }),
        },
        createElement(NameProbe)
      )
    );

    expect(screen.getByTestId('name-en')).toHaveTextContent(
      'Scout Regiment | 4 cm | Metal | Anime Pin | Lore'
    );

    rerender(
      createElement(
        ProductFormCoreProvider,
        {
          draft: createDraft({
            name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
            updatedAt: '2026-03-27T11:00:00.000Z',
          }),
        },
        createElement(NameProbe)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('name-en')).toHaveTextContent(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan'
      );
    });
  });
});
