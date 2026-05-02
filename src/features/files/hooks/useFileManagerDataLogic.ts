
import { useMemo, useCallback } from 'react';
import { useFileAsset3dList } from '@/features/files/hooks/useFileAsset3dQueries';
import { useFileQueries } from '@/features/files/hooks/useFileQueries';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import type { Asset3DRecord, Asset3DListFilters } from '@/shared/contracts/viewer3d';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
export interface FileManagerDataLogic {
  files: ExpandedImageFile[];
  visibleFiles: ExpandedImageFile[];
  assets3d: Asset3DRecord[];
  getFileKind: (filepath: string) => 'upload' | 'base64' | 'link' | 'other';
}

export function useFileManagerDataLogic(options: {
  filenameSearch: string;
  productNameSearch: string;
  tagSearchList: string[];
  enableTagSearch: boolean;
  filepathFilter?: (filepath: string) => boolean;
}): FileManagerDataLogic {
  const {
    filenameSearch,
    productNameSearch,
    tagSearchList,
    enableTagSearch,
    filepathFilter,
  } = options;

    const queryParams = useMemo(() => {
      const query = new URLSearchParams();
      if (filenameSearch.length > 0) query.append('filename', filenameSearch);
      if (productNameSearch.length > 0) query.append('productName', productNameSearch);
      if (enableTagSearch && tagSearchList.length > 0) query.append('tags', tagSearchList.join(','));
      return query.toString();
    }, [filenameSearch, productNameSearch, tagSearchList, enableTagSearch]);
  // ... (omitted remaining logic update)


  const { data: files = [] } = useFileQueries(queryParams);

  const visibleFiles = useMemo(
    (): ExpandedImageFile[] =>
      filepathFilter
        ? files.filter((file: ExpandedImageFile) => filepathFilter(file.filepath))
        : files,
    [files, filepathFilter]
  );

  const assetFilters = useMemo<Asset3DListFilters>(() => {
    const filters: Asset3DListFilters = { search: filenameSearch.length > 0 ? filenameSearch : null };
    if (enableTagSearch && tagSearchList.length > 0) {
      filters.tags = tagSearchList;
    }
    return filters;
  }, [enableTagSearch, filenameSearch, tagSearchList]);

  const { data: assets3d = [] } = useFileAsset3dList(assetFilters);

function isBase64(clean: string): boolean {
  return clean.startsWith('data:');
}

function isUrl(clean: string): boolean {
  return /^https?:\/\//i.test(clean);
}

function isUpload(clean: string): boolean {
  return (
    clean.includes('/uploads/') ||
    clean.startsWith('/uploads/') ||
    clean.startsWith('uploads/')
  );
}

export function getFileKind(filepath: string): 'upload' | 'base64' | 'link' | 'other' {
  const clean = (filepath ?? '').trim();
  if (clean === "") return 'other';
  if (isBase64(clean)) return 'base64';
  if (isUrl(clean)) {
    try {
      const url = new URL(clean);
      return url.pathname.includes('/uploads/') ? 'upload' : 'link';
    } catch {
      return 'link';
    }
  }
  if (isUpload(clean)) return 'upload';
  return 'other';
}
  return {
    files,
    visibleFiles,
    assets3d,
    getFileKind,
  };
}
