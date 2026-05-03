import 'server-only';

import type { Document, Filter } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerBankAccount,
  FilemakerBankAccountOwnerKind,
} from '../filemaker-bank-account.types';
import type { FilemakerEvent, FilemakerOrganization } from '../types';
import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

export const FILEMAKER_BANK_ACCOUNTS_COLLECTION = 'filemaker_bank_accounts';

export type FilemakerBankAccountMongoDocument = Document & {
  _id: string;
  accountNumber: string;
  bankAddress?: string;
  bankName?: string;
  category?: string;
  createdAt?: string;
  currencyLabel?: string;
  currencyValueId?: string;
  displayName?: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  isDefaultForOwner?: boolean;
  isDisplayForOwner?: boolean;
  legacyCurrencyUuid?: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerBankAccountOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
  swift?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type BankAccountOwnerReference = {
  id: string;
  kind: FilemakerBankAccountOwnerKind;
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

const toBankAccount = (document: FilemakerBankAccountMongoDocument): FilemakerBankAccount => ({
  accountNumber: document.accountNumber,
  id: document.id,
  isDefaultForOwner: document.isDefaultForOwner === true,
  isDisplayForOwner: document.isDisplayForOwner === true,
  legacyOwnerUuid: document.legacyOwnerUuid,
  legacyUuid: document.legacyUuid,
  ...optionalStringProp('bankAddress', document.bankAddress),
  ...optionalStringProp('bankName', document.bankName),
  ...optionalStringProp('category', document.category),
  ...optionalStringProp('createdAt', document.createdAt),
  ...optionalStringProp('currencyLabel', document.currencyLabel),
  ...optionalStringProp('currencyValueId', document.currencyValueId),
  ...optionalStringProp('displayName', document.displayName),
  ...optionalStringProp('legacyCurrencyUuid', document.legacyCurrencyUuid),
  ...optionalStringProp('ownerId', document.ownerId),
  ...optionalStringProp('ownerName', document.ownerName),
  ...(document.ownerKind !== undefined ? { ownerKind: document.ownerKind } : {}),
  ...optionalStringProp('swift', document.swift),
  ...optionalStringProp('updatedAt', document.updatedAt),
  ...optionalStringProp('updatedBy', document.updatedBy),
});

const buildBankAccountOwnerFilter = (
  owner: BankAccountOwnerReference
): Filter<FilemakerBankAccountMongoDocument> => {
  const clauses: Filter<FilemakerBankAccountMongoDocument>[] = [
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

export const listMongoFilemakerBankAccountsForOwner = async (
  owner: BankAccountOwnerReference
): Promise<FilemakerBankAccount[]> => {
  const db = await getMongoDb();
  const documents = await db
    .collection<FilemakerBankAccountMongoDocument>(FILEMAKER_BANK_ACCOUNTS_COLLECTION)
    .find(buildBankAccountOwnerFilter(owner))
    .sort({ isDefaultForOwner: -1, isDisplayForOwner: -1, updatedAt: -1, id: 1 })
    .toArray();
  return documents.map(toBankAccount);
};

export const listMongoFilemakerBankAccountsForOrganization = (
  organization: FilemakerOrganization
): Promise<FilemakerBankAccount[]> =>
  listMongoFilemakerBankAccountsForOwner({
    id: organization.id,
    kind: 'organization',
    legacyUuid: organization.legacyUuid,
  });

export const listMongoFilemakerBankAccountsForPerson = (
  person: MongoFilemakerPerson
): Promise<FilemakerBankAccount[]> =>
  listMongoFilemakerBankAccountsForOwner({
    id: person.id,
    kind: 'person',
    legacyUuid: person.legacyUuid,
  });

export const listMongoFilemakerBankAccountsForEvent = (
  event: FilemakerEvent & { legacyUuid?: string }
): Promise<FilemakerBankAccount[]> =>
  listMongoFilemakerBankAccountsForOwner({
    id: event.id,
    kind: 'event',
    legacyUuid: event.legacyUuid,
  });
