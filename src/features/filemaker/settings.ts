import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  FilemakerAddress,
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailLink,
  FilemakerEmailStatus,
  FilemakerEntityKind,
  FilemakerOrganization,
  FilemakerPartyKind,
  FilemakerPartyOption,
  FilemakerPartyReference,
  FilemakerPerson,
} from './types';

export const FILEMAKER_DATABASE_KEY = 'filemaker_database_v1';
export const FILEMAKER_REFERENCE_NONE = 'none';
export const FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY = 'prompt_engine_settings';
export const FILEMAKER_EMAIL_PARSER_RULE_PREFIX = 'segment.filemaker.email_parser.';

const FILEMAKER_EMAIL_STATUSES: FilemakerEmailStatus[] = [
  'active',
  'inactive',
  'bounced',
  'unverified',
];

const FILEMAKER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FilemakerEmailParserRule = {
  id: string;
  pattern: string;
  flags?: string | null;
  sequence?: number | null;
};

export type FilemakerEmailExtractionResult = {
  emails: string[];
  totalMatches: number;
  invalidMatches: number;
  usedDefaultRules: boolean;
};

export type UpsertFilemakerPartyEmailsResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdEmailCount: number;
  linkedEmailCount: number;
  existingEmailCount: number;
  invalidEmailCount: number;
  appliedEmails: string[];
};

const DEFAULT_FILEMAKER_EMAIL_PARSER_RULES: FilemakerEmailParserRule[] = [
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}mailto`,
    pattern: 'mailto:\\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})',
    flags: 'gi',
    sequence: 10,
  },
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}angle`,
    pattern: '<\\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})\\s*>',
    flags: 'gi',
    sequence: 20,
  },
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}quoted`,
    pattern: '["\']([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})["\']',
    flags: 'gi',
    sequence: 30,
  },
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}plain`,
    pattern:
      '(?:^|[^A-Z0-9._%+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})(?=$|[^A-Z0-9._%+-])',
    flags: 'gi',
    sequence: 40,
  },
];

const normalizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const toIdToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');

const ensureUniqueId = (
  candidate: string,
  usedIds: Set<string>,
  fallbackPrefix: string
): string => {
  const normalizedCandidate = normalizeString(candidate);
  const base = normalizedCandidate || fallbackPrefix;
  if (!usedIds.has(base)) return base;
  let index = 2;
  while (usedIds.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
};

const normalizePhoneNumbers = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const unique = new Set<string>();
    value.forEach((entry: unknown) => {
      const normalized = normalizeString(entry);
      if (!normalized) return;
      unique.add(normalized);
    });
    return Array.from(unique);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry: string) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeEmailAddress = (value: unknown): string =>
  normalizeString(value).toLowerCase();

const isValidEmailAddress = (value: string): boolean =>
  Boolean(value) && FILEMAKER_EMAIL_RE.test(value);

const normalizeEmailStatus = (
  value: unknown,
  fallback: FilemakerEmailStatus = 'unverified'
): FilemakerEmailStatus => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return fallback;
  return FILEMAKER_EMAIL_STATUSES.find(
    (status: FilemakerEmailStatus): boolean => status === normalized
  ) ?? fallback;
};

type FilemakerEmailParserRuntimeRule = {
  id: string;
  regex: RegExp;
  sequence: number;
};

const normalizeEmailParserFlags = (value: unknown): string => {
  const raw = normalizeString(value);
  const unique = new Set<string>();
  raw.split('').forEach((flag: string): void => {
    if (
      flag === 'g' ||
      flag === 'i' ||
      flag === 'm' ||
      flag === 's' ||
      flag === 'u' ||
      flag === 'd'
    ) {
      unique.add(flag);
    }
  });
  unique.add('g');
  return Array.from(unique).join('');
};

