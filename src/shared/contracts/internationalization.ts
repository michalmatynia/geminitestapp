import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Internationalization DTOs
 */

export const languageSchema = namedDtoSchema.extend({
  code: z.string(),
  nativeName: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type LanguageDto = z.infer<typeof languageSchema>;
export type LanguageRecord = LanguageDto;

export const countrySchema = namedDtoSchema.extend({
  code: z.string(),
  isoAlpha3: z.string().optional(),
  nativeName: z.string().optional(),
  phoneCode: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CountryDto = z.infer<typeof countrySchema>;
export type CountryRecord = CountryDto;

export const currencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CurrencyDto = z.infer<typeof currencySchema>;
export type CurrencyRecord = CurrencyDto;
export type CurrencyOption = CurrencyDto;

export const translationSchema = dtoBaseSchema.extend({
  languageId: z.string(),
  key: z.string(),
  value: z.string(),
  namespace: z.string().optional(),
});

export type TranslationDto = z.infer<typeof translationSchema>;

export const createLanguageSchema = languageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLanguageDto = z.infer<typeof createLanguageSchema>;
export type UpdateLanguageDto = Partial<CreateLanguageDto>;

export const createCountrySchema = countrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCountryDto = z.infer<typeof createCountrySchema>;
export type UpdateCountryDto = Partial<CreateCountryDto>;

export const createCurrencySchema = currencySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCurrencyDto = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencyDto = Partial<CreateCurrencyDto>;

export type CurrencyRepository = {
  listCurrencies(): Promise<CurrencyRecord[]>;
  getCurrencyById(id: string): Promise<CurrencyRecord | null>;
  getCurrencyByCode(code: string): Promise<CurrencyRecord | null>;
  createCurrency(data: CreateCurrencyDto): Promise<CurrencyRecord>;
  updateCurrency(id: string, data: UpdateCurrencyDto): Promise<CurrencyRecord>;
  deleteCurrency(id: string): Promise<void>;
  isCurrencyInUse(id: string): Promise<boolean>;
  ensureDefaultCurrencies(): Promise<void>;
};

export const createTranslationSchema = translationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTranslationDto = z.infer<typeof createTranslationSchema>;
export type UpdateTranslationDto = Partial<CreateTranslationDto>;

/**
 * Composite DTOs
 */

export const countryWithCurrenciesSchema = countrySchema.extend({
  currencies: z.array(z.object({
    currencyId: z.string(),
    currency: currencySchema,
  })),
});

export type CountryWithCurrenciesDto = z.infer<typeof countryWithCurrenciesSchema>;
export type CountryWithCurrencies = CountryWithCurrenciesDto;
export type CountryOption = CountryWithCurrenciesDto;

export const languageWithCountriesSchema = languageSchema.extend({
  countries: z.array(countrySchema),
});

export type LanguageWithCountriesDto = z.infer<typeof languageWithCountriesSchema>;
export type LanguageWithCountries = LanguageWithCountriesDto;
export type Language = LanguageWithCountriesDto;
