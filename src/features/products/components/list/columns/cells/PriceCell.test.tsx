import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import { createProduct, createRowVisualsContext } from '../../ProductColumns.fixtures';

const { useProductListRowVisualsContextMock } = vi.hoisted(() => ({
  useProductListRowVisualsContextMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/products/context/ProductListContext')>();
  return {
    ...actual,
    useProductListRowVisualsContext: () => useProductListRowVisualsContextMock(),
  };
});

vi.mock('@/features/products/components/EditableCell', () => ({
  EditableCell: ({ value }: { value: number | null }) => (
    <span>{value !== null ? value.toFixed(2) : '—'}</span>
  ),
}));

vi.mock('@/shared/ui/tooltip', () => ({
  Tooltip: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
  }) => (
    <div data-testid='tooltip' data-content={String(content)}>
      {children}
    </div>
  ),
}));

let PriceCell: typeof import('./PriceCell').PriceCell;

const createPriceGroup = (
  overrides: Partial<PriceGroupForCalculation> = {}
): PriceGroupForCalculation => ({
  id: 'group-usd',
  groupId: 'USD',
  currencyId: 'USD',
  type: 'standard',
  isDefault: true,
  sourceGroupId: null,
  priceMultiplier: 1,
  addToPrice: 0,
  currency: { code: 'USD' },
  currencyCode: 'USD',
  ...overrides,
});

const createRow = (product: ProductWithImages) => ({ original: product }) as never;

describe('PriceCell', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    useProductListRowVisualsContextMock.mockReturnValue(createRowVisualsContext());
    ({ PriceCell } = await import('./PriceCell'));
  });

  it('renders a currency tooltip when the requested currency falls back to the base price group', () => {
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        currencyCode: 'CAD',
        priceGroups: [createPriceGroup()],
      })
    );

    render(
      <PriceCell
        row={createRow(
          createProduct({
            price: 10,
            defaultPriceGroupId: 'group-usd',
          })
        )}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Converted price: 10.00 USD' })
    ).toBeInTheDocument();
    expect(screen.getByText('→10.00')).toBeInTheDocument();
  });

  it('renders the converted price and base price details when a target currency group exists', () => {
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        currencyCode: 'EUR',
        priceGroups: [
          createPriceGroup(),
          createPriceGroup({
            id: 'group-eur',
            groupId: 'EUR',
            currencyId: 'EUR',
            currency: { code: 'EUR' },
            currencyCode: 'EUR',
            priceMultiplier: 1.25,
          }),
        ],
      })
    );

    render(
      <PriceCell
        row={createRow(
          createProduct({
            price: 10,
            defaultPriceGroupId: 'group-usd',
          })
        )}
      />
    );

    expect(screen.getByText('12.50')).toBeInTheDocument();
    expect(screen.getByText('Base: 10.00 USD')).toBeInTheDocument();
  });
});
