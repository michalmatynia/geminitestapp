import { postHandler, selectorRegistryProbeRequestSchema } from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.selectors.probe.POST',
  parseJsonBody: true,
  bodySchema: selectorRegistryProbeRequestSchema,
  requireAuth: true,
});
