import type {
  ChatbotJobActionResponse,
  ChatbotJobsClearResponse,
  ChatbotJobsResponse,
} from '@/shared/contracts/chatbot';
import { api } from '@/shared/lib/api-client';

/**
 * Fetch chatbot jobs with optional scope
 */
export async function getChatbotJobs(scope: string = 'all'): Promise<ChatbotJobsResponse> {
  return api.get<ChatbotJobsResponse>('/api/chatbot/jobs', {
    params: { scope },
  });
}

/**
 * Update a chatbot job
 */
export async function updateChatbotJob(
  jobId: string,
  action: 'retry' | 'cancel'
): Promise<ChatbotJobActionResponse> {
  return api.post<ChatbotJobActionResponse>(`/api/chatbot/jobs/${jobId}`, { action });
}

/**
 * Delete a chatbot job
 */
export async function deleteChatbotJob(jobId: string, force?: boolean): Promise<void> {
  const options: Parameters<typeof api.delete>[1] = {};
  if (force) options.params = { force: 'true' };
  await api.delete(`/api/chatbot/jobs/${jobId}`, options);
}

/**
 * Clear chatbot jobs by scope
 */
export async function clearChatbotJobs(
  scope: string = 'all'
): Promise<ChatbotJobsClearResponse> {
  return api.delete<ChatbotJobsClearResponse>('/api/chatbot/jobs', {
    params: { scope },
  });
}
