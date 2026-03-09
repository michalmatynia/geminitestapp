import {
  composeCandidateStreetNumber,
  findExistingFilemakerAddressId,
  findExistingFilemakerPartyReference,
  normalizeCaseResolverComparable,
  createId,
} from '@/shared/lib/case-resolver-capture-adapter';
import {
  createFilemakerAddress,
  createFilemakerOrganization,
  createFilemakerPerson,
} from '@/shared/lib/filemaker/entity-builders';
import type { CaseResolverPartyReference } from '@/shared/contracts/case-resolver';
import type {
  FilemakerAddressDto as FilemakerAddress,
  FilemakerDatabaseDto as FilemakerDatabase,
} from '@/shared/contracts/filemaker';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';

export type UpsertFilemakerCaptureCandidateResult = {
  database: FilemakerDatabase;
  reference: CaseResolverPartyReference | null;
  addressId: string | null;
  createdParty: boolean;
  createdAddress: boolean;
};

type CandidateAddressInput = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

const toCandidateAddressInput = (
  candidate: PromptExploderCaseResolverPartyCandidate
): CandidateAddressInput => ({
  street: (candidate.street ?? '').trim(),
  streetNumber: composeCandidateStreetNumber(candidate).trim(),
  city: (candidate.city ?? '').trim(),
  postalCode: (candidate.postalCode ?? '').trim(),
  country: (candidate.country ?? '').trim(),
  countryId: '',
});

const hasAddressData = (input: CandidateAddressInput): boolean =>
  Boolean(
    input.street ||
    input.streetNumber ||
    input.city ||
    input.postalCode ||
    input.country ||
    input.countryId
  );

const firstNonEmptyLine = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .find((line: string): boolean => line.length > 0) ?? '';

const deriveDisplayTokens = (candidate: PromptExploderCaseResolverPartyCandidate): string[] =>
  ((candidate.displayName ?? '') || firstNonEmptyLine(candidate.rawText ?? ''))
    .trim()
    .split(/\s+/)
    .map((token: string): string => token.trim())
    .filter((token: string): boolean => token.length > 0);

const derivePersonName = (
  candidate: PromptExploderCaseResolverPartyCandidate
): { firstName: string; lastName: string } => {
  const tokens = deriveDisplayTokens(candidate);
  const firstName = (candidate.firstName ?? '').trim() || tokens[0] || '';
  const lastName = (candidate.lastName ?? '').trim() || tokens.slice(1).join(' ').trim();
  if (firstName || lastName) {
    return { firstName, lastName };
  }
  const display = (candidate.displayName ?? '').trim();
  if (!display) return { firstName: '', lastName: '' };
  return {
    firstName: display,
    lastName: '',
  };
};

const deriveOrganizationName = (candidate: PromptExploderCaseResolverPartyCandidate): string =>
  (candidate.organizationName ?? '').trim() ||
  (candidate.kind === 'organization' ? (candidate.displayName ?? '').trim() : '') ||
  firstNonEmptyLine(candidate.rawText ?? '') ||
  (candidate.displayName ?? '').trim();

const resolvePartyKind = (
  candidate: PromptExploderCaseResolverPartyCandidate
): 'person' | 'organization' => {
  if (candidate.kind === 'person' || candidate.kind === 'organization') {
    return candidate.kind;
  }
  const hasPersonHints = Boolean(
    (candidate.firstName ?? '').trim() || (candidate.lastName ?? '').trim()
  );
  if (hasPersonHints) return 'person';
  if ((candidate.organizationName ?? '').trim()) return 'organization';
  return deriveDisplayTokens(candidate).length >= 2 ? 'person' : 'organization';
};

const findAddressById = (
  database: FilemakerDatabase,
  addressId: string | null
): FilemakerAddress | null => {
  const normalizedId = (addressId ?? '').trim();
  if (!normalizedId) return null;
  return (
    database.addresses.find((address: FilemakerAddress): boolean => address.id === normalizedId) ??
    null
  );
};

