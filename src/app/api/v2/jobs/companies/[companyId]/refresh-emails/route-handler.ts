import {
  jobBoardRefreshCompanyEmailsRequestSchema,
  postHandler,
} from '@/app/api/v2/jobs/companies/[companyId]/refresh-emails/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const runtime = 'nodejs';

export const POST = apiHandler(postHandler, {
  source: 'v2.jobs.companies.refreshEmails.POST',
  parseJsonBody: true,
  bodySchema: jobBoardRefreshCompanyEmailsRequestSchema,
  requireAuth: true,
});
