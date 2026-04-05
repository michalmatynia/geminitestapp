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
});
