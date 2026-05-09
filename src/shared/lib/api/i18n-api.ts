/**
 * @file i18n-api.ts
 * @description API client for internationalization (i18n) metadata management.
 * Provides functions to fetch, create, update, and delete countries, currencies, and languages.
 */

import type {
  CountryOption,
  CurrencyOption,
  Language,
  SaveCurrencyInput,
  SaveCountryInput,
  SaveLanguageInput,
} from '@/shared/contracts/internationalization';
import { api } from '@/shared/lib/api-client';

const I18N_METADATA_BASE = '/api/v2/metadata';
const CURRENCIES_ENDPOINT = `${I18N_METADATA_BASE}/currencies`;
const COUNTRIES_ENDPOINT = `${I18N_METADATA_BASE}/countries`;
const LANGUAGES_ENDPOINT = `${I18N_METADATA_BASE}/languages`;
const FULL_COUNTRY_LIST_PAGE_SIZE = 500;

/**
 * Fetches all available currencies.
 */
export async function getCurrencies(): Promise<CurrencyOption[]> {
  return api.get<CurrencyOption[]>(CURRENCIES_ENDPOINT);
}

/**
 * Fetches all available countries.
 */
export async function getCountries(): Promise<CountryOption[]> {
  return api.get<CountryOption[]>(COUNTRIES_ENDPOINT, {
    params: { pageSize: FULL_COUNTRY_LIST_PAGE_SIZE },
  });
}

/**
 * Fetches all available languages.
 */
export async function getLanguages(): Promise<Language[]> {
  return api.get<Language[]>(LANGUAGES_ENDPOINT);
}

/**
 * Deletes a specific currency by ID.
 * @param id The ID of the currency to delete
 */
export async function deleteCurrency(id: string): Promise<void> {
  await api.delete(`${CURRENCIES_ENDPOINT}/${id}`);
}

/**
 * Deletes a specific country by ID.
 * @param id The ID of the country to delete
 */
export async function deleteCountry(id: string): Promise<void> {
  await api.delete(`${COUNTRIES_ENDPOINT}/${id}`);
}

/**
 * Deletes a specific language by ID.
 * @param id The ID of the language to delete
 */
export async function deleteLanguage(id: string): Promise<void> {
  await api.delete(`${LANGUAGES_ENDPOINT}/${id}`);
}

/**
 * Creates or updates a currency.
 * @param id The ID of the currency to update (if undefined, a new currency is created)
 * @param data The currency data to save
 */
export async function saveCurrency(
  id: string | undefined,
  data: SaveCurrencyInput
): Promise<CurrencyOption> {
  if (id) {
    return api.put<CurrencyOption>(`${CURRENCIES_ENDPOINT}/${id}`, data);
  }
  return api.post<CurrencyOption>(CURRENCIES_ENDPOINT, data);
}

/**
 * Creates or updates a country.
 * @param id The ID of the country to update (if undefined, a new country is created)
 * @param data The country data to save
 */
export async function saveCountry(
  id: string | undefined,
  data: SaveCountryInput
): Promise<CountryOption> {
  if (id) {
    return api.put<CountryOption>(`${COUNTRIES_ENDPOINT}/${id}`, data);
  }
  return api.post<CountryOption>(COUNTRIES_ENDPOINT, data);
}

/**
 * Creates or updates a language.
 * @param id The ID of the language to update (if undefined, a new language is created)
 * @param data The language data to save
 */
export async function saveLanguage(
  id: string | undefined,
  data: SaveLanguageInput
): Promise<Language> {
  if (id) {
    return api.put<Language>(`${LANGUAGES_ENDPOINT}/${id}`, data);
  }
  return api.post<Language>(LANGUAGES_ENDPOINT, data);
}
