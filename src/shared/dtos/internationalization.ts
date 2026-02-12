import { DtoBase, NamedDto, CreateDto, UpdateDto } from '../types/base';

// Internationalization DTOs
export interface LanguageDto extends NamedDto {
  code: string;
  nativeName: string | null;
  isDefault: boolean;
  enabled: boolean;
}

export interface CountryDto extends NamedDto {
  code: string;
  enabled: boolean;
}

export interface CurrencyDto extends NamedDto {
  code: string;
  symbol: string | null;
  exchangeRate?: number;
  isDefault: boolean;
  enabled: boolean;
}

export interface TranslationDto extends DtoBase {
  key: string;
  languageId: string;
  value: string;
  namespace: string;
}

export type CreateLanguageDto = CreateDto<LanguageDto>;
export type UpdateLanguageDto = UpdateDto<LanguageDto>;

export type CreateCountryDto = CreateDto<CountryDto>;
export type UpdateCountryDto = UpdateDto<CountryDto>;

export type CreateCurrencyDto = CreateDto<CurrencyDto>;
export type UpdateCurrencyDto = UpdateDto<CurrencyDto>;

export type CreateTranslationDto = CreateDto<TranslationDto>;
export type UpdateTranslationDto = UpdateDto<TranslationDto>;
