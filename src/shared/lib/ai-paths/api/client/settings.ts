import type { SettingRecord, SettingsScope } from '@/shared/contracts/settings';
import type { HttpResult } from '@/shared/contracts/http';

import { apiFetch, apiPost } from './base';

export async function fetchSettings(scope: SettingsScope): Promise<HttpResult<SettingRecord[]>> {
  return apiFetch<SettingRecord[]>(`/api/settings?scope=${scope}`);
}

export async function updateSetting(args: {
  key: string;
  value: string;
  scope: SettingsScope;
}): Promise<HttpResult<SettingRecord>> {
  return apiPost<SettingRecord>('/api/settings', args);
}
