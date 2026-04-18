import {
  deleteHandler,
  patchHandler,
  postHandler,
  putHandler,
  selectorRegistryProbeSessionArchiveRequestSchema,
  selectorRegistryProbeSessionDeleteRequestSchema,
  selectorRegistryProbeSessionRestoreRequestSchema,
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

export const PATCH = apiHandler(patchHandler, {
  source: 'v2.integrations.selectors.probe-sessions.PATCH',
  parseJsonBody: true,
  bodySchema: selectorRegistryProbeSessionArchiveRequestSchema,
  requireAuth: true,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.integrations.selectors.probe-sessions.PUT',
  parseJsonBody: true,
  bodySchema: selectorRegistryProbeSessionRestoreRequestSchema,
  requireAuth: true,
});
