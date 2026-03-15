import type {
  Asset3DRecord,
  Asset3DUpdateInput,
  Asset3DListFilters,
} from '@/shared/contracts/viewer3d';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const API_BASE = '/api/assets3d';

export async function fetchAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.filename) params['filename'] = filters.filename;
  if (filters?.categoryId) params['categoryId'] = filters.categoryId;
  if (filters?.search) params['search'] = filters.search;
  if (filters?.isPublic !== undefined) params['isPublic'] = String(filters.isPublic);
  if (filters?.tags && filters.tags.length > 0) {
    params['tags'] = filters.tags.join(',');
  }

  return api.get<Asset3DRecord[]>(API_BASE, { params });
}

export async function fetchAsset3DById(id: string): Promise<Asset3DRecord> {
  return api.get<Asset3DRecord>(`${API_BASE}/${id}`);
}

export async function uploadAsset3DFile(
  file: File,
  data?: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  },
  onProgress?: (loaded: number, total?: number) => void
): Promise<Asset3DRecord> {
  const formData = new FormData();
  formData.append('file', file);
  if (data?.name) formData.append('name', data.name);
  if (data?.description) formData.append('description', data.description);
  if (data?.category) formData.append('category', data.category);
  if (data?.tags && data.tags.length > 0) formData.append('tags', data.tags.join(','));
  if (data?.isPublic !== undefined) formData.append('isPublic', String(data.isPublic));

  try {
    const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
    const result = await uploadWithProgress<Asset3DRecord>(API_BASE, {
      formData,
      onProgress,
    });

    if (!result.ok) {
      const data = result.data as { error?: string };
      const error = new Error(data?.error ?? 'Failed to upload 3D asset');
      logClientError(error, { context: { source: 'uploadAsset3DFile', filename: file.name } });
      throw error;
    }

    return result.data;
  } catch (error) {
    logClientError(error);
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

export async function fetchCategories(): Promise<string[]> {
  return api.get<string[]>(`${API_BASE}/categories`);
}

export async function fetchTags(): Promise<string[]> {
  return api.get<string[]>(`${API_BASE}/tags`);
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
