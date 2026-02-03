import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button, Input, Badge, Alert } from "@/shared/ui";
import { MoreVertical } from "lucide-react";

import type { CurrencyOption, CountryOption, Language } from "@/shared/types/internationalization";
import { countryFlagMap } from "@/shared/constants/internationalization";


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
}: InternationalizationSettingsProps): React.JSX.Element {
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
            <Button
              className="min-w-[100px] border border-white/20 hover:border-white/40"
              type="button"
              onClick={(): void => handleOpenCurrencyModal()}
            >
              Add Currency
            </Button>
          </div>
          {loadingCurrencies ? (
            <div className="rounded-md border border-dashed border p-6 text-center text-gray-400">
              Loading currencies...
            </div>
          ) : currencyOptions.length === 0 ? (
            <div className="rounded-md border border-dashed border p-6 text-center text-gray-400">
              No currencies yet.
            </div>
          ) : (
            <div className="space-y-3">
              {currencyOptions.map((currency: CurrencyOption) => (
                <div
                  key={currency.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card/60 px-4 py-3"
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
                      <Button
                        variant="ghost"
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-muted/50 hover:text-white p-0"
                        aria-label="Currency actions"
                        type="button"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(event: Event): void => {
                          event.preventDefault();
                          handleOpenCurrencyModal(currency);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-300 focus:text-red-300"
                        onSelect={(event: Event): void => {
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
            <Button
              className="min-w-[100px] border border-white/20 hover:border-white/40"
              type="button"
              onClick={(): void => handleOpenCountryModal()}
            >
              Add Country
            </Button>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <Input
                className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setCountrySearch(event.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              {filteredCountries.length} result(s)
            </p>
          </div>
          {loadingCountries ? (
            <div className="rounded-md border border-dashed border p-6 text-center text-gray-400">
              Loading countries...
            </div>
          ) : filteredCountries.length === 0 ? (
            <div className="rounded-md border border-dashed border p-6 text-center text-gray-400">
              No countries yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCountries.map((country: CountryOption) => (
                <div
                  key={country.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card/60 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-6 overflow-hidden rounded-sm border border">
                        {countryFlagMap[country.code] ?? null}
                      </span>
                      <p className="font-semibold text-white">{country.code}</p>
                    </div>
                    <p className="text-sm text-gray-400">{country.name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {country.currencies?.length ? (
                        country.currencies.map((entry: { currencyId: string; currency: { code: string } }) => (
                          <Badge
                            key={entry.currencyId}
                            variant="neutral"
                          >
                            {entry.currency.code}
                          </Badge>
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
                      <Button
                        variant="ghost"
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-muted/50 hover:text-white p-0"
                        aria-label="Country actions"
                        type="button"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(event: Event): void => {
                          event.preventDefault();
                          handleOpenCountryModal(country);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-300 focus:text-red-300"
                        onSelect={(event: Event): void => {
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
        <div className="rounded-md border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Languages</p>
            <Button
              className="min-w-[100px] border border-white/20 hover:border-white/40"
              type="button"
              onClick={(): void => handleOpenNewLanguageModal()}
            >
              Add Language
            </Button>
          </div>
          {languagesLoading ? (
            <div className="mt-4 rounded-md border border-dashed border p-4 text-center text-sm text-gray-400">
              Loading languages...
            </div>
          ) : languagesError ? (
            <div className="mt-4">
              <Alert variant="error">
                {languagesError}
              </Alert>
            </div>
          ) : languages.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border p-4 text-center text-sm text-gray-400">
              No languages yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {languages.map((language: Language) => (
                <div
                  key={language.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2"
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
                        language.countries.map((entry: { countryId: string; country: { name: string; code: string } }) => (
                          <Badge
                            key={entry.countryId}
                            variant="neutral"
                            title={entry.country.name}
                            className="flex items-center gap-2"
                          >
                            <span className="h-3 w-4 overflow-hidden rounded-sm border border">
                              {countryFlagMap[entry.country.code] ?? null}
                            </span>
                            <span>{entry.country.name}</span>
                          </Badge>
                        ))
                      ) : (
                        <span>No countries assigned</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-muted/50 hover:text-white p-0"
                        aria-label="Language actions"
                        type="button"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(event: Event): void => {
                          event.preventDefault();
                          handleOpenLanguageModal(language);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-300 focus:text-red-300"
                        onSelect={(event: Event): void => {
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
