// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PriceGroup } from '@/shared/contracts/products/catalogs';

const mocks = vi.hoisted(() => ({
  useProductSettingsPriceGroupsContextMock: vi.fn(),
}));

vi.mock('@/features/products/components/settings/ProductSettingsContext', () => ({
  useProductSettingsPriceGroupsContext: () => mocks.useProductSettingsPriceGroupsContextMock(),
}));

vi.mock('@/features/products/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  FormSection: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title: string;
    actions?: React.ReactNode;
  }) => (
    <section aria-label={title}>
      {actions}
      {children}
    </section>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  SimpleSettingsList: ({
    items,
  }: {
    items: Array<{
      id: string;
      title: React.ReactNode;
      subtitle?: string;
      description?: string;
    }>;
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <div>{item.title}</div>
          {item.subtitle ? <div>{item.subtitle}</div> : null}
          {item.description ? <div>{item.description}</div> : null}
        </div>
      ))}
    </div>
  ),
}));

import { PriceGroupsSettings } from './PriceGroupsSettings';

const priceGroups: PriceGroup[] = [
  {
    id: 'group-pln',
    groupId: 'PLN_STANDARD',
    name: 'Standard PLN',
    description: null,
    currencyId: 'PLN',
    currencyCode: 'PLN',
    isDefault: true,
    type: 'standard',
    basePriceField: 'price',
    sourceGroupId: null,
    priceMultiplier: 1,
    addToPrice: 0,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'group-eur',
    groupId: 'EUR_RETAIL',
    name: 'Retail EUR',
    description: 'Main EUR tier',
    currencyId: 'EUR',
    currencyCode: 'EUR',
    isDefault: false,
    type: 'dependent',
    basePriceField: 'price',
    sourceGroupId: 'group-pln',
    priceMultiplier: 1.25,
    addToPrice: 3,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'group-gbp',
    groupId: 'GBP_STANDARD',
    name: 'Standard GBP',
    description: null,
    currencyId: 'GBP',
    currencyCode: 'GBP',
    isDefault: false,
    type: 'standard',
    basePriceField: 'price',
    sourceGroupId: null,
    priceMultiplier: 1.2,
    addToPrice: 5,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
  },
];

describe('PriceGroupsSettings', () => {
  beforeEach(() => {
    mocks.useProductSettingsPriceGroupsContextMock.mockReturnValue({
      loadingGroups: false,
      priceGroups,
      defaultGroupId: 'group-pln',
      onDefaultGroupChange: vi.fn(),
      defaultGroupSaving: false,
      onOpenPriceGroupCreate: vi.fn(),
      onEditPriceGroup: vi.fn(),
      onDeletePriceGroup: vi.fn(),
    });
  });

  it('shows dependent source-group and multiplier details in the settings list', () => {
    render(<PriceGroupsSettings />);

    expect(screen.getByText('Retail EUR')).toBeInTheDocument();
    expect(screen.getByText('EUR · dependent')).toBeInTheDocument();
    expect(
      screen.getByText('Main EUR tier · Depends on Standard PLN (PLN) × 1.25 + 3.00')
    ).toBeInTheDocument();
    expect(screen.getByText('Base price × 1.20 + 5.00')).toBeInTheDocument();
  });

  it('resolves legacy dependent sourceGroupId values that point to group.groupId', () => {
    mocks.useProductSettingsPriceGroupsContextMock.mockReturnValue({
      loadingGroups: false,
      priceGroups: [
        priceGroups[0],
        {
          ...priceGroups[1],
          sourceGroupId: 'PLN_STANDARD',
        },
      ],
      defaultGroupId: 'group-pln',
      onDefaultGroupChange: vi.fn(),
      defaultGroupSaving: false,
      onOpenPriceGroupCreate: vi.fn(),
      onEditPriceGroup: vi.fn(),
      onDeletePriceGroup: vi.fn(),
    });

    render(<PriceGroupsSettings />);

    expect(screen.getByText('Main EUR tier · Depends on Standard PLN (PLN) × 1.25 + 3.00')).toBeInTheDocument();
    expect(screen.queryByText(/missing source group/i)).not.toBeInTheDocument();
  });
});
