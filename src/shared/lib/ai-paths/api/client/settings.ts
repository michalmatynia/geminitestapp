import { apiFetch, apiPost, ApiResponse } from './base';
import type { SettingRecord, SettingsScope } from '@/shared/contracts/settings';

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
