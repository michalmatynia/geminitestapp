import 'server-only';

/* eslint-disable complexity */

import type { Collection, Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  MongoFilemakerContactLog,
  MongoFilemakerContactLogParty,
  MongoFilemakerContactLogsResponse,
  MongoFilemakerContactLogValue,
  MongoFilemakerContactLogValueKind,
} from '../filemaker-contact-logs.types';
import type { FilemakerOrganization } from '../types';

export const FILEMAKER_CONTACT_LOGS_COLLECTION = 'filemaker_contact_logs';

type MongoContactLogPartyKind = MongoFilemakerContactLogParty['partyKind'];

type MongoContactLogPartyDocument = {
  legacyOwnerUuid: string;
  ownerName?: string;
  partyId: string;
  partyKind: MongoContactLogPartyKind;
};

type MongoContactLogValueDocument = {
  kind: MongoFilemakerContactLogValueKind;
  label?: string;
  legacyValueUuid: string;
  parentId?: string | null;
  valueId?: string;
};

type MongoContactLogDocument = Document & {
  _id: string;
  comment?: string;
  contactTypeLabel?: string;
  createdAt?: string;
  dateEntered?: string;
  id: string;
  legacyContactTypeUuid?: string;
  legacyFilemakerId?: string;
  legacyOrganizationUuid?: string;
  legacyOwnerUuids?: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
  linkedParties?: MongoContactLogPartyDocument[];
  mailCampaignLabel?: string;
  mailServerLabel?: string;
  onBehalfLabel?: string;
  organizationId?: string;
  ownerName?: string;
  partyId?: string;
  partyKind?: MongoContactLogPartyKind;
  personId?: string;
  eventId?: string;
  updatedAt?: string;
  updatedBy?: string;
  values?: MongoContactLogValueDocument[];
  yearProspectLabel?: string;
};

