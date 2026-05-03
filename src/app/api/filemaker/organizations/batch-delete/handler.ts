import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  deleteMongoFilemakerOrganizations,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type { JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const batchDeleteOrganizationsSchema = z.object({
  organizationIds: z.array(z.string().trim().min(1)).min(1).max(1000),
});

export async function postHandler(req: NextRequest): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof batchDeleteOrganizationsSchema>> =
    await parseJsonBody(req, batchDeleteOrganizationsSchema, {
      logPrefix: 'filemaker.organizations.batch-delete.POST',
    });
  if (!result.ok) return result.response;

  return Response.json(
    await deleteMongoFilemakerOrganizations(result.data.organizationIds)
  );
}
