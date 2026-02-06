import { Entity } from '../base-types';

import type { 
  LanguageDto, 
  CountryDto, 
  CurrencyDto, 
  TranslationDto 
} from '../dtos';

export type { 
  LanguageDto, 
  CountryDto, 
  CurrencyDto, 
  TranslationDto 
};

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

export type CurrencyRecord = Entity & {
  code: string;
  name: string;
  symbol: string | null;
};

export type CountryRecord = Entity & {
  code: string;
  name: string;
};

export type CountryWithCurrencies = CountryRecord & {
  currencies: { currencyId: string; currency: CurrencyOption }[];
};

export type LanguageRecord = Entity & {
  code: string;
  name: string;
  nativeName: string | null;
};

export type LanguageWithCountries = LanguageRecord & {
  countries: { countryId: string; country: CountryOption }[];
};