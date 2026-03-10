import type { SettingRecord, SettingsScope } from '@/shared/contracts/settings';

import { apiFetch, apiPost, ApiResponse } from './base';

export async function fetchSettings(scope: SettingsScope): Promise<ApiResponse<SettingRecord[]>> {
  return apiFetch<SettingRecord[]>(`/api/settings?scope=${scope}`);
}

export async function updateSetting(args: {
  key: string;
  value: string;
  scope: SettingsScope;
}): Promise<ApiResponse<SettingRecord>> {
  return apiPost<SettingRecord>('/api/settings', args);
}
