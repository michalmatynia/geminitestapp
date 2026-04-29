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
  'jobBoardCompanyAddress',
  'jobBoardCompanyEmail',
  'jobBoardCompanyIndustry',
  'jobBoardCompanyLogoUrl',
  'jobBoardCompanyPhone',
  'krs',
  'legacyDefaultAddressUuid',
  'legacyDefaultBankAccountUuid',
  'legacyDisplayAddressUuid',
  'legacyDisplayBankAccountUuid',
  'legacyParentUuid',
  'legacyUuid',
  'parentOrganizationId',
  'taxId',
  'regon',
  'tradingName',
  'updatedBy',
  'jobBoardCompanyProfile',
  'jobBoardCompanyProfileScrapedAt',
  'jobBoardCompanyProfileUrl',
  'jobBoardCompanyRegion',
  'jobBoardCompanySize',
  'jobBoardCompanyWebsiteUrl',
  'jobBoardScrapedAt',
  'jobBoardSourceLabel',
  'jobBoardSourceSite',
  'jobBoardSourceUrl',
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

const normalizeStringList = (value: unknown): string[] => {
  const unique = new Set<string>();
  const add = (entry: unknown): void => {
    const normalized = normalizeString(entry);
    if (normalized.length === 0) return;
    unique.add(normalized);
  };

  if (Array.isArray(value)) {
    value.forEach(add);
    return Array.from(unique);
  }

  if (typeof value === 'string') {
    value.split(/\r?\n|,/).forEach(add);
    return Array.from(unique);
  }

  return [];
};

type FilemakerPersonProfileEducation = NonNullable<FilemakerPerson['profileEducation']>[number];
type FilemakerPersonProfileJobExperience = NonNullable<
  FilemakerPerson['profileJobExperience']
>[number];

const normalizeProfileEducation = (value: unknown): FilemakerPersonProfileEducation[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): FilemakerPersonProfileEducation | null => {
      if (entry === null || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const degree = normalizeString(record['degree']);
      const institution = normalizeString(record['institution']);
      const period = normalizeString(record['period']);
      const description = normalizeOptionalString(record['description']);
      if (degree.length === 0 && institution.length === 0) return null;
      return {
        ...(normalizeOptionalString(record['id']) !== undefined
          ? { id: normalizeOptionalString(record['id']) }
          : {}),
        degree,
        institution,
        period,
        ...(description !== undefined ? { description } : {}),
      };
    })
    .filter(
      (entry: FilemakerPersonProfileEducation | null): entry is FilemakerPersonProfileEducation =>
        entry !== null
    );
};

const normalizeProfileJobExperience = (value: unknown): FilemakerPersonProfileJobExperience[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): FilemakerPersonProfileJobExperience | null => {
      if (entry === null || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = normalizeString(record['title']);
      const organization = normalizeString(record['organization']);
      const period = normalizeString(record['period']);
      const location = normalizeOptionalString(record['location']);
      const description = normalizeOptionalString(record['description']);
      const highlights = normalizeStringList(record['highlights']);
      if (title.length === 0 && organization.length === 0) return null;
      return {
        ...(normalizeOptionalString(record['id']) !== undefined
          ? { id: normalizeOptionalString(record['id']) }
          : {}),
        title,
        organization,
        period,
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(highlights.length > 0 ? { highlights } : {}),
      };
    })
    .filter(
      (
        entry: FilemakerPersonProfileJobExperience | null
      ): entry is FilemakerPersonProfileJobExperience => entry !== null
    );
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
  linkedinUrl?: unknown;
  githubUrl?: unknown;
  profileEducation?: unknown;
  profileJobExperience?: unknown;
  cvHeadline?: unknown;
  cvProfessionalSummary?: unknown;
  cvCoreStrengths?: unknown;
  cvSelectedTechnicalEnvironment?: unknown;
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
  const linkedinUrl = normalizeOptionalString(input.linkedinUrl);
  const githubUrl = normalizeOptionalString(input.githubUrl);
  const profileEducation = normalizeProfileEducation(input.profileEducation);
  const profileJobExperience = normalizeProfileJobExperience(input.profileJobExperience);
  const cvHeadline = normalizeOptionalString(input.cvHeadline);
  const cvProfessionalSummary = normalizeOptionalString(input.cvProfessionalSummary);
  const cvCoreStrengths = normalizeStringList(input.cvCoreStrengths);
  const cvSelectedTechnicalEnvironment = normalizeStringList(input.cvSelectedTechnicalEnvironment);
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
    ...(linkedinUrl !== undefined ? { linkedinUrl } : {}),
    ...(githubUrl !== undefined ? { githubUrl } : {}),
    ...(profileEducation.length > 0 ? { profileEducation } : {}),
    ...(profileJobExperience.length > 0 ? { profileJobExperience } : {}),
    ...(cvHeadline !== undefined ? { cvHeadline } : {}),
    ...(cvProfessionalSummary !== undefined ? { cvProfessionalSummary } : {}),
    ...(cvCoreStrengths.length > 0 ? { cvCoreStrengths } : {}),
    ...(cvSelectedTechnicalEnvironment.length > 0 ? { cvSelectedTechnicalEnvironment } : {}),
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
