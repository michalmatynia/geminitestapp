'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiInsightNotification } from '@/shared/types/ai-insights';

export type NotificationsResponse = { notifications: AiInsightNotification[] };

export const aiNotificationsQueryKey = QUERY_KEYS.ai.insights.notifications();

export function useAiInsightsNotifications(options: { enabled?: boolean } = {}): UseQueryResult<NotificationsResponse, Error> {
  return useQuery<NotificationsResponse, Error>({
    queryKey: aiNotificationsQueryKey,
    queryFn: async () => {
      const data = await api.get<NotificationsResponse>('/api/ai-insights/notifications', {
        params: { limit: 30 }
      });
      return {
        notifications: data?.notifications ?? []
      };
    },
    enabled: options.enabled ?? true,
  });
}

export function useClearAiInsightsNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete('/api/ai-insights/notifications'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiNotificationsQueryKey });
    },
  });
}
