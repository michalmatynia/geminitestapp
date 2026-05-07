/**
 * File Handling Constants
 * 
 * Configuration constants for file upload and storage systems.
 * Provides:
 * - File size limits for different content types
 * - Allowed MIME types and validation rules
 * - Storage backend configuration keys
 * - File storage source definitions
 * - Cloud storage provider settings
 */

export const tempFolderName = 'temp';

export const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30MB
export const MAX_STUDIO_IMAGE_BYTES = 100 * 1024 * 1024; // 100MB
export const ALLOWED_MIME_EXACT = new Set(['application/pdf', 'application/octet-stream']);

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
  resolveIp?: string | null;
};
