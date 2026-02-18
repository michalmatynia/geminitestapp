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
  UpdateTranslationDto,
  CountryWithCurrenciesDto,
  LanguageWithCountriesDto
} from '../../contracts/internationalization';

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

export type CountryOption = CountryDto;

export type Language = LanguageDto;

// Full record types with timestamps for API responses

export type CurrencyRecord = CurrencyDto;

export type CountryRecord = CountryDto;

export type CountryWithCurrencies = CountryWithCurrenciesDto;

export type LanguageRecord = LanguageDto;

export type LanguageWithCountries = LanguageWithCountriesDto;
