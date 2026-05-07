import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  FILEMAKER_ANYPARAMS_COLLECTION,
  FILEMAKER_ANYTEXTS_COLLECTION,
  FILEMAKER_BANK_ACCOUNTS_COLLECTION,
  FILEMAKER_DOCUMENTS_COLLECTION,
  FILEMAKER_PERSON_OCCUPATIONS_COLLECTION,
  getMongoFilemakerPersonById,
  listMongoFilemakerAnyParamsForPerson,
  listMongoFilemakerAnyTextsForPerson,
  listMongoFilemakerBankAccountsForPerson,
  listMongoFilemakerDocumentsForPerson,
  listMongoFilemakerPersonOccupationsForPerson,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type { MongoFilemakerPerson } from '@/features/filemaker/server/filemaker-persons-mongo';

const linkedRecordKindSchema = z.enum([
  'any-param',
  'any-text',
  'bank-account',
  'document',
  'occupation',
]);

type LinkedRecordKind = z.infer<typeof linkedRecordKindSchema>;

const stringField = z.string().transform((value: string): string => value.trim());
const stringArrayField = z
  .array(z.string())
  .transform((values: string[]): string[] =>
    values.map((value: string): string => value.trim()).filter(Boolean)
  );

const anyTextPatchSchema = z.object({
  text: z.string(),
  updatedBy: stringField.optional(),
});

const valuePatchSchema = z.object({
  label: stringField.optional(),
  legacyValueUuid: stringField,
  level: z.number().int().min(0),
  parentId: stringField.nullable().optional(),
  valueId: stringField.optional(),
});

const textValuePatchSchema = z.object({
  field: stringField,
  slot: z.number().int().min(0),
  value: z.string(),
});

const anyParamPatchSchema = z.object({
  legacyValueUuids: stringArrayField.optional(),
  textValues: z.array(textValuePatchSchema).optional(),
  updatedBy: stringField.optional(),
  valueIds: stringArrayField.optional(),
  values: z.array(valuePatchSchema).optional(),
});

const occupationPatchSchema = z.object({
  legacyValueUuids: stringArrayField.optional(),
  updatedBy: stringField.optional(),
  valueIds: stringArrayField.optional(),
  values: z.array(valuePatchSchema).optional(),
});

const documentPatchSchema = z.object({
  codeA: stringField.optional(),
  codeB: stringField.optional(),
  comment: z.string().optional(),
  documentName: stringField.optional(),
  documentTypeLabel: stringField.optional(),
  documentTypeValueId: stringField.optional(),
  expiryDate: stringField.optional(),
  issueDate: stringField.optional(),
  issuedBy: stringField.optional(),
  legacyDocumentTypeUuid: stringField.optional(),
  updatedBy: stringField.optional(),
});

const bankAccountPatchSchema = z.object({
  accountNumber: stringField.optional(),
  bankAddress: stringField.optional(),
  bankName: stringField.optional(),
  category: stringField.optional(),
  currencyLabel: stringField.optional(),
  currencyValueId: stringField.optional(),
  displayName: stringField.optional(),
  isDefaultForOwner: z.boolean().optional(),
  isDisplayForOwner: z.boolean().optional(),
  legacyCurrencyUuid: stringField.optional(),
  swift: stringField.optional(),
  updatedBy: stringField.optional(),
});

const patchSchemaByKind = {
  'any-param': anyParamPatchSchema,
  'any-text': anyTextPatchSchema,
  'bank-account': bankAccountPatchSchema,
  document: documentPatchSchema,
  occupation: occupationPatchSchema,
} as const;

const collectionByKind: Record<LinkedRecordKind, string> = {
  'any-param': FILEMAKER_ANYPARAMS_COLLECTION,
  'any-text': FILEMAKER_ANYTEXTS_COLLECTION,
  'bank-account': FILEMAKER_BANK_ACCOUNTS_COLLECTION,
  document: FILEMAKER_DOCUMENTS_COLLECTION,
  occupation: FILEMAKER_PERSON_OCCUPATIONS_COLLECTION,
};

