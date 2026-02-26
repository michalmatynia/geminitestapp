export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler } from './handler';

export const DELETE = apiHandler(DELETE_handler, {
  source: 'agentcreator.teaching.documents.DELETE',
});
