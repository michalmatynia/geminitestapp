'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { AiInsightNotification } from '@/shared/types/ai-insights';

export type NotificationsResponse = { notifications: AiInsightNotification[] };

export const aiNotificationsQueryKey = ['ai-insights', 'notifications'] as const;

export function useAiInsightsNotifications(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: aiNotificationsQueryKey,
    queryFn: () => 
      api.get<NotificationsResponse>('/api/ai-insights/notifications', {
        params: { limit: 30 }
      }),
    enabled: options.enabled,
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
