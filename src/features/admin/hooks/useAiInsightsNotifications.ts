import type { AiInsightNotificationsResponse as NotificationsResponse } from '@/shared/contracts/ai-insights';
import type { DeleteMutation, SingleQuery } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createDeleteMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const aiNotificationsQueryKey = QUERY_KEYS.ai.insights.notifications();

export const useAiInsightsNotifications = (
  params?: { enabled?: boolean } | void
): SingleQuery<NotificationsResponse> =>
  createSingleQueryV2<NotificationsResponse>({
    id: 'ai-insights-notifications',
    queryKey: aiNotificationsQueryKey,
    queryFn: () =>
      api.get<NotificationsResponse>('/api/ai-insights/notifications', { params: { limit: 30 } }),
    enabled: params?.enabled ?? true,
    meta: {
      source: 'admin.hooks.useAiInsightsNotifications',
      operation: 'detail',
      resource: 'ai.insights.notifications',
      domain: 'global',
      queryKey: aiNotificationsQueryKey,
      tags: ['ai', 'insights', 'notifications'],
      description: 'Loads ai insights notifications.'},
  });

export function useClearAiInsightsNotifications(): DeleteMutation<void, void> {
  return createDeleteMutationV2<void, void>({
    mutationFn: () => api.delete<void>('/api/ai-insights/notifications'),
    mutationKey: aiNotificationsQueryKey,
    meta: {
      source: 'admin.hooks.useClearAiInsightsNotifications',
      operation: 'delete',
      resource: 'ai.insights.notifications',
      domain: 'global',
      mutationKey: aiNotificationsQueryKey,
      tags: ['ai', 'insights', 'notifications', 'clear'],
      description: 'Deletes ai insights notifications.'},
    invalidateKeys: [aiNotificationsQueryKey],
  });
}
