'use client';

import { Coins, Languages } from 'lucide-react';
import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import { countryFlagMap } from '@/shared/constants/internationalization';
import type {
  CountryOption,
  CurrencyOption,
  Language,
} from '@/shared/contracts/internationalization';
import { Button, Badge } from '@/shared/ui/primitives.public';
import { SearchInput, FormSection, Hint } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { CountryModal } from './country-modal/CountryModal';
import { CurrencyModal } from './currency-modal/CurrencyModal';
import { LanguageModal } from './language-modal/LanguageModal';

const CurrenciesSection = ({
  currencyOptions,
  loadingCurrencies,
  handleOpenCurrencyModal,
  handleDeleteCurrency,
}: {
  currencyOptions: CurrencyOption[];
  loadingCurrencies: boolean;
  handleOpenCurrencyModal: (currency?: CurrencyOption | null) => void;
  handleDeleteCurrency: (currency: CurrencyOption) => Promise<void>;
}): React.JSX.Element => (
  <FormSection
    title='Currencies'
    description='Manage currency codes available for price groups.'
    actions={
      <Button size='xs' type='button' onClick={() => handleOpenCurrencyModal()}>
        Add Currency
      </Button>
    }
    variant='subtle'
    className='p-6'
  >
    <SimpleSettingsList
      items={currencyOptions.map((currency) => ({
        id: currency.id,
        title: currency.code,
        subtitle: currency.symbol,
        description: currency.name,
        icon: (
          <div className='flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400'>
            <Coins className='size-4' />
          </div>
        ),
        original: currency,
      }))}
      isLoading={loadingCurrencies}
      onEdit={(item) => handleOpenCurrencyModal(item.original)}
      onDelete={(item) => {
        handleDeleteCurrency(item.original).catch(() => {});
      }}
      emptyMessage='No currencies yet.'
    />
  </FormSection>
);

const CountryFlagIcon = ({ code }: { code: string }): React.JSX.Element => (
  <span className='h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-border/40 block mt-1'>
    {countryFlagMap[code] ?? null}
  </span>
);

const CountryCurrencyBadges = ({
  currencies,
}: {
  currencies: Array<{ currencyId: string; currency: { code: string } }>;
}): React.JSX.Element | null => {
  if (currencies.length === 0) return null;
  return (
    <div className='flex flex-wrap gap-1.5'>
      {currencies.map((entry) => (
        <StatusBadge
          key={entry.currencyId}
          status={entry.currency.code}
          variant='neutral'
          size='sm'
        />
      ))}
    </div>
  );
};

const CountriesSection = ({
  filteredCountries,
  loadingCountries,
  countrySearch,
  setCountrySearch,
  handleOpenCountryModal,
  handleDeleteCountry,
}: {
  filteredCountries: CountryOption[];
  loadingCountries: boolean;
  countrySearch: string;
  setCountrySearch: (v: string) => void;
  handleOpenCountryModal: (country?: CountryOption | null) => void;
  handleDeleteCountry: (country: CountryOption) => Promise<void>;
}): React.JSX.Element => {
  const items = filteredCountries.map((country) => ({
    id: country.id,
    title: country.code,
    subtitle: country.name,
    icon: <CountryFlagIcon code={country.code} />,
    original: country,
  }));

  return (
    <FormSection
      title='Countries'
      description='Manage countries for regional settings.'
      actions={
        <Button size='xs' type='button' onClick={() => handleOpenCountryModal()}>
          Add Country
        </Button>
      }
      variant='subtle'
      className='p-6'
    >
      <div className='mb-4'>
        <SearchInput
          placeholder='Search countries...'
          value={countrySearch}
          onChange={(event) => setCountrySearch(event.target.value)}
          onClear={() => setCountrySearch('')}
          size='sm'
        />
      </div>

      <SimpleSettingsList
        items={items}
        isLoading={loadingCountries}
        onEdit={(item) => handleOpenCountryModal(item.original)}
        onDelete={(item) => {
          handleDeleteCountry(item.original).catch(() => {});
        }}
        emptyMessage='No countries yet.'
        renderCustomContent={(item) => <CountryCurrencyBadges currencies={item.original.currencies} />}
      />
    </FormSection>
  );
};

