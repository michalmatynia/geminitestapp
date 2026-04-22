export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, querySchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'ai-paths.portable-engine.remediation-webhook.POST',
  requireCsrf: false,
  querySchema,
});
