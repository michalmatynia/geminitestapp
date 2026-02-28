export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postBaseImportsHandler, requestSchema } from './handler';

export const POST = apiHandler(postBaseImportsHandler, {
  source: 'products.imports.base.POST',
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: requestSchema,
});
