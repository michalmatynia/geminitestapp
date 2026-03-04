export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, requestSchema } from '@/app/api/v2/integrations/imports/base/handler';

export const POST = apiHandler(POST_handler, {
  source: 'integrations.imports.base.POST',
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: requestSchema,
});
