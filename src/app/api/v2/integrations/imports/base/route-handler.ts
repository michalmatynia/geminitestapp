export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { POST_handler, requestSchema } from '@/app/api/v2/integrations/imports/base/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.imports.base.POST',
  requireAuth: true,
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: requestSchema,
});
