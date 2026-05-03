import { countryCodeOptions } from '@/shared/constants/countries';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CountryOption } from '@/shared/contracts/internationalization';

const normalizeLookupToken = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeCountryOptionId = (id: string | undefined, fallback: string): string => {
  const normalizedId = id?.trim();
  return normalizedId !== undefined && normalizedId.length > 0 ? normalizedId : fallback;
};

const toCountryOption = (country: {
  code: string;
  id?: string;
  name: string;
}): CountryOption => ({
  id: normalizeCountryOptionId(country.id, country.code),
  code: country.code.trim().toUpperCase(),
  name: country.name.trim(),
  isActive: true,
  currencies: [],
});

const staticCountryOptions = countryCodeOptions.map(toCountryOption);

const normalizeInternationalizationCountry = (country: CountryOption): CountryOption | null => {
  const code = country.code.trim().toUpperCase();
  const id = country.id.trim();
  const name = country.name.trim();
  if (code.length === 0 && id.length === 0) return null;
  const normalizedCode = code.length > 0 ? code : id.toUpperCase();
  const normalizedId = id.length > 0 ? id : normalizedCode;
  const normalizedName = name.length > 0 ? name : normalizedCode;
  return {
    ...country,
    id: normalizedId,
    code: normalizedCode,
    name: normalizedName,
    isActive: country.isActive,
    currencies: country.currencies,
  };
};

export const buildFilemakerCountryList = (
  internationalizationCountries: readonly CountryOption[]
): CountryOption[] => {
  const countriesByCode = new Map(
    staticCountryOptions.map((country: CountryOption) => [country.code, country])
  );

  internationalizationCountries.forEach((country: CountryOption): void => {
    const normalizedCountry = normalizeInternationalizationCountry(country);
    if (normalizedCountry === null) return;
    countriesByCode.set(normalizedCountry.code, normalizedCountry);
  });

  return Array.from(countriesByCode.values()).sort((left: CountryOption, right: CountryOption) =>
    left.name.localeCompare(right.name)
  );
};

export const buildFilemakerCountryLookup = (
  countries: readonly CountryOption[]
): Map<string, CountryOption> => {
  const lookup = new Map<string, CountryOption>();
  countries.forEach((country: CountryOption): void => {
    const aliases = [
      country.id,
      country.code,
      country.name,
      `country-${country.code.toLowerCase()}`,
      `country-${country.id.toLowerCase()}`,
    ];
    aliases.forEach((alias: string): void => {
      if (alias.trim().length > 0) lookup.set(alias.trim(), country);
      const normalized = normalizeLookupToken(alias);
      if (normalized.length > 0) lookup.set(normalized, country);
    });
  });
  return lookup;
};

export const buildFilemakerCountryOptions = (
  countries: readonly CountryOption[]
): Array<LabeledOptionWithDescriptionDto<string>> =>
  countries.map((country: CountryOption) => ({
    value: country.id,
    label: country.name,
    description: country.code,
  }));

const findCountryByToken = (
  countryLookup: Map<string, CountryOption>,
  value: string | null | undefined
): CountryOption | undefined => {
  const raw = value?.trim() ?? '';
  if (raw.length === 0) return undefined;
  return countryLookup.get(raw) ?? countryLookup.get(normalizeLookupToken(raw));
};

export const resolveFilemakerCountry = (
  countryId: string | null | undefined,
  countryName: string | null | undefined,
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): CountryOption | undefined =>
  findCountryByToken(countryLookup, countryId) ?? findCountryByToken(countryLookup, countryName);

export const resolveFilemakerCountryId = (
  countryId: string | null | undefined,
  countryName: string | null | undefined,
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): string => resolveFilemakerCountry(countryId, countryName, countries, countryLookup)?.id ?? '';

export const resolveFilemakerCountryName = (
  countryId: string | null | undefined,
  countryName: string | null | undefined,
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): string =>
  resolveFilemakerCountry(countryId, countryName, countries, countryLookup)?.name ??
  countryName?.trim() ??
  '';
