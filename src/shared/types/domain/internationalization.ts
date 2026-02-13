import type { 
  LanguageDto, 
  CountryDto, 
  CurrencyDto, 
  TranslationDto,
  CreateLanguageDto,
  UpdateLanguageDto,
  CreateCountryDto,
  UpdateCountryDto,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CreateTranslationDto,
  UpdateTranslationDto
} from '../dtos';

export type { 
  LanguageDto, 
  CountryDto, 
  CurrencyDto, 
  TranslationDto,
  CreateLanguageDto,
  UpdateLanguageDto,
  CreateCountryDto,
  UpdateCountryDto,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CreateTranslationDto,
  UpdateTranslationDto
};

export type CurrencyOption = CurrencyDto;

export type CountryOption = CountryDto & {
  currencies?: { currencyId: string; currency: CurrencyOption }[];
};

export type Language = LanguageDto & {
  countries?: { countryId: string; country: CountryOption }[];
};

// Full record types with timestamps for API responses

export type CurrencyRecord = CurrencyDto;

export type CountryRecord = CountryDto;

export type CountryWithCurrencies = CountryRecord & {
  currencies: { currencyId: string; currency: CurrencyOption }[];
};

export type LanguageRecord = LanguageDto;

export type LanguageWithCountries = LanguageRecord & {
  countries: { countryId: string; country: CountryOption }[];
};