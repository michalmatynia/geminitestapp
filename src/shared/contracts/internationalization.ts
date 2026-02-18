import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Language Contract
 */
export const languageSchema = namedDtoSchema.extend({
  code: z.string(),
  nativeName: z.string().nullable(),
  isDefault: z.boolean(),
  enabled: z.boolean(),
});

export type LanguageDto = z.infer<typeof languageSchema>;

export const createLanguageSchema = languageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLanguageDto = z.infer<typeof createLanguageSchema>;
export type LanguageCreateInput = CreateLanguageDto;
export type UpdateLanguageDto = Partial<CreateLanguageDto>;
export type LanguageUpdateInput = UpdateLanguageDto;

/**
 * Country Contract
 */
export const countrySchema = namedDtoSchema.extend({
  code: z.string(),
  enabled: z.boolean(),
});

export type CountryDto = z.infer<typeof countrySchema>;

export const createCountrySchema = countrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCountryDto = z.infer<typeof createCountrySchema>;
export type CountryCreateInput = CreateCountryDto;
export type UpdateCountryDto = Partial<CreateCountryDto>;
export type CountryUpdateInput = UpdateCountryDto;

/**
 * Currency Contract
 */
export const currencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
  exchangeRate: z.number().optional(),
  isDefault: z.boolean(),
  enabled: z.boolean(),
});

export type CurrencyDto = z.infer<typeof currencySchema>;

export const createCurrencySchema = currencySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCurrencyDto = z.infer<typeof createCurrencySchema>;
export type CurrencyCreateInput = CreateCurrencyDto;
export type UpdateCurrencyDto = Partial<CreateCurrencyDto>;
export type CurrencyUpdateInput = UpdateCurrencyDto;

/**
 * Translation Contract
 */
export const translationSchema = dtoBaseSchema.extend({
  key: z.string(),
  languageId: z.string(),
  value: z.string(),
  namespace: z.string(),
});

export type TranslationDto = z.infer<typeof translationSchema>;

export const createTranslationSchema = translationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTranslationDto = z.infer<typeof createTranslationSchema>;
export type UpdateTranslationDto = Partial<CreateTranslationDto>;

/**
 * Composite Internationalization DTOs
 */

export const countryWithCurrenciesSchema = countrySchema.extend({
  currencies: z.array(z.object({
    currencyId: z.string(),
    currency: currencySchema,
  })),
});

export type CountryWithCurrenciesDto = z.infer<typeof countryWithCurrenciesSchema>;

export const languageWithCountriesSchema = languageSchema.extend({
  countries: z.array(z.object({
    countryId: z.string(),
    country: countrySchema,
  })),
});

export type LanguageWithCountriesDto = z.infer<typeof languageWithCountriesSchema>;
