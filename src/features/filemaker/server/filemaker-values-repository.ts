import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerValue,
  FilemakerValueParameter,
  FilemakerValueParameterLink,
} from '../types';

export const FILEMAKER_VALUES_COLLECTION = 'filemaker_values';
export const FILEMAKER_VALUE_PARAMETERS_COLLECTION = 'filemaker_value_parameters';
export const FILEMAKER_VALUE_PARAMETER_LINKS_COLLECTION = 'filemaker_value_parameter_links';

export type FilemakerValueCatalog = {
  parameters: FilemakerValueParameter[];
  parameterLinks: FilemakerValueParameterLink[];
  values: FilemakerValue[];
};

type MongoFilemakerValueDocument = Document & FilemakerValue & {
  _id: string;
  importSourceKind?: string;
  importedAt?: Date;
  schemaVersion?: 1;
};

type MongoFilemakerValueParameterDocument = Document & FilemakerValueParameter & {
  _id: string;
  importSourceKind?: string;
  importedAt?: Date;
  schemaVersion?: 1;
};

type MongoFilemakerValueParameterLinkDocument = Document & FilemakerValueParameterLink & {
  _id: string;
  importSourceKind?: string;
  importedAt?: Date;
  schemaVersion?: 1;
};

type FilemakerValueCollections = {
  links: Collection<MongoFilemakerValueParameterLinkDocument>;
  parameters: Collection<MongoFilemakerValueParameterDocument>;
  values: Collection<MongoFilemakerValueDocument>;
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

const optionalStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .map(optionalDocumentString)
    .filter((entry: string | undefined): entry is string => entry !== undefined);
  return values.length > 0 ? values : undefined;
};

const toFilemakerValue = (document: MongoFilemakerValueDocument): FilemakerValue => ({
  id: document.id,
  label: document.label,
  parentId: document.parentId ?? null,
  sortOrder: typeof document.sortOrder === 'number' ? document.sortOrder : 0,
  value: document.value,
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('description', document.description),
  ...optionalStringProp('legacyUuid', document.legacyUuid),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('createdBy', document.createdBy),
  ...optionalStringProp('updatedBy', document.updatedBy),
  ...(optionalStringArray(document.legacyParentUuids) !== undefined
    ? { legacyParentUuids: optionalStringArray(document.legacyParentUuids) }
    : {}),
  ...(optionalStringArray(document.legacyListUuids) !== undefined
    ? { legacyListUuids: optionalStringArray(document.legacyListUuids) }
    : {}),
});

const toFilemakerValueParameter = (
  document: MongoFilemakerValueParameterDocument
): FilemakerValueParameter => ({
  id: document.id,
  label: document.label,
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('description', document.description),
  ...optionalStringProp('legacyUuid', document.legacyUuid),
  ...optionalStringProp('updatedAt', document.updatedAt),
});

const toFilemakerValueParameterLink = (
  document: MongoFilemakerValueParameterLinkDocument
): FilemakerValueParameterLink => ({
  id: document.id,
  parameterId: document.parameterId,
  valueId: document.valueId,
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('legacyParameterUuid', document.legacyParameterUuid),
  ...optionalStringProp('legacyValueUuid', document.legacyValueUuid),
  ...optionalStringProp('updatedAt', document.updatedAt),
});

export const getMongoFilemakerValueCollections =
  async (): Promise<FilemakerValueCollections> => {
    const db = await getMongoDb();
    return {
      links: db.collection<MongoFilemakerValueParameterLinkDocument>(
        FILEMAKER_VALUE_PARAMETER_LINKS_COLLECTION
      ),
      parameters: db.collection<MongoFilemakerValueParameterDocument>(
        FILEMAKER_VALUE_PARAMETERS_COLLECTION
      ),
      values: db.collection<MongoFilemakerValueDocument>(FILEMAKER_VALUES_COLLECTION),
    };
  };

export const ensureMongoFilemakerValueIndexes = async (
  collections: FilemakerValueCollections
): Promise<void> => {
  await Promise.all([
    collections.values.createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_values_legacy_uuid',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
      }
    ),
    collections.values.createIndex({ parentId: 1, sortOrder: 1, label: 1 }, {
      name: 'filemaker_values_parent_sort',
    }),
    collections.parameters.createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_value_parameters_legacy_uuid',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
      }
    ),
    collections.links.createIndex(
      { valueId: 1, parameterId: 1 },
      { name: 'filemaker_value_parameter_links_value_parameter', unique: true }
    ),
    collections.links.createIndex(
      { legacyValueUuid: 1 },
      {
        name: 'filemaker_value_parameter_links_legacy_value_uuid',
        partialFilterExpression: { legacyValueUuid: { $type: 'string' } },
      }
    ),
  ]);
};

export const listMongoFilemakerValueCatalog =
  async (): Promise<FilemakerValueCatalog> => {
    const collections = await getMongoFilemakerValueCollections();
    const [values, parameters, parameterLinks] = await Promise.all([
      collections.values.find({}).sort({ sortOrder: 1, label: 1, _id: 1 }).toArray(),
      collections.parameters.find({}).sort({ label: 1, _id: 1 }).toArray(),
      collections.links.find({}).sort({ valueId: 1, parameterId: 1, _id: 1 }).toArray(),
    ]);
    return {
      parameters: parameters.map(toFilemakerValueParameter),
      parameterLinks: parameterLinks.map(toFilemakerValueParameterLink),
      values: values.map(toFilemakerValue),
    };
  };

