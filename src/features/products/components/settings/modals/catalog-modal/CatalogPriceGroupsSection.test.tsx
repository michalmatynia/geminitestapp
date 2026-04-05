// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/shared/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/shared/ui/badge', () => ({
  Badge: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/shared/ui/select-simple', () => ({
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
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import { CatalogPriceGroupsSection } from './CatalogPriceGroupsSection';
import { CatalogModalProvider } from './context/CatalogModalContext';

const createContextValue = (overrides?: Partial<React.ComponentProps<typeof CatalogModalProvider>['value']>) => ({
  form: {
    name: 'Catalog',
    description: '',
    isDefault: false,
  },
  setForm: vi.fn(),
  selectedLanguageIds: [],
  toggleLanguage: vi.fn(),
  moveLanguage: vi.fn(),
  defaultLanguageId: '',
  setDefaultLanguageId: vi.fn(),
  languageQuery: '',
  setLanguageQuery: vi.fn(),
  availableLanguages: [],
  getLanguage: vi.fn(),
  languagesLoading: false,
  languagesError: null,
  error: null,
  catalogPriceGroupIds: ['PLN_STANDARD'],
  togglePriceGroup: vi.fn(),
  catalogDefaultPriceGroupId: 'PLN_STANDARD',
  setCatalogDefaultPriceGroupId: vi.fn(),
  priceGroups: [
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
    },
    {
      id: 'group-eur',
      groupId: 'EUR_STANDARD',
      name: 'Standard EUR',
      description: null,
      currencyId: 'EUR',
      currencyCode: 'EUR',
      isDefault: false,
      type: 'standard',
      basePriceField: 'price',
      sourceGroupId: null,
      priceMultiplier: 1.2,
      addToPrice: 5,
    },
  ],
  loadingGroups: false,
  ...overrides,
});

describe('CatalogPriceGroupsSection', () => {
  it('treats legacy selected groupId values as selected and removes them by the original identifier', () => {
    const value = createContextValue();

    render(
      <CatalogModalProvider value={value}>
        <CatalogPriceGroupsSection />
      </CatalogModalProvider>
    );

    expect(screen.getByLabelText('Default price group')).toHaveValue('PLN_STANDARD');
    expect(screen.getAllByText(/Standard PLN/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Standard PLN \(PLN\)\s*Remove/i }));

    expect(value.togglePriceGroup).toHaveBeenCalledWith('PLN_STANDARD');
  });

  it('adds unselected groups by canonical group id', () => {
    const value = createContextValue();

    render(
      <CatalogModalProvider value={value}>
        <CatalogPriceGroupsSection />
      </CatalogModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Standard EUR \(EUR\)\s*Add/i }));

    expect(value.togglePriceGroup).toHaveBeenCalledWith('group-eur');
  });
});
