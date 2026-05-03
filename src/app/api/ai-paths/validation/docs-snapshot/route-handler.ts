export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'ai-paths.validation.docs-snapshot.GET',
});
