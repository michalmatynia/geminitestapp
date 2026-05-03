import 'server-only';

import type { Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerDocument, FilemakerDocumentOwnerKind } from '../filemaker-document.types';
import type { FilemakerEvent, FilemakerOrganization } from '../types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_DOCUMENTS_COLLECTION = 'filemaker_documents';

export type FilemakerDocumentMongoDocument = Document & {
  _id: string;
  codeA?: string;
  codeB?: string;
  comment?: string;
  createdAt?: string;
  documentName?: string;
  documentTypeLabel?: string;
  documentTypeValueId?: string;
  expiryDate?: string;
  id: string;
  issueDate?: string;
  issuedBy?: string;
  legacyDocumentTypeUuid?: string;
  legacyOwnerUuid?: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerDocumentOwnerKind;
  ownerName?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type DocumentOwnerReference = {
  id: string;
  kind: FilemakerDocumentOwnerKind;
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

const toFilemakerDocument = (document: FilemakerDocumentMongoDocument): FilemakerDocument => ({
  id: document.id,
  legacyUuid: document.legacyUuid,
  ...optionalStringProp('codeA', document.codeA),
  ...optionalStringProp('codeB', document.codeB),
  ...optionalStringProp('comment', document.comment),
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('documentName', document.documentName),
  ...optionalStringProp('documentTypeLabel', document.documentTypeLabel),
  ...optionalStringProp('documentTypeValueId', document.documentTypeValueId),
  ...optionalStringProp('expiryDate', document.expiryDate),
  ...optionalStringProp('issueDate', document.issueDate),
  ...optionalStringProp('issuedBy', document.issuedBy),
  ...optionalStringProp('legacyDocumentTypeUuid', document.legacyDocumentTypeUuid),
  ...optionalStringProp('legacyOwnerUuid', document.legacyOwnerUuid),
  ...optionalStringProp('ownerId', document.ownerId),
  ...(document.ownerKind !== undefined ? { ownerKind: document.ownerKind } : {}),
  ...optionalStringProp('ownerName', document.ownerName),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

const buildDocumentOwnerFilter = (
  owner: DocumentOwnerReference
): Filter<FilemakerDocumentMongoDocument> => {
  const clauses: Filter<FilemakerDocumentMongoDocument>[] = [
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

export const listMongoFilemakerDocumentsForOwner = async (
  owner: DocumentOwnerReference
): Promise<FilemakerDocument[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerDocumentMongoDocument>(FILEMAKER_DOCUMENTS_COLLECTION)
    .find(buildDocumentOwnerFilter(owner))
    .sort({ updatedAt: -1, createdAt: -1, documentName: 1, id: 1 })
    .toArray();
  return documents.map(toFilemakerDocument);
};

export const listMongoFilemakerDocumentsForOrganization = (
  organization: FilemakerOrganization
): Promise<FilemakerDocument[]> =>
  listMongoFilemakerDocumentsForOwner({
    id: organization.id,
    kind: 'organization',
    legacyUuid: organization.legacyUuid,
  });

export const listMongoFilemakerDocumentsForPerson = (
  person: MongoFilemakerPerson
): Promise<FilemakerDocument[]> =>
  listMongoFilemakerDocumentsForOwner({
    id: person.id,
    kind: 'person',
    legacyUuid: person.legacyUuid,
  });

export const listMongoFilemakerDocumentsForEvent = (
  event: FilemakerEvent & { legacyUuid?: string }
): Promise<FilemakerDocument[]> =>
  listMongoFilemakerDocumentsForOwner({
    id: event.id,
    kind: 'event',
    legacyUuid: event.legacyUuid,
  });
