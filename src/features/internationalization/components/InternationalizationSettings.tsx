'use client';

import { MoreVertical, Coins, Languages } from 'lucide-react';
import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { countryFlagMap } from '@/shared/constants/internationalization';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  Button, 
  Alert, 
  SearchInput,
  FormSection,
  StatusBadge
} from '@/shared/ui';

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
    languagesError,
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
          {loadingCurrencies ? (
            <div className='py-8 text-center text-sm text-gray-400'>Loading currencies...</div>
          ) : currencyOptions.length === 0 ? (
            <div className='py-8 text-center text-sm text-gray-500'>No currencies yet.</div>
          ) : (
            <div className='space-y-3'>
              {currencyOptions.map((currency: CurrencyOption) => (
                <div
                  key={currency.id}
                  className='flex items-center justify-between rounded-md border border-border bg-card/40 px-4 py-3'
                >
                  <div className='flex items-center gap-3'>
                    <div className='flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400'>
                      <Coins className='size-4' />
                    </div>
                    <div>
                      <p className='font-semibold text-white'>
                        {currency.code}
                        {currency.symbol ? (
                          <span className='ml-2 text-sm text-gray-400'>
                            {currency.symbol}
                          </span>
                        ) : null}
                      </p>
                      <p className='text-xs text-gray-400'>{currency.name}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 text-gray-400 hover:text-white'
                        type='button'
                      >
                        <MoreVertical className='size-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onSelect={() => handleOpenCurrencyModal(currency)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-red-300 focus:text-red-300'
                        onSelect={() => void handleDeleteCurrency(currency)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
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
          
          {loadingCountries ? (
            <div className='py-8 text-center text-sm text-gray-400'>Loading countries...</div>
          ) : filteredCountries.length === 0 ? (
            <div className='py-8 text-center text-sm text-gray-500'>No countries yet.</div>
          ) : (
            <div className='space-y-3'>
              {filteredCountries.map((country: CountryOption) => (
                <div
                  key={country.id}
                  className='flex items-center justify-between rounded-md border border-border bg-card/40 px-4 py-3'
                >
                  <div className='min-w-0'>
                    <div className='flex items-center gap-3'>
                      <span className='h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-border/40'>
                        {countryFlagMap[country.code] ?? null}
                      </span>
                      <p className='font-semibold text-white'>{country.code}</p>
                      <span className='truncate text-sm text-gray-400'>{country.name}</span>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {country.currencies?.length ? (
                        country.currencies.map((entry: { currencyId: string; currency: { code: string } }) => (
                          <StatusBadge
                            key={entry.currencyId}
                            status={entry.currency.code}
                            variant='neutral'
                            size='sm'
                          />
                        ))
                      ) : null}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 text-gray-400 hover:text-white'
                        type='button'
                      >
                        <MoreVertical className='size-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onSelect={() => handleOpenCountryModal(country)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-red-300 focus:text-red-300'
                        onSelect={() => void handleDeleteCountry(country)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
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
        {languagesLoading ? (
          <div className='py-8 text-center text-sm text-gray-400'>Loading languages...</div>
        ) : languagesError ? (
          <Alert variant='error' className='mb-4'>{languagesError}</Alert>
        ) : languages.length === 0 ? (
          <div className='py-8 text-center text-sm text-gray-500'>No languages yet.</div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {languages.map((language: Language) => (
              <div
                key={language.id}
                className='group flex flex-col justify-between rounded-lg border border-border bg-card/40 p-4 transition-colors hover:bg-card/60'
              >
                <div className='mb-4 flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                      <div className='flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400'>
                        <Languages className='size-3.5' />
                      </div>
                      <p className='font-semibold text-white truncate'>{language.name}</p>
                    </div>
                    <p className='mt-0.5 text-xs text-gray-500 font-medium uppercase'>{language.code}</p>
                    {language.nativeName && (
                      <p className='mt-1 text-xs text-gray-400 italic'>{language.nativeName}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7 text-gray-400 hover:text-white'
                        type='button'
                      >
                        <MoreVertical className='size-3.5' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onSelect={() => handleOpenLanguageModal(language)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-red-300 focus:text-red-300'
                        onSelect={() => void handleDeleteLanguage(language)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className='flex flex-wrap gap-1.5'>
                  {language.countries?.length ? (
                    language.countries.map((entry: { countryId: string; country: { name: string; code: string } }) => (
                      <div
                        key={entry.countryId}
                        className='flex items-center gap-1.5 rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-gray-300 border border-border/40'
                        title={entry.country.name}
                      >
                        <span className='h-2.5 w-3.5 shrink-0 overflow-hidden rounded-sm border border-border/40'>
                          {countryFlagMap[entry.country.code] ?? null}
                        </span>
                        <span className='truncate max-w-[60px]'>{entry.country.code}</span>
                      </div>
                    ))
                  ) : (
                    <span className='text-[10px] text-gray-500 italic'>No countries</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}
