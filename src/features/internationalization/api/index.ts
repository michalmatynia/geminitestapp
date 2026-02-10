import { logClientError } from '@/features/observability';
import type {
  CountryOption,
  CurrencyOption,
  Language,
} from '@/shared/types/domain/internationalization';

export async function getCurrencies(): Promise<CurrencyOption[]> {
  try {
    const res = await fetch('/api/currencies');
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      logClientError(new Error('Failed to fetch currencies'), {
        context: { status: res.status, error: payload?.error }
      });
      return [];
    }
    return (await res.json()) as CurrencyOption[];
  } catch (error) {
    logClientError(error, { context: { source: 'getCurrencies' } });
    return [];
  }
}

export async function getCountries(): Promise<CountryOption[]> {
  try {
    const res = await fetch('/api/countries');
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      logClientError(new Error('Failed to fetch countries'), {
        context: { status: res.status, error: payload?.error }
      });
      return [];
    }
    return (await res.json()) as CountryOption[];
  } catch (error) {
    logClientError(error, { context: { source: 'getCountries' } });
    return [];
  }
}

export async function getLanguages(): Promise<Language[]> {
  try {
    const res = await fetch('/api/languages');
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      logClientError(new Error('Failed to fetch languages'), {
        context: { status: res.status, error: payload?.error }
      });
      return [];
    }
    return (await res.json()) as Language[];
  } catch (error) {
    logClientError(error, { context: { source: 'getLanguages' } });
    return [];
  }
}

export async function deleteCurrency(id: string): Promise<void> {
  const res = await fetch(`/api/currencies/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete currency.');
}

export async function deleteCountry(id: string): Promise<void> {
  const res = await fetch(`/api/countries/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete country.');
}

export async function deleteLanguage(id: string): Promise<void> {
  const res = await fetch(`/api/languages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete language.');
}

export type SaveCurrencyInput = Partial<CurrencyOption>;
export type SaveCountryInput = Partial<CountryOption> & { currencyIds?: string[] };
export type SaveLanguageInput = Partial<Language> & { countryIds?: string[] };

export async function saveCurrency(id: string | undefined, data: SaveCurrencyInput): Promise<CurrencyOption> {
  const res = await fetch(id ? `/api/currencies/${id}` : '/api/currencies', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save currency.');
  return res.json() as Promise<CurrencyOption>;
}

export async function saveCountry(id: string | undefined, data: SaveCountryInput): Promise<CountryOption> {
  const res = await fetch(id ? `/api/countries/${id}` : '/api/countries', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save country.');
  return res.json() as Promise<CountryOption>;
}

export async function saveLanguage(id: string | undefined, data: SaveLanguageInput): Promise<Language> {
  const res = await fetch(id ? `/api/languages/${id}` : '/api/languages', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save language.');
  return res.json() as Promise<Language>;
}
