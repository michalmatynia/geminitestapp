'use client';

import { Coins, Languages } from 'lucide-react';
import React from 'react';

import {
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
} from '@/features/internationalization/context/InternationalizationContext';
import { countryFlagMap } from '@/shared/constants/internationalization';
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
  currencyOptions: any[];
  loadingCurrencies: boolean;
  handleOpenCurrencyModal: (currency?: any) => void;
  handleDeleteCurrency: (currency: any) => Promise<void>;
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

const CountriesSection = ({
  filteredCountries,
  loadingCountries,
  countrySearch,
  setCountrySearch,
  handleOpenCountryModal,
  handleDeleteCountry,
}: {
  filteredCountries: any[];
  loadingCountries: boolean;
  countrySearch: string;
  setCountrySearch: (v: string) => void;
  handleOpenCountryModal: (country?: any) => void;
  handleDeleteCountry: (country: any) => Promise<void>;
}): React.JSX.Element => (
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
      items={filteredCountries.map((country) => ({
        id: country.id,
        title: country.code,
        subtitle: country.name,
        icon: (
          <span className='h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-border/40 block mt-1'>
            {countryFlagMap[country.code] ?? null}
          </span>
        ),
        original: country,
      }))}
      isLoading={loadingCountries}
      onEdit={(item) => handleOpenCountryModal(item.original)}
      onDelete={(item) => {
        handleDeleteCountry(item.original).catch(() => {});
      }}
      emptyMessage='No countries yet.'
      renderCustomContent={(item) => (
        <div className='flex flex-wrap gap-1.5'>
          {Array.isArray(item.original.currencies) && item.original.currencies.length > 0
            ? item.original.currencies.map(
              (entry: { currencyId: string; currency: { code: string } }) => (
                <StatusBadge
                  key={entry.currencyId}
                  status={entry.currency.code}
                  variant='neutral'
                  size='sm'
                />
              )
            )
            : null}
        </div>
      )}
    />
  </FormSection>
);

const LanguagesSection = ({
  languages,
  languagesLoading,
  handleOpenLanguageModal,
  handleDeleteLanguage,
}: {
  languages: any[];
  languagesLoading: boolean;
  handleOpenLanguageModal: (lang?: any) => void;
  handleDeleteLanguage: (lang: any) => Promise<void>;
}): React.JSX.Element => (
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
      items={languages.map((language) => ({
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
      }))}
      isLoading={languagesLoading}
      onEdit={(item) => handleOpenLanguageModal(item.original)}
      onDelete={(item) => {
        handleDeleteLanguage(item.original).catch(() => {});
      }}
      emptyMessage='No languages yet.'
      renderCustomContent={(item) => (
        <div className='flex flex-wrap gap-1.5'>
          {Array.isArray(item.original.countries) && item.original.countries.length > 0 ? (
            item.original.countries.map((country: any) => (
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
            ))
          ) : (
            <Hint size='xxs' italic>
              No countries
            </Hint>
          )}
        </div>
      )}
    />
  </FormSection>
);

export function InternationalizationSettings(): React.JSX.Element {
  const {
    loadingCurrencies,
    currencies: currencyOptions,
    loadingCountries,
    filteredCountries,
    languagesLoading,
    languages,
  } = useInternationalizationData();
  const { countrySearch, setCountrySearch } = useInternationalizationUi();
  const {
    handleOpenCurrencyModal,
    handleDeleteCurrency,
    handleOpenCountryModal,
    handleDeleteCountry,
    handleOpenLanguageModal,
    handleDeleteLanguage,
  } = useInternationalizationActions();

  return (
    <div className='space-y-8'>
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

      <LanguagesSection
        languages={languages}
        languagesLoading={languagesLoading}
        handleOpenLanguageModal={handleOpenLanguageModal}
        handleDeleteLanguage={handleDeleteLanguage}
      />

      <CurrencyModal />
      <CountryModal />
      <LanguageModal />
    </div>
  );
}
