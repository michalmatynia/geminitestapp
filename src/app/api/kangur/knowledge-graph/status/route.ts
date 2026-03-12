import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'kangur.knowledgeGraph.status.GET',
  resolveSessionUser: false,
  querySchema,
});
