import type { CurrencyOption } from '@/shared/contracts/internationalization';
import type { SettingsPanelField } from '@/shared/contracts/ui';
import { LoadingState } from '@/shared/ui';

import { renderSelectionChecklistGrid } from '../shared/renderSelectionChecklistGrid';

export type CountryFormState = {
  code: string;
  name: string;
};

export type CountryCodeOption = {
  code: string;
  name: string;
};

export const resolveCountryModalDefaults = (
  options: readonly CountryCodeOption[]
): CountryFormState => {
  const defaultOption = options[0];
  return {
    code: defaultOption?.code ?? '',
    name: defaultOption?.name ?? '',
  };
};

export const toggleSelectedCountryCurrencyIds = (
  selectedCurrencyIds: readonly string[],
  id: string
): string[] =>
  selectedCurrencyIds.includes(id)
    ? selectedCurrencyIds.filter((candidate) => candidate !== id)
    : [...selectedCurrencyIds, id];

export const buildCountryModalTitle = (hasActiveCountry: boolean): string =>
  hasActiveCountry ? 'Edit Country' : 'Add Country';

export const resolveCountryFormChange = (
  previous: CountryFormState,
  values: Partial<CountryFormState>,
  options: readonly CountryCodeOption[]
): CountryFormState => {
  if (values.code) {
    const selectedOption = options.find((option) => option.code === values.code);
    return {
      code: values.code,
      name: selectedOption?.name ?? '',
    };
  }

  return {
    ...previous,
    ...values,
  };
};

export const buildCountryCodeFieldOptions = (
  options: readonly CountryCodeOption[]
): Array<{ value: string; label: string }> =>
  options.map((option) => ({
    value: option.code,
    label: `${option.code} · ${option.name}`,
  }));

export const buildCountryModalFields = (params: {
  countryCodeOptions: readonly CountryCodeOption[];
  currencyOptions: readonly CurrencyOption[];
  loadingCurrencies: boolean;
  selectedCurrencyIds: readonly string[];
  onToggleCurrency: (id: string) => void;
}): SettingsPanelField<CountryFormState>[] => [
  {
    key: 'code',
    label: 'Code',
    type: 'select',
    options: buildCountryCodeFieldOptions(params.countryCodeOptions),
    required: true,
  },
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true,
  },
  {
    key: 'name',
    label: 'Associated Currencies',
    type: 'custom',
    render: () => (
      <div className='space-y-2'>
        {params.loadingCurrencies ? (
          <LoadingState message='Loading currencies...' size='sm' className='py-4' />
        ) : (
          renderSelectionChecklistGrid({
            className: 'mt-2',
            items: params.currencyOptions.map((currency) => ({
              id: currency.id,
              label: `${currency.code} (${currency.name})`,
            })),
            selectedIds: [...params.selectedCurrencyIds],
            onToggle: params.onToggleCurrency,
            emptyMessage: 'No currencies available.',
          })
        )}
      </div>
    ),
  },
];
