import { describe, expect, it, vi } from 'vitest';

import {
  buildCountryCodeFieldOptions,
  buildCountryModalFields,
  buildCountryModalTitle,
  resolveCountryFormChange,
  resolveCountryModalDefaults,
  toggleSelectedCountryCurrencyIds,
} from './CountryModal.helpers';

describe('CountryModal helpers', () => {
  it('resolves defaults from the first country option with an empty fallback', () => {
    expect(
      resolveCountryModalDefaults([
        { code: 'PL', name: 'Poland' },
        { code: 'DE', name: 'Germany' },
      ])
    ).toEqual({
      code: 'PL',
      name: 'Poland',
    });
    expect(resolveCountryModalDefaults([])).toEqual({
      code: '',
      name: '',
    });
  });

  it('builds modal titles for add and edit states', () => {
    expect(buildCountryModalTitle(true)).toBe('Edit Country');
    expect(buildCountryModalTitle(false)).toBe('Add Country');
  });

  it('toggles selected currencies in and out of the selection', () => {
    expect(toggleSelectedCountryCurrencyIds(['usd'], 'eur')).toEqual(['usd', 'eur']);
    expect(toggleSelectedCountryCurrencyIds(['usd', 'eur'], 'eur')).toEqual(['usd']);
  });

  it('builds country code select options and modal field definitions', () => {
    expect(
      buildCountryCodeFieldOptions([
        { code: 'PL', name: 'Poland' },
        { code: 'US', name: 'United States' },
      ])
    ).toEqual([
      { value: 'PL', label: 'PL · Poland' },
      { value: 'US', label: 'US · United States' },
    ]);

    const fields = buildCountryModalFields({
      countryCodeOptions: [{ code: 'PL', name: 'Poland' }],
      currencyOptions: [{ id: 'usd', code: 'USD', name: 'US Dollar' }] as any,
      loadingCurrencies: false,
      selectedCurrencyIds: ['usd'],
      onToggleCurrency: vi.fn(),
    });

    expect(fields.map((field) => field.label)).toEqual([
      'Code',
      'Name',
      'Associated Currencies',
    ]);
    expect(fields[0]).toMatchObject({
      key: 'code',
      type: 'select',
      options: [{ value: 'PL', label: 'PL · Poland' }],
    });
  });

  it('applies code-driven name replacement and generic field merging', () => {
    const options = [
      { code: 'PL', name: 'Poland' },
      { code: 'DE', name: 'Germany' },
    ];

    expect(
      resolveCountryFormChange(
        { code: 'PL', name: 'Poland' },
        { code: 'DE' },
        options
      )
    ).toEqual({
      code: 'DE',
      name: 'Germany',
    });

    expect(
      resolveCountryFormChange(
        { code: 'PL', name: 'Poland' },
        { name: 'Custom Poland' },
        options
      )
    ).toEqual({
      code: 'PL',
      name: 'Custom Poland',
    });
  });
});
