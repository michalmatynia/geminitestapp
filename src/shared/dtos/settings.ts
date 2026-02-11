export interface SettingRecordDto {
  key: string;
  value: string;
}

export type SettingsScopeDto = 'all' | 'light' | 'heavy';
