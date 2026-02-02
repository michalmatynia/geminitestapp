// Internationalization DTOs
export interface LanguageDto {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CountryDto {
  id: string;
  code: string;
  name: string;
  flag: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyDto {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationDto {
  id: string;
  key: string;
  languageId: string;
  value: string;
  namespace: string;
  createdAt: string;
  updatedAt: string;
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