const resolveReferenceName = (
  database: FilemakerDatabase,
  kind: 'person' | 'organization',
  id: string,
  fallback = ''
): string => {
  if (kind === 'person') {
    const person = database.persons.find((entry): boolean => entry.id === id);
    if (!person) return fallback || id;
    const resolved = `${person.firstName} ${person.lastName}`.trim();
    return resolved || person.id;
  }
  const organization = database.organizations.find((entry): boolean => entry.id === id);
  if (!organization) return fallback || id;
  return organization.name.trim() || organization.id;
};

const findStrictPersonReference = (
  database: FilemakerDatabase,
  firstName: string,
  lastName: string,
  addressId: string | null
): CaseResolverPartyReference | null => {
  const normalizedFirst = normalizeCaseResolverComparable(firstName);
  const normalizedLast = normalizeCaseResolverComparable(lastName);
  if (!normalizedFirst && !normalizedLast) return null;
  const normalizedAddressId = (addressId ?? '').trim();
  const matched = database.persons.find((person): boolean => {
    if (normalizedFirst && normalizeCaseResolverComparable(person.firstName) !== normalizedFirst) {
      return false;
    }
    if (normalizedLast && normalizeCaseResolverComparable(person.lastName) !== normalizedLast) {
      return false;
    }
    if (!normalizedAddressId) return true;
    return person.addressId.trim() === normalizedAddressId;
  });
  if (!matched) return null;
  return {
    kind: 'person',
    id: matched.id,
    name: `${matched.firstName} ${matched.lastName}`.trim() || matched.id,
  };
};

const findStrictOrganizationReference = (
  database: FilemakerDatabase,
  name: string,
  addressId: string | null
): CaseResolverPartyReference | null => {
  const normalizedName = normalizeCaseResolverComparable(name);
  if (!normalizedName) return null;
  const normalizedAddressId = (addressId ?? '').trim();
  const matched = database.organizations.find((organization): boolean => {
    if (normalizeCaseResolverComparable(organization.name) !== normalizedName) {
      return false;
    }
    if (!normalizedAddressId) return true;
    return organization.addressId.trim() === normalizedAddressId;
  });
  if (!matched) return null;
  return {
    kind: 'organization',
    id: matched.id,
    name: matched.name.trim() || matched.id,
  };
};

