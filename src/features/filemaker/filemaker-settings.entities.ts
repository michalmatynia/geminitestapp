import { normalizeAddressFields } from '@/shared/lib/filemaker/entity-builders';

import { normalizeString } from './filemaker-settings.helpers';
import {
  type FilemakerAddressLink,
  type FilemakerAddressOwnerKind,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEvent,
  type FilemakerEventOrganizationLink,
  type FilemakerJobListing,
  type FilemakerJobListingSalaryPeriod,
  type FilemakerJobListingStatus,
  type FilemakerOrganizationLegacyDemand,
  type FilemakerPartyKind,
  type FilemakerPhoneNumber,
  type FilemakerPhoneNumberLink,
  type FilemakerValue,
  type FilemakerValueParameter,
  type FilemakerValueParameterLink,
} from './types';

const FILEMAKER_JOB_LISTING_STATUSES: FilemakerJobListingStatus[] = [
  'draft',
  'open',
  'paused',
  'closed',
];

const FILEMAKER_JOB_LISTING_SALARY_PERIODS: FilemakerJobListingSalaryPeriod[] = [
  'hourly',
  'monthly',
  'yearly',
  'fixed',
];

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry: unknown): string => normalizeString(entry))
        .filter((entry: string): boolean => entry.length > 0)
    )
  );
};

const normalizeJobListingStatus = (value: unknown): FilemakerJobListingStatus => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_JOB_LISTING_STATUSES.find(
      (status: FilemakerJobListingStatus): boolean => status === normalized
    ) ?? 'draft'
  );
};

const normalizeJobListingSalaryPeriod = (value: unknown): FilemakerJobListingSalaryPeriod => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_JOB_LISTING_SALARY_PERIODS.find(
      (period: FilemakerJobListingSalaryPeriod): boolean => period === normalized
    ) ?? 'monthly'
  );
};

export {
  createFilemakerAddress,
  createFilemakerOrganization,
  createFilemakerPerson,
  formatFilemakerAddress,
} from '@/shared/lib/filemaker/entity-builders';

