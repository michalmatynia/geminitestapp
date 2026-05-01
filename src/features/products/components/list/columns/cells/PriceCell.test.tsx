import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import type * as ProductListContextModule from '@/features/products/context/ProductListContext';
import type {
  PriceGroupForCalculation,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import { createProduct, createRowVisualsContext } from '../../ProductColumns.fixtures';

const { useProductListRowVisualsContextMock } = vi.hoisted(() => ({
  useProductListRowVisualsContextMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof ProductListContextModule>();
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

type PriceCellTestRow = { original: ProductWithImages };
type PriceCellTestComponent = React.ComponentType<{ row: PriceCellTestRow }>;

let PriceCell: PriceCellTestComponent;

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

const createRow = (product: ProductWithImages): PriceCellTestRow => ({
  original: product,
});

beforeEach(async (): Promise<void> => {
  vi.clearAllMocks();
  vi.resetModules();
  useProductListRowVisualsContextMock.mockReturnValue(createRowVisualsContext());
  const imported: { PriceCell: PriceCellTestComponent } = await import('./PriceCell');
  PriceCell = imported.PriceCell;
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

it('renders a dependent price calculated from scraped sourcePrice', () => {
  useProductListRowVisualsContextMock.mockReturnValue(
    createRowVisualsContext({
      currencyCode: 'PLN',
      priceGroups: [
        createPriceGroup(),
        createPriceGroup({
          id: 'group-retail',
          groupId: 'RETAIL',
          currencyId: 'PLN',
          currency: { code: 'PLN' },
          currencyCode: 'PLN',
          type: 'dependent',
          basePriceField: 'sourcePrice',
          sourceGroupId: null,
          priceMultiplier: 2,
        }),
      ],
    })
  );

  render(
    <PriceCell
      row={createRow(
        createProduct({
          price: null,
          sourcePrice: 60,
          defaultPriceGroupId: 'group-usd',
        })
      )}
    />
  );

  expect(screen.getByText('120.00')).toBeInTheDocument();
});

it('renders scraped sourcePrice under the visible product price', () => {
  render(
    <PriceCell
      row={createRow(
        createProduct({
          importSource: 'scrape',
          price: 120,
          sourcePrice: 60,
        })
      )}
    />
  );

  expect(screen.getByText('120.00')).toBeInTheDocument();
  expect(screen.getByText('Source: 60.00')).toBeInTheDocument();
});

it('does not render sourcePrice for non-scraped products', () => {
  render(
    <PriceCell
      row={createRow(
        createProduct({
          importSource: 'base',
          price: 120,
          sourcePrice: 60,
        })
      )}
    />
  );

  expect(screen.getByText('120.00')).toBeInTheDocument();
  expect(screen.queryByText('Source: 60.00')).not.toBeInTheDocument();
});