const ensureAddressRecord = (
  database: FilemakerDatabase,
  candidateAddress: CandidateAddressInput
): { database: FilemakerDatabase; addressId: string | null; createdAddress: boolean } => {
  if (!hasAddressData(candidateAddress)) {
    return { database, addressId: null, createdAddress: false };
  }
  const existingAddressId = findExistingFilemakerAddressId(database, candidateAddress);
  if (existingAddressId) {
    return { database, addressId: existingAddressId, createdAddress: false };
  }

  const now = new Date().toISOString();
  const addressId = createId('filemaker-address');
  const createdAddress = createFilemakerAddress({
    id: addressId,
    street: candidateAddress.street,
    streetNumber: candidateAddress.streetNumber,
    city: candidateAddress.city,
    postalCode: candidateAddress.postalCode,
    country: candidateAddress.country,
    countryId: candidateAddress.countryId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    database: {
      ...database,
      addresses: [...database.addresses, createdAddress],
    },
    addressId,
    createdAddress: true,
  };
};

export const upsertFilemakerCaptureCandidate = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate
): UpsertFilemakerCaptureCandidateResult => {
  const matchedReference = findExistingFilemakerPartyReference(database, candidate);
  if (matchedReference) {
    const resolvedKind = matchedReference.kind;
    const resolvedId = String(matchedReference.id);
    return {
      database,
      reference: {
        kind: resolvedKind,
        id: resolvedId,
        name: resolveReferenceName(database, resolvedKind, resolvedId),
      },
      addressId: null,
      createdParty: false,
      createdAddress: false,
    };
  }

  const kind = resolvePartyKind(candidate);
  const personName = kind === 'person' ? derivePersonName(candidate) : null;
  const organizationName = kind === 'organization' ? deriveOrganizationName(candidate) : '';
  if (kind === 'person' && personName && !personName.firstName && !personName.lastName) {
    return {
      database,
      reference: null,
      addressId: null,
      createdParty: false,
      createdAddress: false,
    };
  }
  if (kind === 'organization' && !organizationName) {
    return {
      database,
      reference: null,
      addressId: null,
      createdParty: false,
      createdAddress: false,
    };
  }

  const candidateAddress = toCandidateAddressInput(candidate);
  const addressResult = ensureAddressRecord(database, candidateAddress);
  let nextDatabase = addressResult.database;
  const linkedAddress = findAddressById(nextDatabase, addressResult.addressId);
  const addressId = linkedAddress?.id ?? addressResult.addressId ?? null;

  const now = new Date().toISOString();
  if (kind === 'person') {
    const resolvedPersonName = personName ?? derivePersonName(candidate);
    const strictMatch = findStrictPersonReference(
      nextDatabase,
      resolvedPersonName.firstName,
      resolvedPersonName.lastName,
      addressId
    );
    if (strictMatch) {
      return {
        database: nextDatabase,
        reference: strictMatch,
        addressId,
        createdParty: false,
        createdAddress: addressResult.createdAddress,
      };
    }

    const personId = createId('filemaker-person');
    const createdPerson = createFilemakerPerson({
      id: personId,
      firstName: resolvedPersonName.firstName,
      lastName: resolvedPersonName.lastName,
      addressId: addressId ?? '',
      street: linkedAddress?.street ?? candidateAddress.street,
      streetNumber: linkedAddress?.streetNumber ?? candidateAddress.streetNumber,
      city: linkedAddress?.city ?? candidateAddress.city,
      postalCode: linkedAddress?.postalCode ?? candidateAddress.postalCode,
      country: linkedAddress?.country ?? candidateAddress.country,
      countryId: linkedAddress?.countryId ?? candidateAddress.countryId,
      createdAt: now,
      updatedAt: now,
    });
    nextDatabase = {
      ...nextDatabase,
      persons: [...nextDatabase.persons, createdPerson],
    };
    return {
      database: nextDatabase,
      reference: {
        kind: 'person',
        id: personId,
        name: `${createdPerson.firstName} ${createdPerson.lastName}`.trim() || personId,
      },
      addressId,
      createdParty: true,
      createdAddress: addressResult.createdAddress,
    };
  }

  const strictMatch = findStrictOrganizationReference(nextDatabase, organizationName, addressId);
  if (strictMatch) {
    return {
      database: nextDatabase,
      reference: strictMatch,
      addressId,
      createdParty: false,
      createdAddress: addressResult.createdAddress,
    };
  }
  const organizationId = createId('filemaker-organization');
  const createdOrganization = createFilemakerOrganization({
    id: organizationId,
    name: organizationName,
    addressId: addressId ?? '',
    street: linkedAddress?.street ?? candidateAddress.street,
    streetNumber: linkedAddress?.streetNumber ?? candidateAddress.streetNumber,
    city: linkedAddress?.city ?? candidateAddress.city,
    postalCode: linkedAddress?.postalCode ?? candidateAddress.postalCode,
    country: linkedAddress?.country ?? candidateAddress.country,
    countryId: linkedAddress?.countryId ?? candidateAddress.countryId,
    createdAt: now,
    updatedAt: now,
  });
  nextDatabase = {
    ...nextDatabase,
    organizations: [...nextDatabase.organizations, createdOrganization],
  };

  return {
    database: nextDatabase,
    reference: {
      kind: 'organization',
      id: organizationId,
      name: createdOrganization.name.trim() || organizationId,
    },
    addressId,
    createdParty: true,
    createdAddress: addressResult.createdAddress,
  };
};
