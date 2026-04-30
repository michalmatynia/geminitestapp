// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';

vi.mock('./ValidatedField', () => ({
  ValidatedField: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    ariaLabel,
    disabled,
    onValueChange,
    options,
    placeholder,
    value,
  }: {
    ariaLabel?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value=''>{placeholder ?? 'Select'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/form-section', () => ({
  FormSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
  FormField: ({
    children,
    description,
    label,
  }: {
    children: React.ReactNode;
    description?: string;
    label: string;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      {children}
    </label>
  ),
}));

vi.mock('@/shared/ui/status-badge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/shared/ui/templates/StandardDataTablePanel', () => ({
  StandardDataTablePanel: () => <div>Price Groups Overview</div>,
}));

import { ProductFormOtherPricingSection } from './ProductFormOther.pricing';

const catalog: CatalogRecord = {
  id: 'catalog-main',
  name: 'Main',
  defaultPriceGroupId: 'group-pln',
  isDefault: true,
  languageIds: [],
  defaultLanguageId: null,
  priceGroupIds: ['group-pln', 'group-eur'],
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
};

const createPriceGroup = (
  id: string,
  name: string,
  currencyCode: string,
  isDefault = false
): PriceGroupWithDetails => ({
  id,
  groupId: id.toUpperCase(),
  name,
  description: null,
  currencyId: currencyCode,
  currencyCode,
  currency: {
    id: currencyCode,
    name: currencyCode,
    code: currencyCode,
    symbol: null,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
  },
  isDefault,
  type: 'standard',
  basePriceField: 'price',
  sourceGroupId: null,
  priceMultiplier: 1,
  addToPrice: 0,
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
});

const priceGroups = [
  createPriceGroup('group-pln', 'Standard PLN', 'PLN', true),
  createPriceGroup('group-eur', 'Retail EUR', 'EUR'),
];

function PricingHarness({
  defaultPriceGroupId = '',
}: {
  defaultPriceGroupId?: string;
}): React.JSX.Element {
  const methods = useForm<ProductFormData>({
    defaultValues: {
      defaultPriceGroupId,
      price: 100,
      sku: 'SKU-1',
    },
  });
  const selectedDefaultPriceGroupId =
    useWatch({ control: methods.control, name: 'defaultPriceGroupId' }) ?? '';

  return (
    <FormProvider {...methods}>
      <ProductFormOtherPricingSection
        hasCatalogs={true}
        isNewProduct={true}
        catalogs={[catalog]}
        selectedCatalogIds={[catalog.id]}
        basePrice={100}
        sourcePrice={null}
        selectedDefaultPriceGroupId={selectedDefaultPriceGroupId}
        filteredPriceGroups={priceGroups}
        setValue={methods.setValue}
      />
    </FormProvider>
  );
}

describe('ProductFormOtherPricingSection', () => {
  it('auto-selects the catalog default price group for a new product', async () => {
    render(<PricingHarness />);

    const select = screen.getByLabelText('Default price group');

    await waitFor(() => expect(select).toHaveValue('group-pln'));
    expect(select).not.toBeDisabled();
    expect(screen.getByText('Auto-selected from catalog')).toBeInTheDocument();
  });

  it('allows the auto-selected price group to be overridden before save', async () => {
    render(<PricingHarness />);

    const select = screen.getByLabelText('Default price group');

    await waitFor(() => expect(select).toHaveValue('group-pln'));
    fireEvent.change(select, { target: { value: 'group-eur' } });

    expect(select).toHaveValue('group-eur');
    expect(select).not.toBeDisabled();
  });
});
