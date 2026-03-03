import { 
  apiFetch, 
  apiPost, 
  ApiResponse 
} from './base';
import type { 
  SettingRecordDto, 
  SettingsScopeDto 
} from '@/shared/contracts/settings';

export async function fetchSettings(scope: SettingsScopeDto): Promise<ApiResponse<SettingRecordDto[]>> {
  return apiFetch<SettingRecordDto[]>(`/api/settings?scope=${scope}`);
}

export async function updateSetting(args: {
  key: string;
  value: string;
  scope: SettingsScopeDto;
}): Promise<ApiResponse<SettingRecordDto>> {
  return apiPost<SettingRecordDto>('/api/settings', args);
}
