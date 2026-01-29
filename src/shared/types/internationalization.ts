export type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
};

export type CountryOption = {
  id: string;
  code: string;
  name: string;
  currencies?: { currencyId: string; currency: CurrencyOption }[];
};

export type Language = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries?: { countryId: string; country: CountryOption }[];
};

// Full record types with timestamps for API responses

export type CurrencyRecord = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CountryRecord = {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CountryWithCurrencies = CountryRecord & {
  currencies: { currencyId: string; currency: CurrencyOption }[];
};

export type LanguageRecord = {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LanguageWithCountries = LanguageRecord & {
  countries: { countryId: string; country: CountryOption }[];
};
