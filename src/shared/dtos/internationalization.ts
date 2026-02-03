import { DtoBase, NamedDto } from '../types/base';

// Internationalization DTOs
export interface LanguageDto extends NamedDto {
  code: string;
  nativeName: string;
  isDefault: boolean;
  enabled: boolean;
}

export interface CountryDto extends NamedDto {
  code: string;
  flag: string;
  enabled: boolean;
}

export interface CurrencyDto extends NamedDto {
  code: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  enabled: boolean;
}

export interface TranslationDto extends DtoBase {
  key: string;
  languageId: string;
  value: string;
  namespace: string;
}

export interface CreateLanguageDto {
  code: string;
  name: string;
  nativeName: string;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface UpdateLanguageDto {
  name?: string;
  nativeName?: string;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface CreateTranslationDto {
  key: string;
  languageId: string;
  value: string;
  namespace?: string;
}

export interface UpdateTranslationDto {
  value?: string;
  namespace?: string;
}
