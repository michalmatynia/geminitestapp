import { normalizeCaseResolverComparable } from '../../party-matching';

export const toNormalizedSearchValue = (...parts: Array<string | null | undefined>): string =>
  normalizeCaseResolverComparable(
    parts
      .map((value: string | null | undefined): string => value?.trim() ?? '')
      .filter((value: string): boolean => value.length > 0)
      .join(' ')
  );

export const buildFilemakerAddressLabel = ({
  street,
  streetNumber,
  postalCode,
  city,
  country,
}: {
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
}): string => {
  const streetLabel = [street.trim(), streetNumber.trim()].filter(Boolean).join(' ').trim();
  const cityLabel = [postalCode.trim(), city.trim()].filter(Boolean).join(' ').trim();
  return [streetLabel, cityLabel, country.trim()].filter(Boolean).join(', ');
};
