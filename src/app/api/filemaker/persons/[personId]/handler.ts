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
  listMongoFilemakerEmailsForPerson,
  listMongoFilemakerPersonOccupationsForPerson,
  listMongoFilemakerWebsitesForPerson,
  requireFilemakerMailAdminSession,
  updateMongoFilemakerAddressesForOwner,
  updateMongoFilemakerPerson,
} from '@/features/filemaker/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const personProfileEducationPatchSchema = z.object({
  id: z.string().optional(),
  degree: z.string(),
  institution: z.string(),
  period: z.string(),
  description: z.string().optional(),
});

const personProfileJobExperiencePatchSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  organization: z.string(),
  period: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

const personAddressPatchSchema = z.object({
  addressId: z.string(),
  city: z.string(),
  country: z.string().optional(),
  countryId: z.string().optional(),
  countryValueId: z.string().optional(),
  countryValueLabel: z.string().optional(),
  isDefault: z.boolean(),
  legacyCountryUuid: z.string().optional(),
  legacyUuid: z.string().optional(),
  postalCode: z.string(),
  street: z.string(),
  streetNumber: z.string(),
});

const personPatchSchema = z.object({
  addressId: z.string().optional(),
  addresses: z.array(personAddressPatchSchema).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  countryId: z.string().optional(),
  cvCoreStrengths: z.array(z.string()).optional(),
  cvHeadline: z.string().optional(),
  cvProfessionalSummary: z.string().optional(),
  cvSelectedTechnicalEnvironment: z.array(z.string()).optional(),
  firstName: z.string().optional(),
  githubUrl: z.string().optional(),
  lastName: z.string().optional(),
  linkedinUrl: z.string().optional(),
  postalCode: z.string().optional(),
  profileEducation: z.array(personProfileEducationPatchSchema).optional(),
  profileJobExperience: z.array(personProfileJobExperiencePatchSchema).optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
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
    linkedEmails,
    linkedOccupations,
    linkedWebsites,
  ] = await Promise.all([
    listMongoFilemakerAddressesForOwner('person', person.id),
    listMongoFilemakerAnyParamsForPerson(person),
    listMongoFilemakerAnyTextsForPerson(person),
    listMongoFilemakerBankAccountsForPerson(person),
    listMongoFilemakerContractsForPerson(person),
    listMongoFilemakerDocumentsForPerson(person),
    listMongoFilemakerEmailsForPerson(person),
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
    linkedEmails,
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
  const { addresses, ...personPatch } = result.data;
  const person = await updateMongoFilemakerPerson(resolvePersonId(ctx), personPatch);
  const linkedAddresses =
    addresses === undefined
      ? undefined
      : await updateMongoFilemakerAddressesForOwner('person', person.id, addresses);
  return Response.json({ linkedAddresses, person });
}
