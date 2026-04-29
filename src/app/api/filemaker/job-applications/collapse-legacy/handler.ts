import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  collapseLegacyMongoFilemakerJobApplicationsForListing,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type { JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const collapseLegacyJobApplicationsSchema = z.object({
  jobListingId: z.string().trim().min(1, 'Job listing id is required.'),
  organizationId: z.string().trim().min(1, 'Organization id is required.'),
  personId: z.string().trim().min(1).optional().nullable(),
});

export async function postHandler(req: NextRequest): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof collapseLegacyJobApplicationsSchema>> =
    await parseJsonBody(req, collapseLegacyJobApplicationsSchema, {
      logPrefix: 'filemaker.job-applications.collapse-legacy.POST',
    });
  if (!result.ok) return result.response;

  const collapseResult = await collapseLegacyMongoFilemakerJobApplicationsForListing(result.data);
  return Response.json(collapseResult);
}
