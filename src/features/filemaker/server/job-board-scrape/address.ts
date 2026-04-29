import 'server-only';

import { randomUUID } from 'crypto';

import type { FilemakerAddress } from '../../types';
import type { FilemakerJobBoardScrapedOffer } from '../../filemaker-job-board-scrape-contracts';

import { toIdToken } from '../../filemaker-settings.helpers';
import { normalizeLexiconKey, normalizeLexiconLabel } from './normalizers';

export const findOfferAddressPill = (
  offer: FilemakerJobBoardScrapedOffer
): FilemakerJobBoardScrapedOffer['pills'][number] | null =>
  offer.pills.find((pill) => pill.typeKey === 'address') ?? null;

export const cleanAddressCity = (value: string): string =>
  normalizeLexiconLabel(value.replace(/\([^)]*\)/g, ''));

const normalizeAddressParts = (value: string): string[] =>
  normalizeLexiconLabel(value)
    .split(',')
    .map((part) => normalizeLexiconLabel(part))
    .filter(Boolean);

const parseStreetPart = (value: string): Pick<FilemakerAddress, 'street' | 'streetNumber'> => {
  const streetMatch = value.match(/^(.+?)\s+([0-9]+[0-9A-Za-z/ -]*)$/);
  return {
    street: normalizeLexiconLabel(streetMatch?.[1] ?? value),
    streetNumber: normalizeLexiconLabel(streetMatch?.[2] ?? ''),
  };
};

const hasParsedAddressValue = (input: Pick<FilemakerAddress, 'city' | 'street'>): boolean =>
  input.street.length > 0 || input.city.length > 0;

const extractPostalCity = (value: string): { city: string; postalCode: string } => {
  const match = value.match(/\b([0-9]{2}-[0-9]{3})\s+(.+)$/);
  if (match === null) {
    return { city: cleanAddressCity(value), postalCode: '' };
  }
  return {
    city: cleanAddressCity(match[2] ?? value),
    postalCode: normalizeLexiconLabel(match[1] ?? ''),
  };
};

const isCountryPart = (value: string): boolean =>
  /^(pl|poland|polska)$/i.test(normalizeLexiconLabel(value));

const findPostalCityPart = (parts: string[]): string | null =>
  parts.find((part) => /\b[0-9]{2}-[0-9]{3}\b/.test(part)) ?? null;

const resolveCityPart = (parts: string[]): string => {
  const postalCityPart = findPostalCityPart(parts);
  if (postalCityPart !== null) return postalCityPart;
  const countryPart = parts[parts.length - 1] ?? '';
  if (isCountryPart(countryPart) && parts.length > 1) return parts[parts.length - 2] ?? countryPart;
  return countryPart;
};

export const parseScrapedAddressPill = (
  value: string
): Pick<
  FilemakerAddress,
  'city' | 'country' | 'countryId' | 'postalCode' | 'street' | 'streetNumber'
> | null => {
  const parts = normalizeAddressParts(value);
  if (parts.length === 0) return null;
  const { street, streetNumber } = parseStreetPart(parts[0] ?? '');
  const cityPart = resolveCityPart(parts);
  const { city, postalCode } = extractPostalCity(cityPart);
  if (!hasParsedAddressValue({ city, street })) return null;
  return {
    city,
    country: 'Poland',
    countryId: 'PL',
    postalCode,
    street,
    streetNumber,
  };
};

export const addressComparisonKey = (
  address: Pick<FilemakerAddress, 'city' | 'country' | 'postalCode' | 'street' | 'streetNumber'>
): string =>
  normalizeLexiconKey(
    [address.street, address.streetNumber, address.postalCode, address.city, address.country]
      .filter(Boolean)
      .join(' ')
  );

export const buildJobBoardAddressId = (
  organizationId: string,
  address: Pick<FilemakerAddress, 'city' | 'country' | 'postalCode' | 'street' | 'streetNumber'>
): string => {
  const token = toIdToken(`${organizationId}-${addressComparisonKey(address)}`);
  return `filemaker-address-job-board-${token.length > 0 ? token : randomUUID()}`;
};

export const buildJobBoardAddressLinkId = (
  organizationId: string,
  addressId: string
): string => {
  const token = toIdToken(`organization-${organizationId}-${addressId}`);
  return `filemaker-address-link-${token.length > 0 ? token : randomUUID()}`;
};
