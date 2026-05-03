import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  listFilemakerOrganizationEmailLog,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

const resolveOrganizationId = (params: { organizationId: string | string[] }): string => {
  const raw = Array.isArray(params.organizationId)
    ? (params.organizationId[0] ?? '')
    : params.organizationId;
  return decodeURIComponent(raw);
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { organizationId: string | string[] }
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const organizationId = resolveOrganizationId(params);
  const result = await listFilemakerOrganizationEmailLog({ organizationId });
  return Response.json(result);
}
