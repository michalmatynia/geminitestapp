import type { CountryOption } from '@/shared/contracts/internationalization';

import type {
  FilemakerAddress,
  FilemakerDatabase,
  FilemakerEmailCampaignDelivery,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import { getFilemakerDefaultAddressForOwner } from './database-getters';
import { getFilemakerOrganizationById, getFilemakerPersonById } from './party-getters';
import {
  buildFilemakerCountryList,
  buildFilemakerCountryLookup,
  resolveFilemakerCountry,
} from './filemaker-country-options';

export type ResolvedCountry = {
  id: string;
  name: string;
  code: string;
} | null;

type CountryCandidate = {
  id: string | null | undefined;
  name: string | null | undefined;
};

export const fallbackCountries = buildFilemakerCountryList([]);
const fallbackCountryLookup = buildFilemakerCountryLookup(fallbackCountries);

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const isUsefulToken = (value: string | null | undefined): boolean =>
  normalizeToken(value).length > 0;

const collectCountryCandidates = (
  input:
    | Pick<
        FilemakerAddress,
        'countryId' | 'country' | 'countryValueId' | 'countryValueLabel' | 'legacyCountryUuid'
      >
    | Pick<FilemakerOrganization | FilemakerPerson, 'countryId' | 'country'>
    | null
    | undefined
): CountryCandidate[] => {
  if (input === null || input === undefined) return [];
  const candidates: CountryCandidate[] = [
    { id: input.countryId, name: input.country },
    { id: input.country, name: input.countryId },
  ];
  if ('countryValueId' in input) {
    candidates.push(
      { id: input.countryValueId, name: input.countryValueLabel },
      { id: input.legacyCountryUuid, name: input.countryValueLabel }
    );
  }
  return candidates.filter(
    (candidate) => isUsefulToken(candidate.id) || isUsefulToken(candidate.name)
  );
};

const toResolvedCountry = (country: CountryOption): Exclude<ResolvedCountry, null> => ({
  id: country.id,
  name: country.name,
  code: country.code,
});

const resolveKnownCountryFromCandidates = (
  candidates: CountryCandidate[],
  countries: readonly CountryOption[],
  countryLookup: Map<string, CountryOption>
): ResolvedCountry =>
  candidates
    .map((candidate) => resolveFilemakerCountry(candidate.id, candidate.name, countries, countryLookup))
    .filter((country): country is CountryOption => country !== undefined)
    .map(toResolvedCountry)[0] ?? null;

const resolveFallbackCountryFromCandidates = (candidates: CountryCandidate[]): ResolvedCountry => {
  const first = candidates[0];
  if (first === undefined) return null;
  const fallback = first.id ?? first.name ?? '';
  const normalizedFallback = fallback.trim();
  if (normalizedFallback.length === 0) return null;
  return {
    id: normalizedFallback,
    name: (first.name ?? fallback).trim(),
    code: '',
  };
};

const resolveCountryFromCandidates = (
  candidates: CountryCandidate[],
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): ResolvedCountry =>
  resolveKnownCountryFromCandidates(candidates, countries, countryLookup) ??
  resolveFallbackCountryFromCandidates(candidates);

const collectOrganizationCountryCandidates = (
  database: FilemakerDatabase,
  partyId: string
): CountryCandidate[] => {
  const organization = getFilemakerOrganizationById(database, partyId);
  const defaultAddress = getFilemakerDefaultAddressForOwner(database, 'organization', partyId);
  return collectCountryCandidates(defaultAddress).concat(collectCountryCandidates(organization));
};

const collectPersonCountryCandidates = (
  database: FilemakerDatabase,
  partyId: string
): CountryCandidate[] => {
  const person = getFilemakerPersonById(database, partyId);
  const defaultAddress = getFilemakerDefaultAddressForOwner(database, 'person', partyId);
  return collectCountryCandidates(defaultAddress).concat(collectCountryCandidates(person));
};

export const resolveFilemakerCampaignRecipientCountry = (input: {
  database: FilemakerDatabase;
  partyKind: FilemakerEmailCampaignDelivery['partyKind'];
  partyId: string;
  countries?: readonly CountryOption[];
}): ResolvedCountry => {
  const countries = input.countries ?? fallbackCountries;
  const countryLookup =
    input.countries !== undefined ? buildFilemakerCountryLookup(countries) : fallbackCountryLookup;
  const candidates =
    input.partyKind === 'organization'
      ? collectOrganizationCountryCandidates(input.database, input.partyId)
      : collectPersonCountryCandidates(input.database, input.partyId);
  return resolveCountryFromCandidates(candidates, countries, countryLookup);
};
