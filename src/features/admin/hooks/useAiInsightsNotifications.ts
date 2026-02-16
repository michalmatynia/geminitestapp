'use client';

import { createQueryHook, createDeleteMutation } from '@/shared/lib/api-hooks';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiInsightNotification } from '@/shared/types/ai-insights';

export type NotificationsResponse = { notifications: AiInsightNotification[] };

export const aiNotificationsQueryKey = QUERY_KEYS.ai.insights.notifications();

export const useAiInsightsNotifications = createQueryHook<NotificationsResponse, { enabled?: boolean } | void>({
  queryKeyFactory: () => aiNotificationsQueryKey,
  endpoint: '/api/ai-insights/notifications',
  apiOptions: { params: { limit: 30 } },
});

export function useClearAiInsightsNotifications() {
  return createDeleteMutation<void, void>({
    endpoint: '/api/ai-insights/notifications',
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: aiNotificationsQueryKey });
    },
  })();
}
