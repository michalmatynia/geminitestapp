import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerOrganizationById,
  listMongoFilemakerContactLogsForOrganization,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

const resolveOrganizationId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['organizationId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const organization = await getMongoFilemakerOrganizationById(resolveOrganizationId(ctx));
  if (!organization) {
    throw notFoundError('Filemaker organization was not found.');
  }
  const url = new URL(req.url);
  const result = await listMongoFilemakerContactLogsForOrganization(organization, {
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    query: url.searchParams.get('query'),
  });
  return Response.json(result);
}
