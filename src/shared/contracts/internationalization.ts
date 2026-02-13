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
export type UpdateLanguageDto = Partial<CreateLanguageDto>;

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
export type UpdateCountryDto = Partial<CreateCountryDto>;

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
export type UpdateCurrencyDto = Partial<CreateCurrencyDto>;

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
