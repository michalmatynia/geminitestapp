import type { CountryOption } from '@/shared/types/domain/internationalization';

export const includeQuery = (values: string[], query: string): boolean => {
  if (!query) return true;
  return values.join(' ').toLowerCase().includes(query.toLowerCase());
};

export const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

export const hasAddressFields = (
  street: string,
  streetNumber: string,
  city: string,
  postalCode: string,
  countryId: string
): boolean => Boolean(street && streetNumber && city && postalCode && countryId);

export const resolveCountryId = (
  countryId: string,
  countryName: string,
  countries: CountryOption[],
  countryById: Map<string, CountryOption>
): string => {
  const normalizedId = countryId.trim();
  if (normalizedId && countryById.has(normalizedId)) return normalizedId;
  const normalizedName = countryName.trim().toLowerCase();
  if (!normalizedName) return '';
  const byName = countries.find(
    (country: CountryOption) =>
      country.name.trim().toLowerCase() === normalizedName ||
      country.code.trim().toLowerCase() === normalizedName
  );
  return byName?.id ?? '';
};

export const decodeRouteParam = (
  value: string | string[] | undefined
): string => {
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
