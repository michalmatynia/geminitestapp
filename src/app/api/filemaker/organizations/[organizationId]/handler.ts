import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerOrganizationById,
  listMongoFilemakerEmailsForOrganization,
  listMongoFilemakerEventsForOrganization,
  listMongoFilemakerPersonsForOrganization,
  listMongoFilemakerWebsitesForOrganization,
  requireFilemakerMailAdminSession,
  updateMongoFilemakerOrganization,
} from '@/features/filemaker/server';
import {
  listMongoFilemakerAddressesForOrganization,
  updateMongoFilemakerAddressesForOrganization,
} from '@/features/filemaker/server/filemaker-organizations-mongo';
import {
  listMongoFilemakerDemandsForOrganization,
  listMongoFilemakerHarvestProfilesForOrganization,
} from '@/features/filemaker/server/filemaker-organization-imported-metadata';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const organizationAddressPatchSchema = z.object({
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

const organizationPatchSchema = z.object({
  addressId: z.string().optional(),
  addresses: z.array(organizationAddressPatchSchema).optional(),
  city: z.string().optional(),
  cooperationStatus: z.string().optional(),
  country: z.string().optional(),
  countryId: z.string().optional(),
  establishedDate: z.string().nullable().optional(),
  krs: z.string().optional(),
  name: z.string().optional(),
  postalCode: z.string().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  taxId: z.string().optional(),
  tradingName: z.string().optional(),
});

const resolveOrganizationId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['organizationId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const organization = await getMongoFilemakerOrganizationById(resolveOrganizationId(ctx));
  if (!organization) {
    throw notFoundError('Filemaker organization was not found.');
  }
  const [
    harvestProfiles,
    importedDemands,
    linkedAddresses,
    linkedEmails,
    linkedEvents,
    linkedPersons,
    linkedWebsites,
  ] =
    await Promise.all([
      listMongoFilemakerHarvestProfilesForOrganization(organization),
      listMongoFilemakerDemandsForOrganization(organization),
      listMongoFilemakerAddressesForOrganization(organization),
      listMongoFilemakerEmailsForOrganization(organization),
      listMongoFilemakerEventsForOrganization(organization),
      listMongoFilemakerPersonsForOrganization(organization),
      listMongoFilemakerWebsitesForOrganization(organization),
    ]);
  return Response.json({
    harvestProfiles,
    importedDemands,
    linkedAddresses,
    linkedEmails,
    linkedEvents,
    linkedPersons,
    linkedWebsites,
    organization,
  });
}

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof organizationPatchSchema>> = await parseJsonBody(
    req,
    organizationPatchSchema,
    { logPrefix: 'filemaker.organizations.PATCH' }
  );
  if (!result.ok) {
    return result.response;
  }
  const { addresses, ...organizationPatch } = result.data;
  const organization = await updateMongoFilemakerOrganization(
    resolveOrganizationId(ctx),
    organizationPatch
  );
  const linkedAddresses =
    addresses === undefined
      ? undefined
      : await updateMongoFilemakerAddressesForOrganization(organization, addresses);
  return Response.json({ linkedAddresses, organization });
}
