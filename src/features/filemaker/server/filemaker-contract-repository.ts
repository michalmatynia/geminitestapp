import 'server-only';

import type { Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerContract,
  FilemakerContractEventLink,
  FilemakerContractPartyKind,
  FilemakerContractPersonLink,
} from '../filemaker-contract.types';
import type { FilemakerEvent } from '../types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_CONTRACTS_COLLECTION = 'filemaker_contracts';
export const FILEMAKER_CONTRACT_EVENT_LINKS_COLLECTION = 'filemaker_contract_event_links';
export const FILEMAKER_CONTRACT_PERSON_LINKS_COLLECTION = 'filemaker_contract_person_links';

export type FilemakerContractMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  firstEventEndDate?: string;
  firstEventName?: string;
  firstEventStartDate?: string;
  id: string;
  legacyOnBehalfUuid?: string;
  legacyUuid: string;
  onBehalfId?: string;
  onBehalfKind?: FilemakerContractPartyKind;
  onBehalfName?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type FilemakerContractEventLinkMongoDocument = Document & {
  _id: string;
  city?: string;
  contractId: string;
  createdAt?: string;
  createdBy?: string;
  endDate?: string;
  eventId?: string;
  eventName?: string;
  id: string;
  legacyContractUuid: string;
  legacyCountryUuid?: string;
  legacyEventInstanceUuid?: string;
  legacyEventUuid: string;
  legacyOnBehalfUuid?: string;
  legacyUuid?: string;
  startDate?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type FilemakerContractPersonLinkMongoDocument = Document & {
  _id: string;
  contractId: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyContractUuid: string;
  legacyPersonUuid: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  personId?: string;
  personName?: string;
  statusLabel?: string;
  statusValueId?: string;
  updatedAt?: string;
  updatedBy?: string;
};

const optionalDocumentString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const optionalStringProp = <TKey extends string>(
  key: TKey,
  value: unknown
): Partial<Record<TKey, string>> => {
  const normalized = optionalDocumentString(value);
  if (normalized === undefined) return {};
  const output: Partial<Record<TKey, string>> = {};
  output[key] = normalized;
  return output;
};

const toEventLink = (
  document: FilemakerContractEventLinkMongoDocument
): FilemakerContractEventLink => ({
  contractId: document.contractId,
  id: document.id,
  legacyContractUuid: document.legacyContractUuid,
  legacyEventUuid: document.legacyEventUuid,
  ...optionalStringProp('city', document.city),
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('createdBy', document.createdBy),
  ...optionalStringProp('endDate', document.endDate),
  ...optionalStringProp('eventId', document.eventId),
  ...optionalStringProp('eventName', document.eventName),
  ...optionalStringProp('legacyCountryUuid', document.legacyCountryUuid),
  ...optionalStringProp('legacyEventInstanceUuid', document.legacyEventInstanceUuid),
  ...optionalStringProp('legacyUuid', document.legacyUuid),
  ...optionalStringProp('startDate', document.startDate),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

const toPersonLink = (
  document: FilemakerContractPersonLinkMongoDocument
): FilemakerContractPersonLink => ({
  contractId: document.contractId,
  id: document.id,
  legacyContractUuid: document.legacyContractUuid,
  legacyPersonUuid: document.legacyPersonUuid,
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('createdBy', document.createdBy),
  ...optionalStringProp('legacyStatusUuid', document.legacyStatusUuid),
  ...optionalStringProp('legacyUuid', document.legacyUuid),
  ...optionalStringProp('personId', document.personId),
  ...optionalStringProp('personName', document.personName),
  ...optionalStringProp('statusLabel', document.statusLabel),
  ...optionalStringProp('statusValueId', document.statusValueId),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

const toContract = (
  document: FilemakerContractMongoDocument,
  eventLinks: FilemakerContractEventLink[],
  personLinks: FilemakerContractPersonLink[]
): FilemakerContract => ({
  eventLinks,
  id: document.id,
  legacyUuid: document.legacyUuid,
  personLinks,
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('firstEventEndDate', document.firstEventEndDate),
  ...optionalStringProp('firstEventName', document.firstEventName),
  ...optionalStringProp('firstEventStartDate', document.firstEventStartDate),
  ...optionalStringProp('legacyOnBehalfUuid', document.legacyOnBehalfUuid),
  ...optionalStringProp('onBehalfId', document.onBehalfId),
  ...(document.onBehalfKind !== undefined ? { onBehalfKind: document.onBehalfKind } : {}),
  ...optionalStringProp('onBehalfName', document.onBehalfName),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

const groupByContractId = <TLink extends { contractId: string }>(
  links: TLink[]
): Map<string, TLink[]> => {
  const grouped = new Map<string, TLink[]>();
  links.forEach((link: TLink): void => {
    grouped.set(link.contractId, [...(grouped.get(link.contractId) ?? []), link]);
  });
  return grouped;
};

const listContractsByIds = async (contractIds: string[]): Promise<FilemakerContract[]> => {
  if (contractIds.length === 0) return [];
  const uniqueIds = [...new Set(contractIds)];
  const db = await getMongoDb();
  const [contracts, eventLinks, personLinks] = await Promise.all([
    db
      .collection<FilemakerContractMongoDocument>(FILEMAKER_CONTRACTS_COLLECTION)
      .find({ id: { $in: uniqueIds } })
      .sort({ firstEventStartDate: -1, updatedAt: -1, id: 1 })
      .toArray(),
    db
      .collection<FilemakerContractEventLinkMongoDocument>(
        FILEMAKER_CONTRACT_EVENT_LINKS_COLLECTION
      )
      .find({ contractId: { $in: uniqueIds } })
      .sort({ startDate: -1, id: 1 })
      .toArray(),
    db
      .collection<FilemakerContractPersonLinkMongoDocument>(
        FILEMAKER_CONTRACT_PERSON_LINKS_COLLECTION
      )
      .find({ contractId: { $in: uniqueIds } })
      .sort({ personName: 1, id: 1 })
      .toArray(),
  ]);
  const eventLinksByContractId = groupByContractId(eventLinks.map(toEventLink));
  const personLinksByContractId = groupByContractId(personLinks.map(toPersonLink));
  return contracts.map((contract: FilemakerContractMongoDocument): FilemakerContract =>
    toContract(
      contract,
      eventLinksByContractId.get(contract.id) ?? [],
      personLinksByContractId.get(contract.id) ?? []
    )
  );
};

const legacyClause = <TDocument extends Document>(
  key: keyof TDocument & string,
  legacyUuid: string | undefined
): Filter<TDocument>[] => {
  const normalized = legacyUuid?.trim() ?? '';
  return normalized.length > 0 ? ([{ [key]: normalized }] as Filter<TDocument>[]) : [];
};

export const listMongoFilemakerContractsForPerson = async (
  person: MongoFilemakerPerson
): Promise<FilemakerContract[]> => {
  const db = await getMongoDb();
  const personLinks = await db
    .collection<FilemakerContractPersonLinkMongoDocument>(FILEMAKER_CONTRACT_PERSON_LINKS_COLLECTION)
    .find({
      $or: [
        { personId: person.id },
        ...legacyClause<FilemakerContractPersonLinkMongoDocument>(
          'legacyPersonUuid',
          person.legacyUuid
        ),
      ],
    })
    .toArray();
  const onBehalfContracts = await db
    .collection<FilemakerContractMongoDocument>(FILEMAKER_CONTRACTS_COLLECTION)
    .find({
      $or: [
        { onBehalfKind: 'person', onBehalfId: person.id },
        ...legacyClause<FilemakerContractMongoDocument>('legacyOnBehalfUuid', person.legacyUuid),
      ],
    })
    .toArray();
  return listContractsByIds([
    ...personLinks.map((link: FilemakerContractPersonLinkMongoDocument): string => link.contractId),
    ...onBehalfContracts.map((contract: FilemakerContractMongoDocument): string => contract.id),
  ]);
};

export const listMongoFilemakerContractsForEvent = async (
  event: FilemakerEvent & { legacyUuid?: string }
): Promise<FilemakerContract[]> => {
  const db = await getMongoDb();
  const eventLinks = await db
    .collection<FilemakerContractEventLinkMongoDocument>(FILEMAKER_CONTRACT_EVENT_LINKS_COLLECTION)
    .find({
      $or: [
        { eventId: event.id },
        ...legacyClause<FilemakerContractEventLinkMongoDocument>(
          'legacyEventUuid',
          event.legacyUuid
        ),
      ],
    })
    .toArray();
  return listContractsByIds(
    eventLinks.map((link: FilemakerContractEventLinkMongoDocument): string => link.contractId)
  );
};
