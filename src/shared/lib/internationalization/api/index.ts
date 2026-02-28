import type {
  CountryOption,
  CurrencyOption,
  Language,
} from '@/shared/contracts/internationalization';
import { api } from '@/shared/lib/api-client';

export async function getCurrencies(): Promise<CurrencyOption[]> {
  return api.get<CurrencyOption[]>('/api/currencies');
}

export async function getCountries(): Promise<CountryOption[]> {
  return api.get<CountryOption[]>('/api/countries');
}

export async function getLanguages(): Promise<Language[]> {
  return api.get<Language[]>('/api/languages');
}

export async function deleteCurrency(id: string): Promise<void> {
  await api.delete(`/api/currencies/${id}`);
}

export async function deleteCountry(id: string): Promise<void> {
  await api.delete(`/api/countries/${id}`);
}

export async function deleteLanguage(id: string): Promise<void> {
  await api.delete(`/api/languages/${id}`);
}

export type SaveCurrencyInput = Partial<CurrencyOption>;
export type SaveCountryInput = Partial<CountryOption> & { currencyIds?: string[] };
export type SaveLanguageInput = Partial<Language> & { countryIds?: string[] };

export async function saveCurrency(
  id: string | undefined,
  data: SaveCurrencyInput
): Promise<CurrencyOption> {
  if (id) {
    return api.put<CurrencyOption>(`/api/currencies/${id}`, data);
  }
  return api.post<CurrencyOption>('/api/currencies', data);
}

export async function saveCountry(
  id: string | undefined,
  data: SaveCountryInput
): Promise<CountryOption> {
  if (id) {
    return api.put<CountryOption>(`/api/countries/${id}`, data);
  }
  return api.post<CountryOption>('/api/countries', data);
}

export async function saveLanguage(
  id: string | undefined,
  data: SaveLanguageInput
): Promise<Language> {
  if (id) {
    return api.put<Language>(`/api/languages/${id}`, data);
  }
  return api.post<Language>('/api/languages', data);
}
