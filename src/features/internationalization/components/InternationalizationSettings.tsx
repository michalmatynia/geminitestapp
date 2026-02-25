'use client';

import { Coins, Languages } from 'lucide-react';
import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { countryFlagMap } from '@/shared/constants/internationalization';
import { 
  Button, 
  SearchInput,
  FormSection,
  StatusBadge,
  SimpleSettingsList,
  Badge,
  Hint
} from '@/shared/ui';

import { CountryModal } from './country-modal/CountryModal';
import { CurrencyModal } from './currency-modal/CurrencyModal';
import { LanguageModal } from './language-modal/LanguageModal';

export function InternationalizationSettings(): React.JSX.Element {
  const {
    loadingCurrencies,
    currencies: currencyOptions,
    handleOpenCurrencyModal,
    handleDeleteCurrency,
    loadingCountries,
    filteredCountries,
    countrySearch,
    setCountrySearch,
    handleOpenCountryModal,
    handleDeleteCountry,
    languagesLoading,
    languages,
    handleOpenLanguageModal,
    handleDeleteLanguage,
  } = useInternationalizationContext();

  return (
    <div className='space-y-8'>
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Currencies Section */}
        <FormSection
          title='Currencies'
          description='Manage currency codes available for price groups.'
          actions={
            <Button
              size='xs'
              type='button'
              onClick={(): void => handleOpenCurrencyModal()}
            >
              Add Currency
            </Button>
          }
          variant='subtle'
          className='p-6'
        >
          <SimpleSettingsList
            items={currencyOptions.map(currency => ({
              id: currency.id,
              title: currency.code,
              subtitle: currency.symbol,
              description: currency.name,
              icon: (
                <div className='flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400'>
                  <Coins className='size-4' />
                </div>
              ),
              original: currency
            }))}
            isLoading={loadingCurrencies}
            onEdit={(item) => handleOpenCurrencyModal(item.original)}
            onDelete={(item) => void handleDeleteCurrency(item.original)}
            emptyMessage='No currencies yet.'
          />
        </FormSection>

        {/* Countries Section */}
        <FormSection
          title='Countries'
          description='Manage countries for regional settings.'
          actions={
            <Button
              size='xs'
              type='button'
              onClick={(): void => handleOpenCountryModal()}
            >
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
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setCountrySearch(event.target.value)}
              onClear={() => setCountrySearch('')}
              size='sm'
            />
          </div>
          
          <SimpleSettingsList
            items={filteredCountries.map(country => ({
              id: country.id,
              title: country.code,
              subtitle: country.name,
              icon: (
                <span className='h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-border/40 block mt-1'>
                  {countryFlagMap[country.code] ?? null}
                </span>
              ),
              original: country
            }))}
            isLoading={loadingCountries}
            onEdit={(item) => handleOpenCountryModal(item.original)}
            onDelete={(item) => void handleDeleteCountry(item.original)}
            emptyMessage='No countries yet.'
            renderCustomContent={(item) => (
              <div className='flex flex-wrap gap-1.5'>
                {item.original.currencies?.length ? (
                  item.original.currencies.map((entry: { currencyId: string; currency: { code: string } }) => (
                    <StatusBadge
                      key={entry.currencyId}
                      status={entry.currency.code}
                      variant='neutral'
                      size='sm'
                    />
                  ))
                ) : null}
              </div>
            )}
          />
        </FormSection>
      </div>

      {/* Languages Section */}
      <FormSection
        title='Languages'
        description='Configure system languages and localizations.'
        actions={
          <Button
            size='xs'
            type='button'
            onClick={(): void => handleOpenLanguageModal()}
          >
            Add Language
          </Button>
        }
        variant='subtle'
        className='p-6'
      >
        <SimpleSettingsList
          columns={3}
          items={languages.map(language => ({
            id: language.id,
            title: language.name,
            subtitle: language.code,
            description: language.nativeName,
            icon: (
              <div className='flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400'>
                <Languages className='size-3.5' />
              </div>
            ),
            original: language
          }))}
          isLoading={languagesLoading}
          onEdit={(item) => handleOpenLanguageModal(item.original)}
          onDelete={(item) => void handleDeleteLanguage(item.original)}
          emptyMessage='No languages yet.'
          renderCustomContent={(item) => (
            <div className='flex flex-wrap gap-1.5'>
              {item.original.countries?.length ? (
                item.original.countries.map((country) => (
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
                <Hint size='xxs' italic>No countries</Hint>
              )}
            </div>
          )}
        />
      </FormSection>

      <CurrencyModal />
      <CountryModal />
      <LanguageModal />
    </div>
  );
}
