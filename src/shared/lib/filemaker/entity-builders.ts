import type {
  FilemakerAddressDto as FilemakerAddress,
  FilemakerAddressFields,
  FilemakerOrganizationDto as FilemakerOrganization,
  FilemakerPersonDto as FilemakerPerson,
} from '@/shared/contracts/filemaker';

const normalizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const ORGANIZATION_OPTIONAL_STRING_FIELDS = [
  'cooperationStatus',
  'defaultBankAccountId',
  'displayAddressId',
  'displayBankAccountId',
  'establishedDate',
  'krs',
  'legacyDefaultAddressUuid',
  'legacyDefaultBankAccountUuid',
  'legacyDisplayAddressUuid',
  'legacyDisplayBankAccountUuid',
  'legacyParentUuid',
  'legacyUuid',
  'parentOrganizationId',
  'taxId',
  'tradingName',
  'updatedBy',
  'jobBoardCompanyProfile',
  'jobBoardCompanyProfileScrapedAt',
  'jobBoardCompanyProfileUrl',
] as const;

type OrganizationOptionalStringField = (typeof ORGANIZATION_OPTIONAL_STRING_FIELDS)[number];

type FilemakerOrganizationInput = {
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
} & Partial<Record<OrganizationOptionalStringField, unknown>>;

const normalizeOptionalStringFields = <T extends string>(
  input: Partial<Record<T, unknown>>,
  fields: readonly T[]
): Partial<Record<T, string>> => {
  const output: Partial<Record<T, string>> = {};
  fields.forEach((field: T): void => {
    const normalized = normalizeOptionalString(input[field]);
    if (normalized !== undefined) {
      output[field] = normalized;
    }
  });
  return output;
};

const normalizePhoneNumbers = (value: unknown): string[] => {
  const unique = new Set<string>();

  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => {
      const normalized = normalizeString(entry);
      if (normalized.length === 0) return;
      unique.add(normalized);
    });
    return Array.from(unique);
  }

  if (typeof value === 'string') {
    value
      .split(',')
      .map((entry: string) => entry.trim())
      .forEach((entry: string): void => {
        if (entry.length === 0) return;
        unique.add(entry);
      });
    return Array.from(unique);
  }

  return [];
};

export const normalizeAddressFields = (value: {
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  countryValueId?: unknown;
  countryValueLabel?: unknown;
  legacyCountryUuid?: unknown;
  legacyUuid?: unknown;
}): FilemakerAddressFields => ({
  street: normalizeString(value.street),
  streetNumber: normalizeString(value.streetNumber),
  city: normalizeString(value.city),
  postalCode: normalizeString(value.postalCode),
  country: normalizeString(value.country),
  countryId: normalizeString(value.countryId),
  ...(normalizeOptionalString(value.countryValueId) !== undefined
    ? { countryValueId: normalizeOptionalString(value.countryValueId) }
    : {}),
  ...(normalizeOptionalString(value.countryValueLabel) !== undefined
    ? { countryValueLabel: normalizeOptionalString(value.countryValueLabel) }
    : {}),
  ...(normalizeOptionalString(value.legacyCountryUuid) !== undefined
    ? { legacyCountryUuid: normalizeOptionalString(value.legacyCountryUuid) }
    : {}),
  ...(normalizeOptionalString(value.legacyUuid) !== undefined
    ? { legacyUuid: normalizeOptionalString(value.legacyUuid) }
    : {}),
});

export const formatFilemakerAddress = (
  value: Pick<FilemakerAddressFields, 'street' | 'streetNumber' | 'city' | 'postalCode' | 'country'>
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

export const createFilemakerAddress = (input: {
  id: string;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  countryValueId?: unknown;
  countryValueLabel?: unknown;
  legacyCountryUuid?: unknown;
  legacyUuid?: unknown;
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
    countryValueId: input.countryValueId,
    countryValueLabel: input.countryValueLabel,
    legacyCountryUuid: input.legacyCountryUuid,
    legacyUuid: input.legacyUuid,
  });
  return {
    id: normalizeString(input.id),
    ...address,
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

export const createFilemakerOrganization = (
  input: FilemakerOrganizationInput
): FilemakerOrganization => {
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
    ...normalizeOptionalStringFields(input, ORGANIZATION_OPTIONAL_STRING_FIELDS),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};
