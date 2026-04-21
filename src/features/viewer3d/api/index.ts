import type {
  Asset3DRecord,
  Asset3DUpdateInput,
  Asset3DListFilters,
} from '@/shared/contracts/viewer3d';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const API_BASE = '/api/assets3d';

 
function appendFilterToParams(params: Record<string, string>, filters: Asset3DListFilters): void {
  if (filters.filename !== undefined && filters.filename !== '') {
    // eslint-disable-next-line no-param-reassign
    params['filename'] = filters.filename;
  }
  if (filters.categoryId !== undefined && filters.categoryId !== '') {
    // eslint-disable-next-line no-param-reassign
    params['categoryId'] = filters.categoryId;
  }
  if (filters.search !== undefined && filters.search !== '') {
    // eslint-disable-next-line no-param-reassign
    params['search'] = filters.search;
  }
  if (filters.isPublic !== undefined) {
    // eslint-disable-next-line no-param-reassign
    params['isPublic'] = String(filters.isPublic);
  }
  if (filters.tags !== undefined && filters.tags.length > 0) {
    // eslint-disable-next-line no-param-reassign
    params['tags'] = filters.tags.join(',');
  }
}

export async function fetchAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const params: Record<string, string> = {};
  if (filters !== undefined) {
    appendFilterToParams(params, filters);
  }

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
}

function appendAssetDataToFormData(formData: FormData, data: UploadAssetData): void {
  if (data.name !== undefined && data.name !== '') {
    formData.append('name', data.name);
  }
  if (data.description !== undefined && data.description !== '') {
    formData.append('description', data.description);
  }
  if (data.category !== undefined && data.category !== '') {
    formData.append('category', data.category);
  }
  if (data.tags !== undefined && data.tags.length > 0) {
    formData.append('tags', data.tags.join(','));
  }
  if (data.isPublic !== undefined) {
    formData.append('isPublic', String(data.isPublic));
  }
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
