import { api } from '@/shared/lib/api-client';
import type {
  CountryOption,
  CurrencyOption,
  Language,
  SaveCurrencyInput,
  SaveCountryInput,
  SaveLanguageInput,
} from '@/shared/contracts/internationalization';

const I18N_METADATA_BASE = '/api/v2/metadata';
const CURRENCIES_ENDPOINT = `${I18N_METADATA_BASE}/currencies`;
const COUNTRIES_ENDPOINT = `${I18N_METADATA_BASE}/countries`;
const LANGUAGES_ENDPOINT = `${I18N_METADATA_BASE}/languages`;

export async function getCurrencies(): Promise<CurrencyOption[]> {
  return api.get<CurrencyOption[]>(CURRENCIES_ENDPOINT);
}

export async function getCountries(): Promise<CountryOption[]> {
  return api.get<CountryOption[]>(COUNTRIES_ENDPOINT);
}

export async function getLanguages(): Promise<Language[]> {
  return api.get<Language[]>(LANGUAGES_ENDPOINT);
}

export async function deleteCurrency(id: string): Promise<void> {
  await api.delete(`${CURRENCIES_ENDPOINT}/${id}`);
}

export async function deleteCountry(id: string): Promise<void> {
  await api.delete(`${COUNTRIES_ENDPOINT}/${id}`);
}

export async function deleteLanguage(id: string): Promise<void> {
  await api.delete(`${LANGUAGES_ENDPOINT}/${id}`);
}

export async function saveCurrency(
  id: string | undefined,
  data: SaveCurrencyInput
): Promise<CurrencyOption> {
  if (id) {
    return api.put<CurrencyOption>(`${CURRENCIES_ENDPOINT}/${id}`, data);
  }
  return api.post<CurrencyOption>(CURRENCIES_ENDPOINT, data);
}

export async function saveCountry(
  id: string | undefined,
  data: SaveCountryInput
): Promise<CountryOption> {
  if (id) {
    return api.put<CountryOption>(`${COUNTRIES_ENDPOINT}/${id}`, data);
  }
  return api.post<CountryOption>(COUNTRIES_ENDPOINT, data);
}

export async function saveLanguage(
  id: string | undefined,
  data: SaveLanguageInput
): Promise<Language> {
  if (id) {
    return api.put<Language>(`${LANGUAGES_ENDPOINT}/${id}`, data);
  }
  return api.post<Language>(LANGUAGES_ENDPOINT, data);
}
