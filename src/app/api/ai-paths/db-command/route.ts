export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postAiPathsDbActionHandler } from './handler';

export const POST = apiHandler(postAiPathsDbActionHandler, {
  source: 'ai-paths.db-command',
});
