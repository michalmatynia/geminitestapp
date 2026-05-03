export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { postHandler, requestSchema } from '@/app/api/v2/integrations/imports/base/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.imports.base.POST',
  requireAuth: true,
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: requestSchema,
});