type ListContactLogsInput = {
  page?: string | null;
  pageSize?: string | null;
  query?: string | null;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const parsePositiveInt = (value: string | null | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePageSize = (input: ListContactLogsInput): number =>
  Math.min(parsePositiveInt(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

const normalizePage = (page: number, totalPages: number): number =>
  Math.min(Math.max(page, 1), Math.max(totalPages, 1));

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const optionalStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry: unknown): entry is string => typeof entry === 'string')
    : [];

const toContactLogParty = (
  party: MongoContactLogPartyDocument
): MongoFilemakerContactLogParty => ({
  legacyOwnerUuid: party.legacyOwnerUuid,
  ...(optionalString(party.ownerName) !== undefined
    ? { ownerName: optionalString(party.ownerName) }
    : {}),
  partyId: party.partyId,
  partyKind: party.partyKind,
});

const toContactLogValue = (
  value: MongoContactLogValueDocument
): MongoFilemakerContactLogValue => ({
  kind: value.kind,
  ...(optionalString(value.label) !== undefined ? { label: optionalString(value.label) } : {}),
  legacyValueUuid: value.legacyValueUuid,
  ...(value.parentId !== undefined ? { parentId: value.parentId } : {}),
  ...(optionalString(value.valueId) !== undefined
    ? { valueId: optionalString(value.valueId) }
    : {}),
});

const toMongoFilemakerContactLog = (
  document: MongoContactLogDocument
): MongoFilemakerContactLog => ({
  ...(optionalString(document.comment) !== undefined
    ? { comment: optionalString(document.comment) }
    : {}),
  ...(optionalString(document.contactTypeLabel) !== undefined
    ? { contactTypeLabel: optionalString(document.contactTypeLabel) }
    : {}),
  ...(optionalString(document.createdAt) !== undefined
    ? { createdAt: optionalString(document.createdAt) }
    : {}),
  ...(optionalString(document.dateEntered) !== undefined
    ? { dateEntered: optionalString(document.dateEntered) }
    : {}),
  id: document.id,
  ...(optionalString(document.legacyContactTypeUuid) !== undefined
    ? { legacyContactTypeUuid: optionalString(document.legacyContactTypeUuid) }
    : {}),
  ...(optionalString(document.legacyFilemakerId) !== undefined
    ? { legacyFilemakerId: optionalString(document.legacyFilemakerId) }
    : {}),
  ...(optionalString(document.legacyOrganizationUuid) !== undefined
    ? { legacyOrganizationUuid: optionalString(document.legacyOrganizationUuid) }
    : {}),
  legacyOwnerUuids: optionalStringArray(document.legacyOwnerUuids),
  ...(optionalString(document.legacyParentUuid) !== undefined
    ? { legacyParentUuid: optionalString(document.legacyParentUuid) }
    : {}),
  legacyUuid: document.legacyUuid,
  linkedParties: (document.linkedParties ?? []).map(toContactLogParty),
  ...(optionalString(document.mailCampaignLabel) !== undefined
    ? { mailCampaignLabel: optionalString(document.mailCampaignLabel) }
    : {}),
  ...(optionalString(document.mailServerLabel) !== undefined
    ? { mailServerLabel: optionalString(document.mailServerLabel) }
    : {}),
  ...(optionalString(document.onBehalfLabel) !== undefined
    ? { onBehalfLabel: optionalString(document.onBehalfLabel) }
    : {}),
  ...(optionalString(document.ownerName) !== undefined
    ? { ownerName: optionalString(document.ownerName) }
    : {}),
  ...(optionalString(document.updatedAt) !== undefined
    ? { updatedAt: optionalString(document.updatedAt) }
    : {}),
  ...(optionalString(document.updatedBy) !== undefined
    ? { updatedBy: optionalString(document.updatedBy) }
    : {}),
  values: (document.values ?? []).map(toContactLogValue),
  ...(optionalString(document.yearProspectLabel) !== undefined
    ? { yearProspectLabel: optionalString(document.yearProspectLabel) }
    : {}),
});

const buildOrganizationContactLogFilter = (
  organization: FilemakerOrganization,
  query: string
): Filter<MongoContactLogDocument> => {
  const clauses: Filter<MongoContactLogDocument>[] = [
    { organizationId: organization.id },
    { partyId: organization.id, partyKind: 'organization' },
    { 'linkedParties.partyId': organization.id, 'linkedParties.partyKind': 'organization' },
  ];
  const legacyUuid = organization.legacyUuid?.trim() ?? '';
  if (legacyUuid.length > 0) {
    clauses.push(
      { legacyOrganizationUuid: legacyUuid },
      { legacyOwnerUuids: legacyUuid },
      {
        'linkedParties.legacyOwnerUuid': legacyUuid,
        'linkedParties.partyKind': 'organization',
      }
    );
  }
  const filter: Filter<MongoContactLogDocument> = { $or: clauses };
  if (query.length === 0) return filter;
  return {
    $and: [
      filter,
      {
        $text: { $search: query },
      },
    ],
  };
};

export const ensureMongoFilemakerContactLogReadIndexes = async (
  collection: Collection<MongoContactLogDocument>
): Promise<void> => {
  await Promise.all([
    collection.createIndex(
      { organizationId: 1, dateEntered: -1, _id: 1 },
      {
        name: 'filemaker_contact_logs_organization_date',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { partyKind: 1, partyId: 1, dateEntered: -1, _id: 1 },
      {
        name: 'filemaker_contact_logs_party_date',
        partialFilterExpression: { partyId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { 'linkedParties.partyKind': 1, 'linkedParties.partyId': 1, dateEntered: -1 },
      { name: 'filemaker_contact_logs_linked_party_date' }
    ),
  ]);
};

export const listMongoFilemakerContactLogsForOrganization = async (
  organization: FilemakerOrganization,
  input: ListContactLogsInput
): Promise<MongoFilemakerContactLogsResponse> => {
  const pageSize = normalizePageSize(input);
  const requestedPage = parsePositiveInt(input.page, 1);
  const query = input.query?.trim() ?? '';
  const db = await getMongoDb();
  const collection = db.collection<MongoContactLogDocument>(FILEMAKER_CONTACT_LOGS_COLLECTION);
  const filter = buildOrganizationContactLogFilter(organization, query);
  const totalCount = await collection.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = normalizePage(requestedPage, totalPages);
  const documents = await collection
    .find(filter)
    .sort({ dateEntered: -1, _id: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    contactLogs: documents.map(toMongoFilemakerContactLog),
    limit: pageSize,
    page,
    pageSize,
    query,
    totalCount,
    totalPages,
  };
};
