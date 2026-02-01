import type { CurrencyOption, CountryOption, Language } from "../../../shared/types/internationalization";

export async function getCurrencies(): Promise<CurrencyOption[]> {
  const res = await fetch("/api/currencies");
  if (!res.ok) throw new Error("Failed to fetch currencies.");
  return (await res.json()) as CurrencyOption[];
}

export async function getCountries(): Promise<CountryOption[]> {
  const res = await fetch("/api/countries");
  if (!res.ok) throw new Error("Failed to fetch countries.");
  return (await res.json()) as CountryOption[];
}

export async function getLanguages(): Promise<Language[]> {
  const res = await fetch("/api/languages");
  if (!res.ok) throw new Error("Failed to fetch languages.");
  return (await res.json()) as Language[];
}

export async function deleteCurrency(id: string): Promise<void> {
  const res = await fetch(`/api/currencies/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete currency.");
}

export async function deleteCountry(id: string): Promise<void> {
  const res = await fetch(`/api/countries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete country.");
}

export async function deleteLanguage(id: string): Promise<void> {
  const res = await fetch(`/api/languages/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete language.");
}

export async function saveCurrency(id: string | undefined, data: Partial<CurrencyOption>): Promise<CurrencyOption> {
  const res = await fetch(id ? `/api/currencies/${id}` : "/api/currencies", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save currency.");
  return res.json();
}

export async function saveCountry(id: string | undefined, data: Partial<CountryOption>): Promise<CountryOption> {
  const res = await fetch(id ? `/api/countries/${id}` : "/api/countries", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save country.");
  return res.json();
}

export async function saveLanguage(id: string | undefined, data: Partial<Language>): Promise<Language> {
  const res = await fetch(id ? `/api/languages/${id}` : "/api/languages", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save language.");
  return res.json();
}