const LanguageCountryBadges = ({
  countries,
}: {
  countries: Language['countries'];
}): React.JSX.Element => {
  if (countries.length === 0) {
    return (
      <Hint size='xxs' italic>
        No countries
      </Hint>
    );
  }

  return (
    <div className='flex flex-wrap gap-1.5'>
      {countries.map((country) => (
        <Badge
          key={country.id}
          variant='outline'
          className='flex items-center gap-1.5 px-1.5 py-0 text-[10px] border-border/40 bg-muted/10'
          title={country.name}
        >
          <span className='h-2 w-3 shrink-0 overflow-hidden rounded-[1px] border border-white/10'>
            {countryFlagMap[country.code] ?? null}
          </span>
          <span className='truncate max-w-[60px]'>{country.code}</span>
        </Badge>
      ))}
    </div>
  );
};

const LanguagesSection = ({
  languages,
  languagesLoading,
  handleOpenLanguageModal,
  handleDeleteLanguage,
}: {
  languages: Language[];
  languagesLoading: boolean;
  handleOpenLanguageModal: (lang?: Language | null) => void;
  handleDeleteLanguage: (lang: Language) => Promise<void>;
}): React.JSX.Element => {
  const items = languages.map((language) => ({
    id: language.id,
    title: language.name,
    subtitle: language.code,
    description: language.nativeName,
    icon: (
      <div className='flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400'>
        <Languages className='size-3.5' />
      </div>
    ),
    original: language,
  }));

  return (
    <FormSection
      title='Languages'
      description='Configure system languages and localizations.'
      actions={
        <Button size='xs' type='button' onClick={() => handleOpenLanguageModal()}>
          Add Language
        </Button>
      }
      variant='subtle'
      className='p-6'
    >
      <SimpleSettingsList
        columns={3}
        items={items}
        isLoading={languagesLoading}
        onEdit={(item) => handleOpenLanguageModal(item.original)}
        onDelete={(item) => {
          handleDeleteLanguage(item.original).catch(() => {});
        }}
        emptyMessage='No languages yet.'
        renderCustomContent={(item) => <LanguageCountryBadges countries={item.original.countries} />}
      />
    </FormSection>
  );
};

export const SettingsGrid = (): React.JSX.Element => {
  const {
    loadingCurrencies,
    currencies: currencyOptions,
    loadingCountries,
    filteredCountries,
  } = useInternationalizationData();
  const { countrySearch, setCountrySearch } = useInternationalizationUi();
  const {
    handleOpenCurrencyModal,
    handleDeleteCurrency,
    handleOpenCountryModal,
    handleDeleteCountry,
  } = useInternationalizationActions();

  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
      <CurrenciesSection
        currencyOptions={currencyOptions}
        loadingCurrencies={loadingCurrencies}
        handleOpenCurrencyModal={handleOpenCurrencyModal}
        handleDeleteCurrency={handleDeleteCurrency}
      />
      <CountriesSection
        filteredCountries={filteredCountries}
        loadingCountries={loadingCountries}
        countrySearch={countrySearch}
        setCountrySearch={setCountrySearch}
        handleOpenCountryModal={handleOpenCountryModal}
        handleDeleteCountry={handleDeleteCountry}
      />
    </div>
  );
};

export const LanguagesGrid = (): React.JSX.Element => {
  const { languagesLoading, languages } = useInternationalizationData();
  const { handleOpenLanguageModal, handleDeleteLanguage } =
    useInternationalizationActions();

  return (
    <LanguagesSection
      languages={languages}
      languagesLoading={languagesLoading}
      handleOpenLanguageModal={handleOpenLanguageModal}
      handleDeleteLanguage={handleDeleteLanguage}
    />
  );
};

export function InternationalizationSettings(): React.JSX.Element {
  return (
    <div className='space-y-8'>
      <SettingsGrid />
      <LanguagesGrid />

      <CurrencyModal />
      <CountryModal />
      <LanguageModal />
    </div>
  );
}
