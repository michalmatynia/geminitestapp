import 'server-only';

import type { Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerAnyParam,
  FilemakerAnyParamOwnerKind,
  FilemakerAnyParamTextValue,
  FilemakerAnyParamValue,
} from '../filemaker-anyparam.types';
import type { FilemakerEvent, FilemakerOrganization } from '../types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_ANYPARAMS_COLLECTION = 'filemaker_anyparams';

export type FilemakerAnyParamMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyOwnerUuid: string;
  legacyUuid: string;
  legacyValueUuids?: string[];
  ownerId?: string;
  ownerKind?: FilemakerAnyParamOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
  textValues?: FilemakerAnyParamTextValue[];
  updatedAt?: string;
  updatedBy?: string;
  valueIds?: string[];
  values?: FilemakerAnyParamValue[];
};

type AnyParamOwnerReference = {
  id: string;
  kind: FilemakerAnyParamOwnerKind;
  legacyUuid?: string;
};

const optionalDocumentString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const documentStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry: unknown): entry is string => typeof entry === 'string')
    : [];

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

const toAnyParamValue = (value: unknown): FilemakerAnyParamValue | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const legacyValueUuid = optionalDocumentString(record['legacyValueUuid']);
  if (legacyValueUuid === undefined) return null;
  const level = typeof record['level'] === 'number' ? record['level'] : 0;
  return {
    legacyValueUuid,
    level,
    ...optionalStringProp('label', record['label']),
    ...optionalStringProp('parentId', record['parentId']),
    ...optionalStringProp('valueId', record['valueId']),
  };
};

const toTextValue = (value: unknown): FilemakerAnyParamTextValue | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const text = optionalDocumentString(record['value']);
  if (text === undefined) return null;
  const slot = typeof record['slot'] === 'number' ? record['slot'] : 0;
  return {
    field: optionalDocumentString(record['field']) ?? `text${slot > 0 ? String(slot) : ''}`,
    slot,
    value: text,
  };
};

const toAnyParam = (document: FilemakerAnyParamMongoDocument): FilemakerAnyParam => {
  const values = Array.isArray(document.values)
    ? document.values
        .map(toAnyParamValue)
        .filter((value): value is FilemakerAnyParamValue => value !== null)
    : [];
  const textValues = Array.isArray(document.textValues)
    ? document.textValues
        .map(toTextValue)
        .filter((value): value is FilemakerAnyParamTextValue => value !== null)
    : [];
  return {
    id: document.id,
    legacyOwnerUuid: document.legacyOwnerUuid,
    legacyUuid: document.legacyUuid,
    legacyValueUuids: documentStringArray(document.legacyValueUuids),
    textValues,
    valueIds: documentStringArray(document.valueIds),
    values,
    ...optionalStringProp('ownerId', document.ownerId),
    ...optionalStringProp('ownerName', document.ownerName),
    ...(document.ownerKind !== undefined ? { ownerKind: document.ownerKind } : {}),
    ...optionalStringProp('createdAt', document.createdAt),
    ...optionalStringProp('createdBy', document.createdBy),
    ...optionalStringProp('updatedAt', document.updatedAt),
    ...optionalStringProp('updatedBy', document.updatedBy),
  };
};

const buildAnyParamOwnerFilter = (
  owner: AnyParamOwnerReference
): Filter<FilemakerAnyParamMongoDocument> => {
  const clauses: Filter<FilemakerAnyParamMongoDocument>[] = [
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

export const listMongoFilemakerAnyParamsForOwner = async (
  owner: AnyParamOwnerReference
): Promise<FilemakerAnyParam[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerAnyParamMongoDocument>(FILEMAKER_ANYPARAMS_COLLECTION)
    .find(buildAnyParamOwnerFilter(owner))
    .sort({ updatedAt: -1, createdAt: -1, id: 1 })
    .toArray();
  return documents.map(toAnyParam);
};

export const listMongoFilemakerAnyParamsForOrganization = (
  organization: FilemakerOrganization
): Promise<FilemakerAnyParam[]> =>
  listMongoFilemakerAnyParamsForOwner({
    id: organization.id,
    kind: 'organization',
    legacyUuid: organization.legacyUuid,
  });

export const listMongoFilemakerAnyParamsForPerson = (
  person: MongoFilemakerPerson
): Promise<FilemakerAnyParam[]> =>
  listMongoFilemakerAnyParamsForOwner({
    id: person.id,
    kind: 'person',
    legacyUuid: person.legacyUuid,
  });

export const listMongoFilemakerAnyParamsForEvent = (
  event: FilemakerEvent & { legacyUuid?: string }
): Promise<FilemakerAnyParam[]> =>
  listMongoFilemakerAnyParamsForOwner({
    id: event.id,
    kind: 'event',
    legacyUuid: event.legacyUuid,
  });
