import {
  deleteHandler,
  postHandler,
  selectorRegistryProbeSessionDeleteRequestSchema,
  selectorRegistryProbeSessionSaveRequestSchema,
} from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.selectors.probe-sessions.POST',
  parseJsonBody: true,
  bodySchema: selectorRegistryProbeSessionSaveRequestSchema,
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'v2.integrations.selectors.probe-sessions.DELETE',
  parseJsonBody: true,
  bodySchema: selectorRegistryProbeSessionDeleteRequestSchema,
  requireAuth: true,
});
