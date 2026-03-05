import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Internationalization DTOs
 */

export const countryCodes = ['PL', 'DE', 'GB', 'SE'] as const;
export const currencyCodes = ['USD', 'EUR', 'PLN', 'GBP', 'SEK'] as const;
export const languageCodes = ['EN', 'PL', 'DE', 'SV'] as const;

export type CountryCode = (typeof countryCodes)[number];
export type CurrencyCode = (typeof currencyCodes)[number];
export type LanguageCode = (typeof languageCodes)[number];

export const languageSchema = namedDtoSchema.extend({
  code: z.string(),
  nativeName: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type LanguageRecord = z.infer<typeof languageSchema>;

export const countrySchema = namedDtoSchema.extend({
  code: z.string(),
  isoAlpha3: z.string().optional(),
  nativeName: z.string().optional(),
  phoneCode: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CountryRecord = z.infer<typeof countrySchema>;

export const currencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
  exchangeRate: z.number().optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CurrencyRecord = z.infer<typeof currencySchema>;
export type CurrencyOption = CurrencyRecord;

export const translationSchema = dtoBaseSchema.extend({
  languageId: z.string(),
  key: z.string(),
  value: z.string(),
  namespace: z.string().optional(),
});

export type TranslationRecord = z.infer<typeof translationSchema>;

export const createLanguageSchema = languageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LanguageCreateInput = z.infer<typeof createLanguageSchema>;
export type LanguageUpdateInput = Partial<LanguageCreateInput>;

export const createCountrySchema = countrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CountryCreateInput = z.infer<typeof createCountrySchema>;
export type CountryUpdateInput = Partial<CountryCreateInput>;

export const createCurrencySchema = currencySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CurrencyCreateInput = z.infer<typeof createCurrencySchema>;
export type CurrencyUpdateInput = Partial<CurrencyCreateInput>;

export type CurrencyRepository = {
  listCurrencies(): Promise<CurrencyRecord[]>;
  getCurrencyById(id: string): Promise<CurrencyRecord | null>;
  getCurrencyByCode(code: string): Promise<CurrencyRecord | null>;
  createCurrency(data: CurrencyCreateInput): Promise<CurrencyRecord>;
  updateCurrency(id: string, data: CurrencyUpdateInput): Promise<CurrencyRecord>;
  deleteCurrency(id: string): Promise<void>;
  isCurrencyInUse(id: string): Promise<boolean>;
  ensureDefaultCurrencies(): Promise<void>;
};

export const createTranslationSchema = translationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TranslationCreateInput = z.infer<typeof createTranslationSchema>;
export type TranslationUpdateInput = Partial<TranslationCreateInput>;

/**
 * Composite DTOs
 */

export const countryWithCurrenciesSchema = countrySchema.extend({
  currencies: z.array(
    z.object({
      currencyId: z.string(),
      currency: currencySchema,
    })
  ),
});

export type CountryWithCurrencies = z.infer<typeof countryWithCurrenciesSchema>;
export type CountryOption = CountryWithCurrencies;

export const languageWithCountriesSchema = languageSchema.extend({
  countries: z.array(countrySchema),
});

export type LanguageWithCountries = z.infer<typeof languageWithCountriesSchema>;
export type Language = LanguageWithCountries;

/**
 * Persistence Inputs
 */
export type SaveCurrencyInput = Partial<CurrencyOption>;
export type SaveCountryInput = Partial<CountryOption> & { currencyIds?: string[] };
export type SaveLanguageInput = Partial<Language> & { countryIds?: string[] };

export type { AppProviderValue as InternationalizationProvider } from './system';
