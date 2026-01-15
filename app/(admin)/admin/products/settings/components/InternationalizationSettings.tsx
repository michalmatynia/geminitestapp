import React, { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyOption, CountryOption, Language } from "../types";
import { countryFlagMap } from "../constants";

type InternationalizationSettingsProps = {
  loadingCurrencies: boolean;
  currencyOptions: CurrencyOption[];
  handleOpenCurrencyModal: (currency?: CurrencyOption) => void;
  handleDeleteCurrency: (currency: CurrencyOption) => void;
  loadingCountries: boolean;
  filteredCountries: CountryOption[];
  countrySearch: string;
  setCountrySearch: (value: string) => void;
  handleOpenCountryModal: (country?: CountryOption) => void;
  handleDeleteCountry: (country: CountryOption) => void;
  languagesLoading: boolean;
  languagesError: string | null;
  languages: Language[];
  handleOpenNewLanguageModal: () => void;
  handleOpenLanguageModal: (language: Language) => void;
  handleDeleteLanguage: (language: Language) => void;
};

export function InternationalizationSettings({
  loadingCurrencies,
  currencyOptions,
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
  handleOpenNewLanguageModal,
  handleOpenLanguageModal,
  handleDeleteLanguage,
}: InternationalizationSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Currencies</h2>
              <p className="mt-1 text-sm text-gray-400">
                Manage currency codes available for price groups.
              </p>
            </div>
            <button
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
              type="button"
              onClick={() => handleOpenCurrencyModal()}
            >
              Add Currency
            </button>
          </div>
          {loadingCurrencies ? (
            <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
              Loading currencies...
            </div>
          ) : currencyOptions.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
              No currencies yet.
            </div>
          ) : (
            <div className="space-y-3">
              {currencyOptions.map((currency) => (
                <div
                  key={currency.id}
                  className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {currency.code}
                      {currency.symbol ? (
                        <span className="ml-2 text-sm text-gray-400">
                          {currency.symbol}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-gray-400">{currency.name}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                        aria-label="Currency actions"
                        type="button"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleOpenCurrencyModal(currency);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-300 focus:text-red-300"
                        onSelect={(event) => {
                          event.preventDefault();
                          void handleDeleteCurrency(currency);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Countries</h2>
              <p className="mt-1 text-sm text-gray-400">
                Manage countries for regional settings.
              </p>
            </div>
            <button
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
              type="button"
              onClick={() => handleOpenCountryModal()}
            >
              Add Country
            </button>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <input
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              {filteredCountries.length} result(s)
            </p>
          </div>
          {loadingCountries ? (
            <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
              Loading countries...
            </div>
          ) : filteredCountries.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
              No countries yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCountries.map((country) => (
                <div
                  key={country.id}
                  className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-6 overflow-hidden rounded-sm border border-gray-700">
                        {countryFlagMap[country.code] ?? null}
                      </span>
                      <p className="font-semibold text-white">{country.code}</p>
                    </div>
                    <p className="text-sm text-gray-400">{country.name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {country.currencies?.length ? (
                        country.currencies.map((entry) => (
                          <span
                            key={entry.currencyId}
                            className="rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-gray-200"
                          >
                            {entry.currency.code}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">
                          No currencies assigned
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                        aria-label="Country actions"
                        type="button"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleOpenCountryModal(country);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-300 focus:text-red-300"
                        onSelect={(event) => {
                          event.preventDefault();
                          void handleDeleteCountry(country);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Languages</p>
            <button
              className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-200"
              type="button"
              onClick={handleOpenNewLanguageModal}
            >
              Add Language
            </button>
          </div>
          {languagesLoading ? (
            <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
              Loading languages...
            </div>
          ) : languagesError ? (
            <div className="mt-4 rounded-md border border-dashed border-red-500/40 p-4 text-center text-sm text-red-200">
              {languagesError}
            </div>
          ) : languages.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
              No languages yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {languages.map((language) => (
                <div
                  key={language.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {language.name}
                      <span className="ml-2 text-xs text-gray-500">
                        ({language.code})
                      </span>
                    </p>
                    {language.nativeName ? (
                      <p className="text-xs text-gray-500">
                        {language.nativeName}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                      {language.countries?.length ? (
                        language.countries.map((entry) => (
                          <div
                            key={entry.countryId}
                            className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-gray-200"
                            title={entry.country.name}
                          >
                            <span className="h-3 w-4 overflow-hidden rounded-sm border border-gray-700">
                              {countryFlagMap[entry.country.code] ?? null}
                            </span>
                            <span>{entry.country.name}</span>
                          </div>
                        ))
                      ) : (
                        <span>No countries assigned</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                        aria-label="Language actions"
                        type="button"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleOpenLanguageModal(language);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-300 focus:text-red-300"
                        onSelect={(event) => {
                          event.preventDefault();
                          handleDeleteLanguage(language);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