const sanitizeEmailCandidate = (value: string): string => {
  let current = value.trim().replace(/^mailto:\s*/i, '');
  if (!current) return '';

  const leadingWrapperRe = /^[<([{'"`]+/;
  const trailingWrapperRe = /[>\])}"'`.,;:!?]+$/;
  let previous = '';
  while (previous !== current) {
    previous = current;
    current = current
      .replace(leadingWrapperRe, '')
      .replace(trailingWrapperRe, '')
      .trim();
  }
  return current;
};

const toParserRuleSequence = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const sortFilemakerEmailParserRules = (
  rules: FilemakerEmailParserRule[]
): FilemakerEmailParserRule[] =>
  [...rules].sort((left: FilemakerEmailParserRule, right: FilemakerEmailParserRule) => {
    const leftSequence = toParserRuleSequence(left.sequence);
    const rightSequence = toParserRuleSequence(right.sequence);
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    return left.id.localeCompare(right.id);
  });

const compileFilemakerEmailParserRules = (
  rules: FilemakerEmailParserRule[]
): FilemakerEmailParserRuntimeRule[] =>
  sortFilemakerEmailParserRules(rules)
    .map((rule: FilemakerEmailParserRule): FilemakerEmailParserRuntimeRule | null => {
      const pattern = normalizeString(rule.pattern);
      if (!pattern) return null;
      try {
        return {
          id: normalizeString(rule.id) || FILEMAKER_EMAIL_PARSER_RULE_PREFIX,
          regex: new RegExp(pattern, normalizeEmailParserFlags(rule.flags)),
          sequence: toParserRuleSequence(rule.sequence),
        };
      } catch {
        return null;
      }
    })
    .filter(
      (entry: FilemakerEmailParserRuntimeRule | null): entry is FilemakerEmailParserRuntimeRule =>
        Boolean(entry)
    );

export const parseFilemakerEmailParserRulesFromPromptSettings = (
  rawPromptSettings: string | null | undefined
): FilemakerEmailParserRule[] => {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(
    rawPromptSettings,
    null
  );
  if (!parsed || typeof parsed !== 'object') return [];

  const promptValidation =
    parsed['promptValidation'] &&
    typeof parsed['promptValidation'] === 'object' &&
    !Array.isArray(parsed['promptValidation'])
      ? (parsed['promptValidation'] as Record<string, unknown>)
      : null;
  if (!promptValidation) return [];

  const rawRules = Array.isArray(promptValidation['rules'])
    ? (promptValidation['rules'] as unknown[])
    : [];
  const rules = rawRules
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .map((entry: Record<string, unknown>): FilemakerEmailParserRule | null => {
      const id = normalizeString(entry['id']);
      if (!id.startsWith(FILEMAKER_EMAIL_PARSER_RULE_PREFIX)) return null;
      if (normalizeString(entry['kind']).toLowerCase() !== 'regex') return null;
      if (entry['enabled'] === false) return null;

      const pattern = normalizeString(entry['pattern']);
      if (!pattern) return null;

      return {
        id,
        pattern,
        flags: normalizeString(entry['flags']),
        sequence: typeof entry['sequence'] === 'number' ? entry['sequence'] : 0,
      };
    })
    .filter(
      (entry: FilemakerEmailParserRule | null): entry is FilemakerEmailParserRule =>
        Boolean(entry)
    );

  return sortFilemakerEmailParserRules(rules);
};

export const extractFilemakerEmailsFromText = (
  rawText: string,
  options?: {
    parserRules?: FilemakerEmailParserRule[] | null | undefined;
  }
): FilemakerEmailExtractionResult => {
  const source = normalizeString(rawText);
  const customRules = sortFilemakerEmailParserRules(options?.parserRules ?? []);
  const fallbackRules =
    customRules.length > 0 ? customRules : DEFAULT_FILEMAKER_EMAIL_PARSER_RULES;
  const runtimeRules = compileFilemakerEmailParserRules(fallbackRules);
  if (!source || runtimeRules.length === 0) {
    return {
      emails: [],
      totalMatches: 0,
      invalidMatches: 0,
      usedDefaultRules: customRules.length === 0,
    };
  }

  const extracted: string[] = [];
  const uniqueEmails = new Set<string>();
  let totalMatches = 0;
  let invalidMatches = 0;

  runtimeRules.forEach((rule: FilemakerEmailParserRuntimeRule): void => {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null = regex.exec(source);
    while (match) {
      totalMatches += 1;

      const captured =
        match
          .slice(1)
          .find((entry: string | undefined): entry is string =>
            typeof entry === 'string' && entry.trim().length > 0
          ) ?? match[0] ?? '';

      const normalizedEmail = normalizeEmailAddress(
        sanitizeEmailCandidate(captured)
      );

      if (!isValidEmailAddress(normalizedEmail)) {
        invalidMatches += 1;
      } else if (!uniqueEmails.has(normalizedEmail)) {
        uniqueEmails.add(normalizedEmail);
        extracted.push(normalizedEmail);
      }

      if ((match[0] ?? '').length === 0) {
        regex.lastIndex += 1;
      }
      match = regex.exec(source);
    }
  });

  return {
    emails: extracted,
    totalMatches,
    invalidMatches,
    usedDefaultRules: customRules.length === 0,
  };
};

type FilemakerAddressFields = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

const normalizeAddressFields = (value: {
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
}): FilemakerAddressFields => {
  return {
    street: normalizeString(value.street),
    streetNumber: normalizeString(value.streetNumber),
    city: normalizeString(value.city),
    postalCode: normalizeString(value.postalCode),
    country: normalizeString(value.country),
    countryId: normalizeString(value.countryId),
  };
};

export const formatFilemakerAddress = (
  value: Pick<
    FilemakerAddressFields,
    'street' | 'streetNumber' | 'city' | 'postalCode' | 'country'
  >
): string =>
  [
    [value.street, value.streetNumber]
      .map((entry: string) => normalizeString(entry))
      .filter(Boolean)
      .join(' '),
    value.city,
    value.postalCode,
    value.country,
  ]
    .map((entry: string) => normalizeString(entry))
    .filter(Boolean)
    .join(', ');

const sanitizeReference = (value: unknown): FilemakerPartyReference | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const kind = normalizeString(record['kind']) as FilemakerEntityKind;
  if (kind !== 'person' && kind !== 'organization') return null;
  const id = normalizeString(record['id']);
  if (!id) return null;
  return { kind, id };
};

const hasAnyAddressData = (value: FilemakerAddressFields): boolean =>
  Boolean(
    value.street ||
      value.streetNumber ||
      value.city ||
      value.postalCode ||
      value.country ||
      value.countryId
  );

export const createFilemakerAddress = (input: {
  id: string;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerAddress => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerPerson = (input: {
  id: string;
  firstName: unknown;
  lastName: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  nip?: unknown;
  regon?: unknown;
  phoneNumbers?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPerson => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    firstName: normalizeString(input.firstName),
    lastName: normalizeString(input.lastName),
    addressId: normalizeString(input.addressId),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
    nip: normalizeString(input.nip),
    regon: normalizeString(input.regon),
    phoneNumbers: normalizePhoneNumbers(input.phoneNumbers),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerOrganization = (input: {
  id: string;
  name: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerOrganization => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    name: normalizeString(input.name),
    addressId: normalizeString(input.addressId),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEmail = (input: {
  id: string;
  email: unknown;
  status?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEmail => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    email: normalizeEmailAddress(input.email),
    status: normalizeEmailStatus(input.status),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEmailLink = (input: {
  id: string;
  emailId: unknown;
  partyKind: unknown;
  partyId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEmailLink => {
  const now = new Date().toISOString();
  const rawPartyKind = normalizeString(input.partyKind).toLowerCase();
  const partyKind: FilemakerPartyKind =
    rawPartyKind === 'organization' ? 'organization' : 'person';

  return {
    id: normalizeString(input.id),
    emailId: normalizeString(input.emailId),
    partyKind,
    partyId: normalizeString(input.partyId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [],
  organizations: [],
  addresses: [],
  emails: [],
  emailLinks: [],
});

const defaultAddressIdForEntity = (
  kind: 'person' | 'organization',
  entityId: string
): string => `${kind}-address-${entityId}`;

const defaultEmailIdForValue = (email: string): string => {
  const token = toIdToken(email);
  return `filemaker-email-${token || 'entry'}`;
};

const defaultEmailLinkIdForValues = (
  emailId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const joined = `${emailId}-${partyKind}-${partyId}`;
  return `filemaker-email-link-${toIdToken(joined) || 'entry'}`;
};

const attachAddressToPerson = (
  person: FilemakerPerson,
  addressesById: Map<string, FilemakerAddress>
): FilemakerPerson => {
  const addressId =
    normalizeString(person.addressId) ||
    defaultAddressIdForEntity('person', person.id);
  const existing = addressesById.get(addressId);
  const fromPerson = createFilemakerAddress({
    id: addressId,
    street: person.street,
    streetNumber: person.streetNumber,
    city: person.city,
    postalCode: person.postalCode,
    country: person.country,
    countryId: person.countryId,
    createdAt: existing?.createdAt ?? person.createdAt,
    updatedAt: person.updatedAt,
  });
  if (hasAnyAddressData(fromPerson)) {
    addressesById.set(addressId, fromPerson);
  }
  const resolvedAddress = addressesById.get(addressId);
  if (!resolvedAddress) {
    return {
      ...person,
      addressId,
    };
  }
  return {
    ...person,
    addressId,
    street: resolvedAddress.street,
    streetNumber: resolvedAddress.streetNumber,
    city: resolvedAddress.city,
    postalCode: resolvedAddress.postalCode,
    country: resolvedAddress.country,
    countryId: resolvedAddress.countryId,
  };
};

const attachAddressToOrganization = (
  organization: FilemakerOrganization,
  addressesById: Map<string, FilemakerAddress>
): FilemakerOrganization => {
  const addressId =
    normalizeString(organization.addressId) ||
    defaultAddressIdForEntity('organization', organization.id);
  const existing = addressesById.get(addressId);
  const fromOrganization = createFilemakerAddress({
    id: addressId,
    street: organization.street,
    streetNumber: organization.streetNumber,
    city: organization.city,
    postalCode: organization.postalCode,
    country: organization.country,
    countryId: organization.countryId,
    createdAt: existing?.createdAt ?? organization.createdAt,
    updatedAt: organization.updatedAt,
  });
  if (hasAnyAddressData(fromOrganization)) {
    addressesById.set(addressId, fromOrganization);
  }
  const resolvedAddress = addressesById.get(addressId);
  if (!resolvedAddress) {
    return {
      ...organization,
      addressId,
    };
  }
  return {
    ...organization,
    addressId,
    street: resolvedAddress.street,
    streetNumber: resolvedAddress.streetNumber,
    city: resolvedAddress.city,
    postalCode: resolvedAddress.postalCode,
    country: resolvedAddress.country,
    countryId: resolvedAddress.countryId,
  };
};

const isPartyPresent = (
  personIds: Set<string>,
  organizationIds: Set<string>,
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean => {
  if (partyKind === 'person') {
    return personIds.has(partyId);
  }
  return organizationIds.has(partyId);
};

export const normalizeFilemakerDatabase = (
  value: FilemakerDatabase | null | undefined
): FilemakerDatabase => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerDatabase();
  }

  const valueRecord = value as Record<string, unknown>;

  const rawAddresses: unknown[] = Array.isArray(valueRecord['addresses'])
    ? (valueRecord['addresses'] as unknown[])
    : [];
  const addressesById = new Map<string, FilemakerAddress>();
  rawAddresses
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .forEach((entry: Record<string, unknown>) => {
      const id = normalizeString(entry['id']);
      if (!id || addressesById.has(id)) return;
      addressesById.set(
        id,
        createFilemakerAddress({
          id,
          street: normalizeString(entry['street']),
          streetNumber: normalizeString(entry['streetNumber']),
          city: normalizeString(entry['city']),
          postalCode: normalizeString(entry['postalCode']),
          country: normalizeString(entry['country']),
          countryId: normalizeString(entry['countryId']),
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

  const rawPersons: unknown[] = Array.isArray(valueRecord['persons'])
    ? (valueRecord['persons'] as unknown[])
    : [];
  const personIds = new Set<string>();
  const persons: FilemakerPerson[] = rawPersons
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .map((entry: Record<string, unknown>): FilemakerPerson | null => {
      const id = normalizeString(entry['id']);
      if (!id || personIds.has(id)) return null;
      personIds.add(id);
      return createFilemakerPerson({
        id,
        firstName: normalizeString(entry['firstName']),
        lastName: normalizeString(entry['lastName']),
        addressId: normalizeString(entry['addressId']),
        street: normalizeString(entry['street']),
        streetNumber: normalizeString(entry['streetNumber']),
        city: normalizeString(entry['city']),
        postalCode: normalizeString(entry['postalCode']),
        country: normalizeString(entry['country']),
        countryId: normalizeString(entry['countryId']),
        nip: normalizeString(entry['nip']),
        regon: normalizeString(entry['regon']),
        phoneNumbers: entry['phoneNumbers'],
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter(
      (entry: FilemakerPerson | null): entry is FilemakerPerson => Boolean(entry)
    )
    .map((entry: FilemakerPerson) => attachAddressToPerson(entry, addressesById));

  const rawOrganizations: unknown[] = Array.isArray(valueRecord['organizations'])
    ? (valueRecord['organizations'] as unknown[])
    : [];
  const organizationIds = new Set<string>();
  const organizations: FilemakerOrganization[] = rawOrganizations
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .map((entry: Record<string, unknown>): FilemakerOrganization | null => {
      const id = normalizeString(entry['id']);
      if (!id || organizationIds.has(id)) return null;
      organizationIds.add(id);
      return createFilemakerOrganization({
        id,
        name: normalizeString(entry['name']),
        addressId: normalizeString(entry['addressId']),
        street: normalizeString(entry['street']),
        streetNumber: normalizeString(entry['streetNumber']),
        city: normalizeString(entry['city']),
        postalCode: normalizeString(entry['postalCode']),
        country: normalizeString(entry['country']),
        countryId: normalizeString(entry['countryId']),
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter(
      (entry: FilemakerOrganization | null): entry is FilemakerOrganization =>
        Boolean(entry)
    )
    .map((entry: FilemakerOrganization) =>
      attachAddressToOrganization(entry, addressesById)
    );

  const rawEmails: unknown[] = Array.isArray(valueRecord['emails'])
    ? (valueRecord['emails'] as unknown[])
    : [];
  const emailIds = new Set<string>();
  const emailValues = new Set<string>();
  const emails: FilemakerEmail[] = [];

  rawEmails
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .forEach((entry: Record<string, unknown>) => {
      const normalizedEmail = normalizeEmailAddress(entry['email']);
      if (!isValidEmailAddress(normalizedEmail)) return;
      if (emailValues.has(normalizedEmail)) return;

      const id = ensureUniqueId(
        normalizeString(entry['id']) || defaultEmailIdForValue(normalizedEmail),
        emailIds,
        defaultEmailIdForValue(normalizedEmail)
      );

      emailIds.add(id);
      emailValues.add(normalizedEmail);
      emails.push(
        createFilemakerEmail({
          id,
          email: normalizedEmail,
          status: normalizeEmailStatus(entry['status']),
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

  const rawEmailLinks: unknown[] = Array.isArray(valueRecord['emailLinks'])
    ? (valueRecord['emailLinks'] as unknown[])
    : [];
  const emailLinkIds = new Set<string>();
  const relationKeys = new Set<string>();
  const emailLinks: FilemakerEmailLink[] = [];

  rawEmailLinks
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .forEach((entry: Record<string, unknown>) => {
      const emailId = normalizeString(entry['emailId']);
      if (!emailId || !emailIds.has(emailId)) return;

      const partyKindRaw = normalizeString(entry['partyKind']).toLowerCase();
      if (partyKindRaw !== 'person' && partyKindRaw !== 'organization') return;
      const partyKind = partyKindRaw;

      const partyId = normalizeString(entry['partyId']);
      if (!partyId || !isPartyPresent(personIds, organizationIds, partyKind, partyId)) {
        return;
      }

      const relationKey = `${emailId}:${partyKind}:${partyId}`;
      if (relationKeys.has(relationKey)) return;

      const id = ensureUniqueId(
        normalizeString(entry['id']) ||
          defaultEmailLinkIdForValues(emailId, partyKind, partyId),
        emailLinkIds,
        defaultEmailLinkIdForValues(emailId, partyKind, partyId)
      );

      relationKeys.add(relationKey);
      emailLinkIds.add(id);
      emailLinks.push(
        createFilemakerEmailLink({
          id,
          emailId,
          partyKind,
          partyId,
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

  return {
    version: 2,
    persons,
    organizations,
    addresses: Array.from(addressesById.values()),
    emails,
    emailLinks,
  };
};

export const parseFilemakerDatabase = (
  raw: string | null | undefined
): FilemakerDatabase => {
  const parsed = parseJsonSetting<FilemakerDatabase | null>(raw, null);
  return normalizeFilemakerDatabase(parsed);
};

export const getFilemakerAddressById = (
  database: FilemakerDatabase,
  addressId: string | null | undefined
): FilemakerAddress | null => {
  const normalizedAddressId = normalizeString(addressId);
  if (!normalizedAddressId) return null;
  return (
    database.addresses.find(
      (address: FilemakerAddress) => address.id === normalizedAddressId
    ) ?? null
  );
};

export const getFilemakerEmailById = (
  database: FilemakerDatabase,
  emailId: string | null | undefined
): FilemakerEmail | null => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) return null;
  return (
    database.emails.find((email: FilemakerEmail) => email.id === normalizedEmailId) ??
    null
  );
};

export const getFilemakerEmailLinksForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerEmailLink[] => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return [];
  return database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      link.partyKind === partyKind && link.partyId === normalizedPartyId
  );
};

export const getFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerEmail[] => {
  const emailIds = new Set(
    getFilemakerEmailLinksForParty(database, partyKind, partyId).map(
      (link: FilemakerEmailLink): string => link.emailId
    )
  );
  if (emailIds.size === 0) return [];
  return database.emails.filter((email: FilemakerEmail): boolean => emailIds.has(email.id));
};

export const getFilemakerPartiesForEmail = (
  database: FilemakerDatabase,
  emailId: string
): { persons: FilemakerPerson[]; organizations: FilemakerOrganization[] } => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) {
    return { persons: [], organizations: [] };
  }

  const personIds = new Set<string>();
  const organizationIds = new Set<string>();
  database.emailLinks.forEach((link: FilemakerEmailLink): void => {
    if (link.emailId !== normalizedEmailId) return;
    if (link.partyKind === 'person') {
      personIds.add(link.partyId);
      return;
    }
    organizationIds.add(link.partyId);
  });

  return {
    persons: database.persons.filter((person: FilemakerPerson): boolean =>
      personIds.has(person.id)
    ),
    organizations: database.organizations.filter(
      (organization: FilemakerOrganization): boolean =>
        organizationIds.has(organization.id)
    ),
  };
};

export const linkFilemakerEmailToParty = (
  database: FilemakerDatabase,
  input: {
    emailId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const emailId = normalizeString(input.emailId);
  const partyId = normalizeString(input.partyId);
  if (!emailId || !partyId) {
    return { database, created: false };
  }

  const hasEmail = database.emails.some(
    (email: FilemakerEmail): boolean => email.id === emailId
  );
  if (!hasEmail) return { database, created: false };

  const hasParty =
    input.partyKind === 'person'
      ? database.persons.some(
        (person: FilemakerPerson): boolean => person.id === partyId
      )
      : database.organizations.some(
        (organization: FilemakerOrganization): boolean =>
          organization.id === partyId
      );
  if (!hasParty) return { database, created: false };

  const alreadyLinked = database.emailLinks.some(
    (link: FilemakerEmailLink): boolean =>
      link.emailId === emailId &&
      link.partyKind === input.partyKind &&
      link.partyId === partyId
  );
  if (alreadyLinked) {
    return { database, created: false };
  }

  const usedIds = new Set<string>(
    database.emailLinks.map((link: FilemakerEmailLink): string => link.id)
  );
  const id = ensureUniqueId(
    defaultEmailLinkIdForValues(emailId, input.partyKind, partyId),
    usedIds,
    defaultEmailLinkIdForValues(emailId, input.partyKind, partyId)
  );

  const nextDatabase = normalizeFilemakerDatabase({
    ...database,
    emailLinks: [
      ...database.emailLinks,
      createFilemakerEmailLink({
        id,
        emailId,
        partyKind: input.partyKind,
        partyId,
      }),
    ],
  });

  return {
    database: nextDatabase,
    created: true,
  };
};

const normalizeUniqueEmailValues = (
  values: string[]
): { emails: string[]; invalidEmailCount: number } => {
  const unique = new Set<string>();
  const normalized: string[] = [];
  let invalidEmailCount = 0;

  values.forEach((value: string): void => {
    const normalizedEmail = normalizeEmailAddress(
      sanitizeEmailCandidate(value)
    );
    if (!isValidEmailAddress(normalizedEmail)) {
      invalidEmailCount += 1;
      return;
    }
    if (unique.has(normalizedEmail)) return;
    unique.add(normalizedEmail);
    normalized.push(normalizedEmail);
  });

  return { emails: normalized, invalidEmailCount };
};

export const upsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: FilemakerPartyKind;
    partyId: string;
    emails: string[];
    status?: FilemakerEmailStatus | null | undefined;
  }
): UpsertFilemakerPartyEmailsResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const normalizedPartyId = normalizeString(input.partyId);
  if (!normalizedPartyId) {
    return {
      database: normalizedDatabase,
      partyFound: false,
      createdEmailCount: 0,
      linkedEmailCount: 0,
      existingEmailCount: 0,
      invalidEmailCount: input.emails.length,
      appliedEmails: [],
    };
  }

  const partyFound =
    input.partyKind === 'person'
      ? normalizedDatabase.persons.some(
        (person: FilemakerPerson): boolean => person.id === normalizedPartyId
      )
      : normalizedDatabase.organizations.some(
        (organization: FilemakerOrganization): boolean =>
          organization.id === normalizedPartyId
      );
  if (!partyFound) {
    return {
      database: normalizedDatabase,
      partyFound: false,
      createdEmailCount: 0,
      linkedEmailCount: 0,
      existingEmailCount: 0,
      invalidEmailCount: input.emails.length,
      appliedEmails: [],
    };
  }

  const { emails, invalidEmailCount } = normalizeUniqueEmailValues(input.emails);
  if (emails.length === 0) {
    return {
      database: normalizedDatabase,
      partyFound: true,
      createdEmailCount: 0,
      linkedEmailCount: 0,
      existingEmailCount: 0,
      invalidEmailCount,
      appliedEmails: [],
    };
  }

  const emailIdByValue = new Map<string, string>();
  normalizedDatabase.emails.forEach((email: FilemakerEmail): void => {
    emailIdByValue.set(normalizeEmailAddress(email.email), email.id);
  });
  const usedEmailIds = new Set<string>(
    normalizedDatabase.emails.map((email: FilemakerEmail): string => email.id)
  );
  const nextEmails = [...normalizedDatabase.emails];
  const normalizedStatus = normalizeEmailStatus(input.status, 'unverified');
  let createdEmailCount = 0;
  let existingEmailCount = 0;

  emails.forEach((emailValue: string): void => {
    const existingId = emailIdByValue.get(emailValue);
    if (existingId) {
      existingEmailCount += 1;
      return;
    }

    const baseId = defaultEmailIdForValue(emailValue);
    const id = ensureUniqueId(baseId, usedEmailIds, baseId);
    usedEmailIds.add(id);
    emailIdByValue.set(emailValue, id);
    nextEmails.push(
      createFilemakerEmail({
        id,
        email: emailValue,
        status: normalizedStatus,
      })
    );
    createdEmailCount += 1;
  });

  let nextDatabase = normalizedDatabase;
  if (createdEmailCount > 0) {
    nextDatabase = normalizeFilemakerDatabase({
      ...normalizedDatabase,
      emails: nextEmails,
    });
  }
  let linkedEmailCount = 0;

  emails.forEach((emailValue: string): void => {
    const emailId = emailIdByValue.get(emailValue);
    if (!emailId) return;
    const result = linkFilemakerEmailToParty(nextDatabase, {
      emailId,
      partyKind: input.partyKind,
      partyId: normalizedPartyId,
    });
    nextDatabase = result.database;
    if (result.created) {
      linkedEmailCount += 1;
    }
  });

  return {
    database: nextDatabase,
    partyFound: true,
    createdEmailCount,
    linkedEmailCount,
    existingEmailCount,
    invalidEmailCount,
    appliedEmails: emails,
  };
};

export const parseAndUpsertFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  input: {
    partyKind: FilemakerPartyKind;
    partyId: string;
    text: string;
    parserRules?: FilemakerEmailParserRule[] | null | undefined;
    status?: FilemakerEmailStatus | null | undefined;
  }
): UpsertFilemakerPartyEmailsResult & FilemakerEmailExtractionResult => {
  const extraction = extractFilemakerEmailsFromText(input.text, {
    parserRules: input.parserRules,
  });
  const upsert = upsertFilemakerEmailsForParty(database, {
    partyKind: input.partyKind,
    partyId: input.partyId,
    emails: extraction.emails,
    status: input.status,
  });
  return {
    ...extraction,
    ...upsert,
  };
};

export const unlinkFilemakerEmailFromParty = (
  database: FilemakerDatabase,
  input: {
    emailId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): FilemakerDatabase => {
  const emailId = normalizeString(input.emailId);
  const partyId = normalizeString(input.partyId);

  if (!emailId || !partyId) return database;

  const nextEmailLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      !(
        link.emailId === emailId &&
        link.partyKind === input.partyKind &&
        link.partyId === partyId
      )
  );

  if (nextEmailLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextEmailLinks,
  });
};

export const removeFilemakerEmail = (
  database: FilemakerDatabase,
  emailId: string
): FilemakerDatabase => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) return database;

  const nextEmails = database.emails.filter(
    (email: FilemakerEmail): boolean => email.id !== normalizedEmailId
  );
  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean => link.emailId !== normalizedEmailId
  );

  if (
    nextEmails.length === database.emails.length &&
    nextLinks.length === database.emailLinks.length
  ) {
    return database;
  }

  return normalizeFilemakerDatabase({
    ...database,
    emails: nextEmails,
    emailLinks: nextLinks,
  });
};

export const removeFilemakerPartyEmailLinks = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerDatabase => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return database;

  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      !(link.partyKind === partyKind && link.partyId === normalizedPartyId)
  );
  if (nextLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextLinks,
  });
};

export const encodeFilemakerPartyReference = (
  value: FilemakerPartyReference | null | undefined
): string => {
  const sanitized = sanitizeReference(value);
  if (!sanitized) return FILEMAKER_REFERENCE_NONE;
  return `${sanitized.kind}:${sanitized.id}`;
};

export const decodeFilemakerPartyReference = (
  value: string,
  database?: FilemakerDatabase | null
): FilemakerPartyReference | null => {
  const normalized = normalizeString(value);
  if (!normalized || normalized === FILEMAKER_REFERENCE_NONE) return null;
  const [kindRaw, idRaw] = normalized.split(':', 2);
  const kind = normalizeString(kindRaw) as FilemakerEntityKind;
  const id = normalizeString(idRaw);
  if (!id) return null;
  if (kind !== 'person' && kind !== 'organization') return null;
  
  let name = '';
  if (database) {
    if (kind === 'person') {
      const person = database.persons.find((p) => p.id === id);
      name = person ? `${person.firstName} ${person.lastName}`.trim() : '';
    } else {
      const org = database.organizations.find((o) => o.id === id);
      name = org?.name || '';
    }
  }

  return { kind, id, name: name || id };
};

export const resolveFilemakerPartyLabel = (
  database: FilemakerDatabase,
  reference: FilemakerPartyReference | null | undefined
): string | null => {
  const sanitized = sanitizeReference(reference);
  if (!sanitized) return null;

  if (sanitized.kind === 'person') {
    const person = database.persons.find(
      (entry: FilemakerPerson) => entry.id === sanitized.id
    );
    if (!person) return null;
    const name = `${person.firstName} ${person.lastName}`.trim();
    return name || person.id;
  }

  const organization = database.organizations.find(
    (entry: FilemakerOrganization) => entry.id === sanitized.id
  );
  if (!organization) return null;
  return organization.name || organization.id;
};

export const buildFilemakerPartyOptions = (
  database: FilemakerDatabase
): FilemakerPartyOption[] => {
  const personOptions = database.persons.map((person: FilemakerPerson) => {
    const label = `${person.firstName} ${person.lastName}`.trim() || person.id;
    const address = formatFilemakerAddress(person);
    const detail: string[] = [];
    if (person.nip) detail.push(`NIP: ${person.nip}`);
    if (person.regon) detail.push(`REGON: ${person.regon}`);
    return {
      value: `person:${person.id}`,
      label,
      kind: 'person' as const,
      description: detail.join(' | ') || address,
    };
  });

  const organizationOptions = database.organizations.map(
    (organization: FilemakerOrganization) => ({
      value: `organization:${organization.id}`,
      label: organization.name || organization.id,
      kind: 'organization' as const,
      description: formatFilemakerAddress(organization),
    })
  );

  return [
    { value: FILEMAKER_REFERENCE_NONE, label: 'None' },
    ...personOptions,
    ...organizationOptions,
  ];
};
