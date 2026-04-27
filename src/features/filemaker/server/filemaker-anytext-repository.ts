import 'server-only';

import type { Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerAnyText, FilemakerAnyTextOwnerKind } from '../filemaker-anytext.types';
import type { FilemakerEvent, FilemakerOrganization } from '../types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_ANYTEXTS_COLLECTION = 'filemaker_anytexts';

export type FilemakerAnyTextMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyOwnerUuid: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerAnyTextOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
  text: string;
  updatedAt?: string;
  updatedBy?: string;
};

type AnyTextOwnerReference = {
  id: string;
  kind: FilemakerAnyTextOwnerKind;
  legacyUuid?: string;
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

const toAnyText = (document: FilemakerAnyTextMongoDocument): FilemakerAnyText => ({
  id: document.id,
  legacyOwnerUuid: document.legacyOwnerUuid,
  legacyUuid: document.legacyUuid,
  text: document.text,
  ...optionalStringProp('ownerId', document.ownerId),
  ...optionalStringProp('ownerName', document.ownerName),
  ...(document.ownerKind !== undefined ? { ownerKind: document.ownerKind } : {}),
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

const buildAnyTextOwnerFilter = (
  owner: AnyTextOwnerReference
): Filter<FilemakerAnyTextMongoDocument> => {
  const clauses: Filter<FilemakerAnyTextMongoDocument>[] = [
    { ownerKind: owner.kind, ownerId: owner.id },
  ];
  const legacyUuid = owner.legacyUuid?.trim() ?? '';
  if (legacyUuid.length > 0) {
    clauses.push(
      { ownerKind: owner.kind, legacyOwnerUuid: legacyUuid },
      { ownerKind: { $exists: false }, legacyOwnerUuid: legacyUuid }
    );
  }
  return { $or: clauses };
};

export const listMongoFilemakerAnyTextsForOwner = async (
  owner: AnyTextOwnerReference
): Promise<FilemakerAnyText[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerAnyTextMongoDocument>(FILEMAKER_ANYTEXTS_COLLECTION)
    .find(buildAnyTextOwnerFilter(owner))
    .sort({ updatedAt: -1, createdAt: -1, id: 1 })
    .toArray();
  return documents.map(toAnyText);
};

export const listMongoFilemakerAnyTextsForOrganization = (
  organization: FilemakerOrganization
): Promise<FilemakerAnyText[]> =>
  listMongoFilemakerAnyTextsForOwner({
    id: organization.id,
    kind: 'organization',
    legacyUuid: organization.legacyUuid,
  });

export const listMongoFilemakerAnyTextsForPerson = (
  person: MongoFilemakerPerson
): Promise<FilemakerAnyText[]> =>
  listMongoFilemakerAnyTextsForOwner({
    id: person.id,
    kind: 'person',
    legacyUuid: person.legacyUuid,
  });

export const listMongoFilemakerAnyTextsForEvent = (
  event: FilemakerEvent & { legacyUuid?: string }
): Promise<FilemakerAnyText[]> =>
  listMongoFilemakerAnyTextsForOwner({
    id: event.id,
    kind: 'event',
    legacyUuid: event.legacyUuid,
  });