const resolveRouteParam = (ctx: ApiHandlerContext, key: string): string => {
  const value = ctx.params[key];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

const resolveRecordKind = (ctx: ApiHandlerContext): LinkedRecordKind =>
  linkedRecordKindSchema.parse(resolveRouteParam(ctx, 'recordKind'));

const loadPerson = async (ctx: ApiHandlerContext): Promise<MongoFilemakerPerson> => {
  const person = await getMongoFilemakerPersonById(resolveRouteParam(ctx, 'personId'));
  if (!person) {
    throw notFoundError('Filemaker person was not found.');
  }
  return person;
};

const listLinkedRecordIds = async (
  kind: LinkedRecordKind,
  person: MongoFilemakerPerson
): Promise<Set<string>> => {
  if (kind === 'any-param') {
    return new Set((await listMongoFilemakerAnyParamsForPerson(person)).map((record) => record.id));
  }
  if (kind === 'any-text') {
    return new Set((await listMongoFilemakerAnyTextsForPerson(person)).map((record) => record.id));
  }
  if (kind === 'bank-account') {
    return new Set((await listMongoFilemakerBankAccountsForPerson(person)).map((record) => record.id));
  }
  if (kind === 'document') {
    return new Set((await listMongoFilemakerDocumentsForPerson(person)).map((record) => record.id));
  }
  return new Set(
    (await listMongoFilemakerPersonOccupationsForPerson(person)).map((record) => record.id)
  );
};

const assertRecordBelongsToPerson = async (
  kind: LinkedRecordKind,
  person: MongoFilemakerPerson,
  recordId: string
): Promise<void> => {
  const linkedRecordIds = await listLinkedRecordIds(kind, person);
  if (!linkedRecordIds.has(recordId)) {
    throw notFoundError('Linked FileMaker record was not found for this person.');
  }
};

const recordFilter = (recordId: string): Record<string, unknown> => ({
  $or: [{ _id: recordId }, { id: recordId }, { legacyUuid: recordId }],
});

const parsePatch = async (
  req: NextRequest,
  kind: LinkedRecordKind
): Promise<Record<string, unknown> | Response> => {
  const schema = patchSchemaByKind[kind];
  const result: JsonParseResult<z.infer<typeof schema>> = await parseJsonBody(req, schema, {
    logPrefix: `filemaker.persons.linked-records.${kind}.PATCH`,
  });
  if (!result.ok) return result.response;
  return result.data;
};

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const kind = resolveRecordKind(ctx);
  const recordId = resolveRouteParam(ctx, 'recordId');
  if (recordId.trim().length === 0) throw badRequestError('recordId is required.');
  const person = await loadPerson(ctx);
  await assertRecordBelongsToPerson(kind, person, recordId);
  const parsedPatch = await parsePatch(req, kind);
  if (parsedPatch instanceof Response) return parsedPatch;

  const patch = {
    ...parsedPatch,
    updatedAt: new Date().toISOString(),
  };
  const db = await getMongoDb();
  const result = await db
    .collection(collectionByKind[kind])
    .updateOne(recordFilter(recordId), { $set: patch });
  if (result.matchedCount === 0) {
    throw notFoundError('Linked FileMaker record was not found.');
  }
  return Response.json({ kind, patch, recordId });
}

export async function deleteHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const kind = resolveRecordKind(ctx);
  const recordId = resolveRouteParam(ctx, 'recordId');
  if (recordId.trim().length === 0) throw badRequestError('recordId is required.');
  const person = await loadPerson(ctx);
  await assertRecordBelongsToPerson(kind, person, recordId);

  const db = await getMongoDb();
  const result = await db.collection(collectionByKind[kind]).deleteOne(recordFilter(recordId));
  if (result.deletedCount === 0) {
    throw notFoundError('Linked FileMaker record was not found.');
  }
  return Response.json({ deleted: true, kind, recordId });
}
