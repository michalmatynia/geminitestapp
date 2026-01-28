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
