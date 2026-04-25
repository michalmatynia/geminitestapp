import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerOrganizationById,
  listMongoFilemakerEmailsForOrganization,
  requireFilemakerMailAdminSession,
  updateMongoFilemakerOrganization,
} from '@/features/filemaker/server';
import { listMongoFilemakerAddressesForOrganization } from '@/features/filemaker/server/filemaker-organizations-mongo';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const organizationPatchSchema = z.object({
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
  const [linkedAddresses, linkedEmails] = await Promise.all([
    listMongoFilemakerAddressesForOrganization(organization),
    listMongoFilemakerEmailsForOrganization(organization),
  ]);
  return Response.json({ linkedAddresses, linkedEmails, organization });
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
  const organization = await updateMongoFilemakerOrganization(
    resolveOrganizationId(ctx),
    result.data
  );
  return Response.json({ organization });
}
