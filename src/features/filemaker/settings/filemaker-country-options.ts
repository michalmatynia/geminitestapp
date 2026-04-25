import { countryCodeOptions } from '@/shared/constants/countries';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CountryOption } from '@/shared/contracts/internationalization';

const normalizeLookupToken = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const toCountryOption = (country: {
  code: string;
  id?: string;
  name: string;
}): CountryOption => ({
  id: country.id?.trim() || country.code,
  code: country.code.trim().toUpperCase(),
  name: country.name.trim(),
  isActive: true,
  currencies: [],
});

const staticCountryOptions = countryCodeOptions.map(toCountryOption);

export const buildFilemakerCountryList = (
  internationalizationCountries: readonly CountryOption[]
): CountryOption[] => {
  const countriesByCode = new Map(
    staticCountryOptions.map((country: CountryOption) => [country.code, country])
  );

  internationalizationCountries.forEach((country: CountryOption): void => {
    const code = country.code.trim().toUpperCase();
    const id = country.id.trim();
    const name = country.name.trim();
    if (code.length === 0 && id.length === 0) return;
    const normalizedCountry: CountryOption = {
      ...country,
      id: id || code,
      code: code || id.toUpperCase(),
      name: name || code || id,
      isActive: country.isActive ?? true,
      currencies: country.currencies ?? [],
    };
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

export const resolveFilemakerCountry = (
  countryId: string | null | undefined,
  countryName: string | null | undefined,
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): CountryOption | undefined => {
  const normalizedId = normalizeLookupToken(countryId);
  if (normalizedId.length > 0) {
    const byId = countryLookup.get(normalizedId);
    if (byId !== undefined) return byId;
  }

  const normalizedName = normalizeLookupToken(countryName);
  return normalizedName.length > 0 ? countryLookup.get(normalizedName) : undefined;
};

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
