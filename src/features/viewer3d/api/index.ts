/**
 * 3D Assets API Client
 * 
 * Client-side API functions for 3D asset management operations.
 * Provides:
 * - Asset CRUD operations (create, read, update, delete)
 * - Asset listing with filtering and pagination
 * - Category and tag management
 * - File upload and reindexing operations
 * - Error handling and logging integration
 */

import type {
  Asset3DRecord,
  Asset3DUpdateInput,
  Asset3DListFilters,
} from '@/shared/contracts/viewer3d';
import type { FileStorageProfile } from '@/shared/lib/files/constants';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

/** Base API path for 3D assets endpoints */
const API_BASE = '/api/assets3d';

/**
 * Builds URL query parameters from asset list filters
 * @param filters - Filter criteria for asset listing
 * @returns Record of query parameters for API requests
 */
function buildFilterParams(filters: Asset3DListFilters): Record<string, string> {
  /** Initialize empty parameters object */
  const params: Record<string, string> = {};
  
  /** Define filter entries with optional values */
  const entries: Array<[string, string | undefined]> = [
    ['filename', filters.filename],
    ['categoryId', filters.categoryId ?? undefined],
    ['search', filters.search ?? undefined],
    ['isPublic', filters.isPublic !== undefined ? String(filters.isPublic) : undefined],
    ['tags', filters.tags !== undefined && filters.tags.length > 0 ? filters.tags.join(',') : undefined],
    ['storageProfile', filters.storageProfile],
  ];

  entries.forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params[key] = value;
    }
  });

  return params;
}

export async function fetchAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const params = filters !== undefined ? buildFilterParams(filters) : {};
  return api.get<Asset3DRecord[]>(API_BASE, { params });
}

export async function fetchAsset3DById(id: string): Promise<Asset3DRecord> {
  return api.get<Asset3DRecord>(`${API_BASE}/${id}`);
}

interface UploadAssetData {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  storageProfile?: FileStorageProfile;
  replaceAssetId?: string;
}

function appendAssetDataToFormData(formData: FormData, data: UploadAssetData): void {
  const entries: Array<[string, string | undefined]> = [
    ['name', data.name],
    ['description', data.description],
    ['category', data.category],
    ['tags', data.tags !== undefined && data.tags.length > 0 ? data.tags.join(',') : undefined],
    ['isPublic', data.isPublic !== undefined ? String(data.isPublic) : undefined],
    ['storageProfile', data.storageProfile],
    ['replaceAssetId', data.replaceAssetId],
  ];

  entries.forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      formData.append(key, value);
    }
  });
}


export async function uploadAsset3DFile(
  file: File,
  data?: UploadAssetData,
  onProgress?: (loaded: number, total?: number) => void
): Promise<Asset3DRecord> {
  const formData = new FormData();
  formData.append('file', file);
  if (data !== undefined) {
    appendAssetDataToFormData(formData, data);
  }

  try {
    const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
    const result = await uploadWithProgress<Asset3DRecord>(API_BASE, {
      formData,
      onProgress,
    });

    if (!result.ok) {
      const errorData = result.data as { error?: string };
      const error = new Error(errorData.error ?? 'Failed to upload 3D asset');
      logClientError(error, { context: { source: 'uploadAsset3DFile', filename: file.name } });
      throw error;
    }

    return result.data;
  } catch (error) {
    logClientError(error as Error, {
      context: { source: 'uploadAsset3DFile', filename: file.name },
    });
    throw error;
  }
}

export async function updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord> {
  return api.patch<Asset3DRecord>(`${API_BASE}/${id}`, data);
}

export async function deleteAsset3DById(id: string): Promise<void> {
  await api.delete(`${API_BASE}/${id}`);
}

export async function convertMilkbarModelLinkToAsset3D(data: {
  name?: string;
  tags?: string[];
  url: string;
}): Promise<Asset3DRecord> {
  const result = await api.post<{ asset: Asset3DRecord }>(
    `${API_BASE}/milkbar/link-to-file`,
    data
  );
  return result.asset;
}

export async function uploadMilkbarAsset3DToFastComet(id: string): Promise<Asset3DRecord> {
  const result = await api.post<{ asset: Asset3DRecord }>(
    `${API_BASE}/${encodeURIComponent(id)}/upload-to-fastcomet`
  );
  return result.asset;
}

export async function fetchCategories(storageProfile?: FileStorageProfile): Promise<string[]> {
  return api.get<string[]>(
    `${API_BASE}/categories`,
    storageProfile !== undefined ? { params: { storageProfile } } : undefined
  );
}

export async function fetchTags(storageProfile?: FileStorageProfile): Promise<string[]> {
  return api.get<string[]>(
    `${API_BASE}/tags`,
    storageProfile !== undefined ? { params: { storageProfile } } : undefined
  );
}

export async function reindexAssets3DFromDisk(): Promise<{
  diskFiles: number;
  supportedFiles: number;
  existingRecords: number;
  created: number;
  skipped: number;
  createdIds: string[];
}> {
  return api.post<{
    diskFiles: number;
    supportedFiles: number;
    existingRecords: number;
    created: number;
    skipped: number;
    createdIds: string[];
  }>(`${API_BASE}/reindex`);
}
