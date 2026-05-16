'use client';

import { useMemo } from 'react';

import type { ListQuery } from '@/shared/contracts/ui/queries';
import type { Asset3DListFilters, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { api } from '@/shared/lib/api-client';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { viewer3dKeys } from '@/shared/lib/query-key-exports';

const ASSET_LIST_STALE_TIME_MS = 60_000;

const normalizeAsset3DListFilters = (filters: Asset3DListFilters): Asset3DListFilters => {
  const normalizedFilename = typeof filters.filename === 'string' ? filters.filename.trim() : '';
  const normalizedCategory =
    typeof filters.categoryId === 'string' && filters.categoryId.trim().length > 0
      ? filters.categoryId.trim()
      : '';
  const normalizedSearch = typeof filters.search === 'string' ? filters.search.trim() : '';
  const normalizedTags = Array.isArray(filters.tags)
    ? Array.from(
      new Set(filters.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
    ).sort((left, right) => left.localeCompare(right))
    : [];

  const result: Asset3DListFilters = {};
  if (normalizedFilename !== '') result.filename = normalizedFilename;
  if (normalizedCategory !== '') result.categoryId = normalizedCategory;
  if (normalizedSearch !== '') result.search = normalizedSearch;
  if (normalizedTags.length > 0) result.tags = normalizedTags;
  if (typeof filters.isPublic === 'boolean') result.isPublic = filters.isPublic;
  return result;
};

const fetchAssets3D = async (filters: Asset3DListFilters): Promise<Asset3DRecord[]> => {
  const params: Record<string, string> = {};
  if (typeof filters.filename === 'string' && filters.filename !== '') {
    params['filename'] = filters.filename;
  }
  if (typeof filters.categoryId === 'string' && filters.categoryId !== '') {
    params['categoryId'] = filters.categoryId;
  }
  if (typeof filters.search === 'string' && filters.search !== '') {
    params['search'] = filters.search;
  }
  if (filters.isPublic !== undefined) {
    params['isPublic'] = String(filters.isPublic);
  }
  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    params['tags'] = filters.tags.join(',');
  }

  return api.get<Asset3DRecord[]>('/api/assets3d', { params });
};

export function useFileAsset3dList(filters: Asset3DListFilters): ListQuery<Asset3DRecord> {
  const normalizedFilters = useMemo(
    () => normalizeAsset3DListFilters(filters),
    [
      filters.filename,
      filters.categoryId,
      filters.search,
      filters.isPublic,
      Array.isArray(filters.tags) ? filters.tags.join('|') : '',
    ]
  );

  const queryKey = viewer3dKeys.list(normalizedFilters);
  return useListQueryV2({
    queryKey,
    queryFn: () => fetchAssets3D(normalizedFilters),
    staleTime: ASSET_LIST_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'files.hooks.useFileAsset3dList',
      operation: 'list',
      resource: 'viewer3d.assets',
      domain: 'files',
      queryKey,
      tags: ['files', 'viewer3d', 'assets'],
      description: 'Loads viewer3d assets for the file manager.'},
  });
}
