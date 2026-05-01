import 'server-only';

import { randomUUID } from 'crypto';

import type { FilemakerAddress, FilemakerAddressOwnerKind } from '../../types';
import type { FilemakerJobBoardScrapedOffer } from '../../filemaker-job-board-scrape-contracts';

import { toIdToken } from '../../filemaker-settings.helpers';
import { normalizeLexiconKey, normalizeLexiconLabel } from './normalizers';

const PROFILE_ADDRESS_LINE_RE = /^Address:\s*(.+)$/imu;

const hasStreetAddressSignal = (value: string): boolean =>
  /\b[0-9]{2}-[0-9]{3}\b/u.test(value) ||
  /(?:^|,\s*)(?:ul\.?|ulica|al\.?|aleja|pl\.?|plac|rondo|street|road)\s+/iu.test(value) ||
  /[\p{L}. -]+\s+[0-9]+[0-9A-Za-z/ -]*(?:,|$)/u.test(value);

const findOfferProfileAddressValue = (offer: FilemakerJobBoardScrapedOffer): string | null => {
  const match = offer.companyProfile.match(PROFILE_ADDRESS_LINE_RE);
  const address = normalizeLexiconLabel(match?.[1] ?? '');
  return address.length > 0 ? address : null;
};

export const cleanAddressCity = (value: string): string =>
  normalizeLexiconLabel(value.replace(/\([^)]*\)/g, ''));

const isRemoteLocationPart = (value: string): boolean => {
  const key = normalizeLexiconKey(value);
  return (
    key.includes('praca zdalna') ||
    key.includes('rekrutacja zdalna') ||
    key.includes('remote') ||
    key.includes('cala polska')
  );
};

const normalizeAddressParts = (value: string): string[] =>
  normalizeLexiconLabel(value)
    .split(',')
    .map((part) => normalizeLexiconLabel(part))
    .filter((part) => part.length > 0 && !isRemoteLocationPart(part));

const parseStreetPart = (value: string): Pick<FilemakerAddress, 'street' | 'streetNumber'> => {
  const streetMatch = value.match(/^(.+?)\s+([0-9]+[0-9A-Za-z/ -]*)$/);
  if (streetMatch === null) return { street: '', streetNumber: '' };
  return {
    street: normalizeLexiconLabel(streetMatch[1] ?? ''),
    streetNumber: normalizeLexiconLabel(streetMatch[2] ?? ''),
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

const isSpecificAddressCandidate = (value: string): boolean => {
  const parsed = parseScrapedAddressPill(value);
  if (parsed === null) return false;
  return parsed.street.length > 0 || parsed.postalCode.length > 0;
};

const findOfferPillAddressValue = (offer: FilemakerJobBoardScrapedOffer): string | null => {
  const pillAddress = [...offer.unclassifiedPills, ...offer.pills]
    .map((pill) => normalizeLexiconLabel(pill.label))
    .find((label) => label.length > 0 && isSpecificAddressCandidate(label));
  return pillAddress ?? null;
};

export const findOfferAddressValue = (offer: FilemakerJobBoardScrapedOffer): string | null => {
  const pillAddress = findOfferPillAddressValue(offer);
  if (pillAddress !== null) return pillAddress;
  const location = normalizeLexiconLabel(offer.location);
  const profileAddress = findOfferProfileAddressValue(offer);
  if (
    profileAddress !== null &&
    (location.length === 0 || !hasStreetAddressSignal(location))
  ) {
    return profileAddress;
  }
  if (location.length > 0) return location;
  return profileAddress;
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
  ownerId: string,
  address: Pick<FilemakerAddress, 'city' | 'country' | 'postalCode' | 'street' | 'streetNumber'>
): string => {
  const token = toIdToken(`${ownerId}-${addressComparisonKey(address)}`);
  return `filemaker-address-job-board-${token.length > 0 ? token : randomUUID()}`;
};

export const buildJobBoardAddressLinkId = (
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string,
  addressId: string
): string => {
  const token = toIdToken(`${ownerKind}-${ownerId}-${addressId}`);
  return `filemaker-address-link-${token.length > 0 ? token : randomUUID()}`;
};
