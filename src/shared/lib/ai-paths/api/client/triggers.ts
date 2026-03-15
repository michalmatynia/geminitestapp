import type {
  AiTriggerButtonRecord,
  AiTriggerButtonCreatePayload,
  AiTriggerButtonUpdatePayload,
} from '@/shared/contracts/ai-trigger-buttons';
import type { HttpResult } from '@/shared/contracts/http';

import { apiPost, apiPatch, apiDelete, apiFetch } from './base';

export async function fetchTriggerButtons(args?: {
  entityType?: string;
  entityId?: string;
}): Promise<HttpResult<AiTriggerButtonRecord[]>> {
  const params = new URLSearchParams();
  if (args?.entityType) params.set('entityType', args.entityType);
  if (args?.entityId) params.set('entityId', args.entityId);
  const query = params.toString();
  return apiFetch<AiTriggerButtonRecord[]>(
    query ? `/api/ai-paths/trigger-buttons?${query}` : '/api/ai-paths/trigger-buttons'
  );
}

export async function createTriggerButton(
  payload: AiTriggerButtonCreatePayload
): Promise<HttpResult<AiTriggerButtonRecord>> {
  return apiPost<AiTriggerButtonRecord>('/api/ai-paths/trigger-buttons', payload);
}

export async function updateTriggerButton(
  id: string,
  payload: AiTriggerButtonUpdatePayload
): Promise<HttpResult<AiTriggerButtonRecord>> {
  return apiPatch<AiTriggerButtonRecord>(`/api/ai-paths/trigger-buttons/${id}`, payload);
}

export async function deleteTriggerButton(
  id: string
): Promise<HttpResult<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/api/ai-paths/trigger-buttons/${id}`);
}

export async function reorderTriggerButtons(payload: {
  orderedIds: string[];
}): Promise<HttpResult<AiTriggerButtonRecord[]>> {
  return apiPost<AiTriggerButtonRecord[]>('/api/ai-paths/trigger-buttons/reorder', payload);
}

export async function cleanupFixtureTriggerButtons(): Promise<HttpResult<{
  removedTriggerButtons: number;
  removedPathIndexEntries: number;
  removedPathConfigs: number;
}>> {
  return apiPost<{
    removedTriggerButtons: number;
    removedPathIndexEntries: number;
    removedPathConfigs: number;
  }>('/api/ai-paths/trigger-buttons/cleanup-fixtures', {});
}
