import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerPersonById,
  listMongoFilemakerAddressesForOwner,
  listMongoFilemakerAnyParamsForPerson,
  listMongoFilemakerAnyTextsForPerson,
  listMongoFilemakerBankAccountsForPerson,
  listMongoFilemakerContractsForPerson,
  listMongoFilemakerDocumentsForPerson,
  listMongoFilemakerPersonOccupationsForPerson,
  listMongoFilemakerWebsitesForPerson,
  requireFilemakerMailAdminSession,
  updateMongoFilemakerPerson,
} from '@/features/filemaker/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const personPatchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const resolvePersonId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['personId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const person = await getMongoFilemakerPersonById(resolvePersonId(ctx));
  if (!person) {
    throw notFoundError('Filemaker person was not found.');
  }
  const [
    linkedAddresses,
    linkedAnyParams,
    linkedAnyTexts,
    linkedBankAccounts,
    linkedContracts,
    linkedDocuments,
    linkedOccupations,
    linkedWebsites,
  ] = await Promise.all([
    listMongoFilemakerAddressesForOwner('person', person.id),
    listMongoFilemakerAnyParamsForPerson(person),
    listMongoFilemakerAnyTextsForPerson(person),
    listMongoFilemakerBankAccountsForPerson(person),
    listMongoFilemakerContractsForPerson(person),
    listMongoFilemakerDocumentsForPerson(person),
    listMongoFilemakerPersonOccupationsForPerson(person),
    listMongoFilemakerWebsitesForPerson(person),
  ]);
  return Response.json({
    linkedAddresses,
    linkedAnyParams,
    linkedAnyTexts,
    linkedBankAccounts,
    linkedContracts,
    linkedDocuments,
    linkedOccupations,
    linkedWebsites,
    person,
  });
}

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof personPatchSchema>> = await parseJsonBody(
    req,
    personPatchSchema,
    { logPrefix: 'filemaker.persons.PATCH' }
  );
  if (!result.ok) {
    return result.response;
  }
  const person = await updateMongoFilemakerPerson(resolvePersonId(ctx), result.data);
  return Response.json({ person });
}