export const createFilemakerAddressLink = (input: {
  id: string;
  ownerKind: unknown;
  ownerId: unknown;
  addressId: unknown;
  isDefault?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerAddressLink => {
  const now = new Date().toISOString();
  const rawOwnerKind = normalizeString(input.ownerKind).toLowerCase();
  const ownerKind: FilemakerAddressOwnerKind =
    rawOwnerKind === 'person' || rawOwnerKind === 'organization' || rawOwnerKind === 'event'
      ? rawOwnerKind
      : 'person';
  return {
    id: normalizeString(input.id),
    ownerKind,
    ownerId: normalizeString(input.ownerId),
    addressId: normalizeString(input.addressId),
    isDefault: Boolean(input.isDefault),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEvent = (input: {
  id: string;
  eventName: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEvent => {
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
    eventName: normalizeString(input.eventName),
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

export const createFilemakerPhoneNumber = (input: {
  id: string;
  phoneNumber: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPhoneNumber => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    phoneNumber: normalizeString(input.phoneNumber),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerPhoneNumberLink = (input: {
  id: string;
  phoneNumberId: unknown;
  partyKind: unknown;
  partyId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPhoneNumberLink => {
  const now = new Date().toISOString();
  const rawPartyKind = normalizeString(input.partyKind).toLowerCase();
  const partyKind: FilemakerPartyKind = rawPartyKind === 'organization' ? 'organization' : 'person';
  return {
    id: normalizeString(input.id),
    phoneNumberId: normalizeString(input.phoneNumberId),
    partyKind,
    partyId: normalizeString(input.partyId),
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
    email: normalizeString(input.email).toLowerCase(),
    status: (normalizeString(input.status).toLowerCase() ||
      'unverified') as FilemakerEmail['status'],
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
  const partyKind: FilemakerPartyKind = rawPartyKind === 'organization' ? 'organization' : 'person';

  return {
    id: normalizeString(input.id),
    emailId: normalizeString(input.emailId),
    partyKind,
    partyId: normalizeString(input.partyId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEventOrganizationLink = (input: {
  id: string;
  eventId: unknown;
  organizationId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEventOrganizationLink => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    eventId: normalizeString(input.eventId),
    organizationId: normalizeString(input.organizationId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerValue = (input: {
  id: string;
  label: unknown;
  value?: unknown;
  parentId?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  legacyUuid?: unknown;
  legacyParentUuids?: unknown;
  legacyListUuids?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerValue => {
  const now = new Date().toISOString();
  const sortOrder = Number(input.sortOrder);
  const legacyUuid = normalizeString(input.legacyUuid);
  const createdBy = normalizeString(input.createdBy);
  const updatedBy = normalizeString(input.updatedBy);
  const legacyParentUuids = Array.isArray(input.legacyParentUuids)
    ? input.legacyParentUuids
        .map(normalizeString)
        .filter((value: string): boolean => value.length > 0)
    : [];
  const legacyListUuids = Array.isArray(input.legacyListUuids)
    ? input.legacyListUuids
        .map(normalizeString)
        .filter((value: string): boolean => value.length > 0)
    : [];
  return {
    id: normalizeString(input.id),
    parentId: normalizeString(input.parentId) || null,
    label: normalizeString(input.label),
    value: normalizeString(input.value),
    description: normalizeString(input.description) || undefined,
    sortOrder: Number.isInteger(sortOrder) && sortOrder >= 0 ? sortOrder : 0,
    ...(legacyUuid.length > 0 ? { legacyUuid } : {}),
    ...(legacyParentUuids.length > 0 ? { legacyParentUuids } : {}),
    ...(legacyListUuids.length > 0 ? { legacyListUuids } : {}),
    ...(createdBy.length > 0 ? { createdBy } : {}),
    ...(updatedBy.length > 0 ? { updatedBy } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerValueParameter = (input: {
  id: string;
  label: unknown;
  description?: unknown;
  legacyUuid?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerValueParameter => {
  const now = new Date().toISOString();
  const legacyUuid = normalizeString(input.legacyUuid);
  return {
    id: normalizeString(input.id),
    label: normalizeString(input.label),
    description: normalizeString(input.description) || undefined,
    ...(legacyUuid.length > 0 ? { legacyUuid } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerValueParameterLink = (input: {
  id: string;
  valueId: unknown;
  parameterId: unknown;
  legacyValueUuid?: unknown;
  legacyParameterUuid?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerValueParameterLink => {
  const now = new Date().toISOString();
  const legacyValueUuid = normalizeString(input.legacyValueUuid);
  const legacyParameterUuid = normalizeString(input.legacyParameterUuid);
  return {
    id: normalizeString(input.id),
    valueId: normalizeString(input.valueId),
    parameterId: normalizeString(input.parameterId),
    ...(legacyValueUuid.length > 0 ? { legacyValueUuid } : {}),
    ...(legacyParameterUuid.length > 0 ? { legacyParameterUuid } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerOrganizationLegacyDemand = (input: {
  id: string;
  organizationId: unknown;
  valueIds?: unknown;
  legacyUuid?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerOrganizationLegacyDemand => {
  const now = new Date().toISOString();
  const legacyUuid = normalizeString(input.legacyUuid);
  const valueIds = Array.isArray(input.valueIds)
    ? input.valueIds
        .map(normalizeString)
        .filter((valueId: string, index: number, values: string[]): boolean => {
          return valueId.length > 0 && values.indexOf(valueId) === index;
        })
        .slice(0, 4)
    : [];

  return {
    id: normalizeString(input.id),
    organizationId: normalizeString(input.organizationId),
    valueIds,
    ...(legacyUuid.length > 0 ? { legacyUuid } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerJobListing = (input: {
  id: string;
  organizationId: unknown;
  title: unknown;
  description?: unknown;
  location?: unknown;
  salaryMin?: unknown;
  salaryMax?: unknown;
  salaryCurrency?: unknown;
  salaryPeriod?: unknown;
  status?: unknown;
  targetedCampaignIds?: unknown;
  lastTargetedAt?: unknown;
  sourceExternalId?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
  scrapedAt?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerJobListing => {
  const now = new Date().toISOString();
  const salaryMin = normalizeOptionalNumber(input.salaryMin);
  const salaryMax = normalizeOptionalNumber(input.salaryMax);
  const lastTargetedAt = normalizeString(input.lastTargetedAt);
  const location = normalizeString(input.location);
  const scrapedAt = normalizeString(input.scrapedAt);
  const salaryCurrency = normalizeString(input.salaryCurrency).toUpperCase();
  const sourceExternalId = normalizeString(input.sourceExternalId);
  const sourceSite = normalizeString(input.sourceSite);
  const sourceUrl = normalizeString(input.sourceUrl);
  return {
    id: normalizeString(input.id),
    organizationId: normalizeString(input.organizationId),
    title: normalizeString(input.title),
    description: normalizeString(input.description),
    ...(location.length > 0 ? { location } : {}),
    salaryMin,
    salaryMax,
    ...(salaryCurrency.length > 0 ? { salaryCurrency } : {}),
    salaryPeriod: normalizeJobListingSalaryPeriod(input.salaryPeriod),
    status: normalizeJobListingStatus(input.status),
    targetedCampaignIds: normalizeStringList(input.targetedCampaignIds),
    ...(lastTargetedAt.length > 0 ? { lastTargetedAt } : {}),
    ...(sourceExternalId.length > 0 ? { sourceExternalId } : {}),
    ...(sourceSite.length > 0 ? { sourceSite } : {}),
    ...(sourceUrl.length > 0 ? { sourceUrl } : {}),
    ...(scrapedAt.length > 0 ? { scrapedAt } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};
