// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ProductFormCustomFieldProvider } from '@/features/products/context/ProductFormCustomFieldContext';

const { useCustomFieldsMock } = vi.hoisted(() => ({
  useCustomFieldsMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCustomFields: useCustomFieldsMock,
}));

vi.mock('@/shared/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/empty-state', () => ({
  CompactEmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/form-section', () => ({
  FormSection: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
}));

vi.mock('@/shared/ui/InsetPanel', () => ({
  insetPanelVariants: () => 'rounded border border-border/60 bg-card/40 p-3',
}));

vi.mock('@/shared/ui/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/toggle-row', () => ({
  ToggleRow: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <label>
      <input
        type='checkbox'
        checked={checked}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onCheckedChange?.(event.target.checked)
        }
      />
      {label}
    </label>
  ),
}));

import ProductFormCustomFields from './ProductFormCustomFields';

const definitions = [
  { id: 'notes', name: 'Packaging Notes', type: 'text', options: [] },
  {
    id: 'flags',
    name: 'Flags',
    type: 'checkbox_set',
    options: [
      { id: 'gift-ready', label: 'Gift Ready' },
      { id: 'fragile', label: 'Fragile' },
    ],
  },
] satisfies Partial<ProductCustomFieldDefinition>[];

const createProduct = (
  customFields: NonNullable<ProductWithImages['customFields']>
): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: 'catalog-1',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    customFields,
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as ProductWithImages;

function renderCustomFields(customFields: NonNullable<ProductWithImages['customFields']>) {
  useCustomFieldsMock.mockReturnValue({
    data: definitions,
    isLoading: false,
  });

  return render(
    <ProductFormCustomFieldProvider product={createProduct(customFields)}>
      <ProductFormCustomFields />
    </ProductFormCustomFieldProvider>
  );
}

describe('ProductFormCustomFields', () => {
  it('renders and updates text custom field values', async () => {
    const user = userEvent.setup();
    renderCustomFields([{ fieldId: 'notes', textValue: 'Handle with care' }]);

    const input = screen.getByPlaceholderText('Packaging Notes');
    expect(input).toHaveValue('Handle with care');

    await user.clear(input);
    await user.type(input, 'Fragile item');

    expect(screen.getByPlaceholderText('Packaging Notes')).toHaveValue('Fragile item');
  });

  it('renders checkbox sets and toggles selected options', async () => {
    const user = userEvent.setup();
    renderCustomFields([{ fieldId: 'flags', selectedOptionIds: ['gift-ready'] }]);

    const giftReady = screen.getByRole('checkbox', { name: 'Gift Ready' });
    const fragile = screen.getByRole('checkbox', { name: 'Fragile' });

    expect(giftReady).toBeChecked();
    expect(fragile).not.toBeChecked();

    await user.click(fragile);

    expect(giftReady).toBeChecked();
    expect(fragile).toBeChecked();
  });
});
