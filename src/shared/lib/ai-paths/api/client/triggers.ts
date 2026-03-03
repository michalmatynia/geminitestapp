import { 
  apiPost, 
  apiPatch,
  apiDelete,
  apiFetch,
  ApiResponse 
} from './base';
import type { 
  AiTriggerButtonRecord,
  AiTriggerButtonCreatePayload,
  AiTriggerButtonUpdatePayload
} from '@/shared/contracts/ai-trigger-buttons';

export async function fetchTriggerButtons(args: {
  entityType: string;
  entityId?: string;
}): Promise<ApiResponse<AiTriggerButtonRecord[]>> {
  const params = new URLSearchParams({ entityType: args.entityType });
  if (args.entityId) params.set('entityId', args.entityId);
  return apiFetch<AiTriggerButtonRecord[]>(`/api/ai/ai-paths/trigger-buttons?${params.toString()}`);
}

export async function createTriggerButton(payload: AiTriggerButtonCreatePayload): Promise<ApiResponse<AiTriggerButtonRecord>> {
  return apiPost<AiTriggerButtonRecord>('/api/ai/ai-paths/trigger-buttons', payload);
}

export async function updateTriggerButton(id: string, payload: AiTriggerButtonUpdatePayload): Promise<ApiResponse<AiTriggerButtonRecord>> {
  return apiPatch<AiTriggerButtonRecord>(`/api/ai/ai-paths/trigger-buttons/${id}`, payload);
}

export async function deleteTriggerButton(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/api/ai/ai-paths/trigger-buttons/${id}`);
}

export async function reorderTriggerButtons(payload: {
  entityType: string;
  entityId?: string;
  buttonIds: string[];
}): Promise<ApiResponse<{ success: boolean }>> {
  return apiPost<{ success: boolean }>('/api/ai/ai-paths/trigger-buttons/reorder', payload);
}
