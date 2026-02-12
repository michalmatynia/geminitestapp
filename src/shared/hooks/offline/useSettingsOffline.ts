import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchSettingsCached,
  invalidateSettingsCache,
} from '@/shared/api/settings-client';
import type { SettingRecordDto } from '@/shared/dtos/settings';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

type SettingRecord = SettingRecordDto;

export interface SettingsOfflineHookResult {
  settings: SettingRecord[] | undefined;
  isLoading: boolean;
  error: Error | null;
  updateSetting: (variables: { key: string; value: string }) => void;
  isUpdating: boolean;
}

export function useSettingsOffline(): SettingsOfflineHookResult {
  const settingsQuery: UseQueryResult<SettingRecord[], Error> = useQuery({
    queryKey: QUERY_KEYS.settings.scope('light'),
    queryFn: async (): Promise<SettingRecord[]> => {
      try {
        return await fetchSettingsCached({ scope: 'light' });
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error('Failed to fetch settings');
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - longer for offline support
    networkMode: 'offlineFirst',
  });

  const updateSettingMutation = useOfflineMutation<SettingRecord, Error, { key: string; value: string }, SettingRecord[]>(
    async ({ key, value }: { key: string; value: string }): Promise<SettingRecord> => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      invalidateSettingsCache();
      return (await res.json()) as SettingRecord;
    },
    {
      queryKey: QUERY_KEYS.settings.scope('light'),
      optimisticUpdate: (oldData: SettingRecord[] | undefined, { key, value }: { key: string; value: string }): SettingRecord[] => {
        if (!Array.isArray(oldData)) return oldData || [];
        const updated = oldData.map((item: SettingRecord) => 
          item.key === key ? { ...item, value } : item
        );
        return updated.some((item: SettingRecord) => item.key === key) 
          ? updated 
          : [...updated, { key, value }];
      },
      successMessage: 'Setting updated successfully',
      errorMessage: 'Failed to update setting',
    }
  );

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSetting: updateSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
  };
}
