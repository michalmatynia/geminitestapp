/**
 * FileMaker Organizations API Handler
 * 
 * Provides endpoints for listing and managing organization entities 
 * within the FileMaker subsystem, including support for specialized filtering 
 * and ID-only retrieval.
 */

import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listMongoFilemakerOrganizationIds,
  listMongoFilemakerOrganizations,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

/**
 * Retrieves FileMaker organizations based on provided search filters.
 * Requires active FileMaker Mail Admin session.
 * Supports 'idsOnly' parameter for light-weight ID retrieval.
 */
export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const input = {
    address: url.searchParams.get('address'),
    advancedFilter: url.searchParams.get('advancedFilter'),
    bank: url.searchParams.get('bank'),
    limit: url.searchParams.get('limit'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    parent: url.searchParams.get('parent'),
    query: url.searchParams.get('query'),
    sort: url.searchParams.get('sort'),
    updatedBy: url.searchParams.get('updatedBy'),
  };
  if (url.searchParams.get('idsOnly') === 'true') {
    const ids = await listMongoFilemakerOrganizationIds(input);
    return Response.json({ ids });
  }
  const result = await listMongoFilemakerOrganizations(input);
  return Response.json(result);
}
