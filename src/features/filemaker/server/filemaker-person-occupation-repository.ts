import 'server-only';

import type { Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerPersonOccupation,
  FilemakerPersonOccupationValue,
} from '../filemaker-person-occupation.types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_PERSON_OCCUPATIONS_COLLECTION = 'filemaker_person_occupations';

export type FilemakerPersonOccupationMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyPersonUuid: string;
  legacyUuid: string;
  legacyValueUuids?: string[];
  personId?: string;
  personName?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
  valueIds?: string[];
  values?: FilemakerPersonOccupationValue[];
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

const toOccupationValue = (value: unknown): FilemakerPersonOccupationValue | null => {
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

const toPersonOccupation = (
  document: FilemakerPersonOccupationMongoDocument
): FilemakerPersonOccupation => {
  const values = Array.isArray(document.values)
    ? document.values
        .map(toOccupationValue)
        .filter((value): value is FilemakerPersonOccupationValue => value !== null)
    : [];
  return {
    id: document.id,
    legacyPersonUuid: document.legacyPersonUuid,
    legacyUuid: document.legacyUuid,
    legacyValueUuids: documentStringArray(document.legacyValueUuids),
    valueIds: documentStringArray(document.valueIds),
    values,
    ...optionalStringProp('createdAt', document.createdAt),
    ...optionalStringProp('createdBy', document.createdBy),
    ...optionalStringProp('personId', document.personId),
    ...optionalStringProp('personName', document.personName),
    ...optionalStringProp('updatedAt', document.updatedAt),
    ...optionalStringProp('updatedBy', document.updatedBy),
  };
};

const buildPersonOccupationFilter = (
  person: MongoFilemakerPerson
): Filter<FilemakerPersonOccupationMongoDocument> => {
  const clauses: Filter<FilemakerPersonOccupationMongoDocument>[] = [{ personId: person.id }];
  const legacyUuid = person.legacyUuid?.trim() ?? '';
  if (legacyUuid.length > 0) {
    clauses.push(
      { legacyPersonUuid: legacyUuid },
      { personId: { $exists: false }, legacyPersonUuid: legacyUuid }
    );
  }
  return { $or: clauses };
};

export const listMongoFilemakerPersonOccupationsForPerson = async (
  person: MongoFilemakerPerson
): Promise<FilemakerPersonOccupation[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerPersonOccupationMongoDocument>(FILEMAKER_PERSON_OCCUPATIONS_COLLECTION)
    .find(buildPersonOccupationFilter(person))
    .sort({ updatedAt: -1, createdAt: -1, id: 1 })
    .toArray();
  return documents.map(toPersonOccupation);
};
