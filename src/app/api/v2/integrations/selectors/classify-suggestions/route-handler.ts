import { postHandler, selectorRegistryClassifySuggestionsRequestSchema } from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.selectors.classify-suggestions.POST',
  parseJsonBody: true,
  bodySchema: selectorRegistryClassifySuggestionsRequestSchema,
  requireAuth: true,
});
