export const runtime = 'nodejs';

import {
  postHandler,
  promoteCompanyRequestSchema,
} from '@/app/api/v2/jobs/companies/[companyId]/promote/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.jobs.companies.promote.POST',
  parseJsonBody: true,
  bodySchema: promoteCompanyRequestSchema,
  requireAuth: true,
});
