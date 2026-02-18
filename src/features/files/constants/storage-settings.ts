export const FILE_STORAGE_SOURCE_SETTING_KEY = 'file_storage_source_v1';
export const FASTCOMET_STORAGE_CONFIG_SETTING_KEY = 'fastcomet_storage_config_v1';

export const fileStorageSourceValues = ['local', 'fastcomet'] as const;

export type FileStorageSource = (typeof fileStorageSourceValues)[number];

export type FastCometStorageConfig = {
  baseUrl: string;
  uploadEndpoint: string;
  deleteEndpoint: string | null;
  authToken: string | null;
  keepLocalCopy: boolean;
  timeoutMs: number;
};
