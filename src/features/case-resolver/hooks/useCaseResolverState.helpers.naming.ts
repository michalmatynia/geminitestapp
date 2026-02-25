import type {
  CaseResolverAssetFile,
  CaseResolverFile,
} from '@/shared/contracts/case-resolver';
import {
  normalizeFolderPath,
} from '../settings';
import { createId } from '../utils/caseResolverUtils';

export const createPlaceholderAssetName = ({
  assets,
  folder,
  baseName,
}: {
  assets: CaseResolverAssetFile[];
  folder: string;
  baseName: string;
}): string => {
  const normalizedBase = baseName.trim() || 'Untitled Asset';
  const normalizedFolder = normalizeFolderPath(folder);
  const namesInFolder = new Set(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => asset.folder === normalizedFolder)
      .map((asset: CaseResolverAssetFile): string => asset.name.trim().toLowerCase())
  );
  if (!namesInFolder.has(normalizedBase.toLowerCase())) return normalizedBase;
  let index = 2;
  while (index < 10_000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!namesInFolder.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }
  return `${normalizedBase}-${createId('dup')}`;
};

export const createUniqueCaseFileName = ({
  files,
  folder,
  baseName,
}: {
  files: CaseResolverFile[];
  folder: string;
  baseName: string;
}): string => {
  const normalizedBase = baseName.trim() || 'Untitled File';
  const normalizedFolder = normalizeFolderPath(folder);
  const namesInFolder = new Set(
    files
      .filter((file: CaseResolverFile): boolean => file.folder === normalizedFolder)
      .map((file: CaseResolverFile): string => file.name.trim().toLowerCase())
  );
  if (!namesInFolder.has(normalizedBase.toLowerCase())) return normalizedBase;
  let index = 2;
  while (index < 10_000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!namesInFolder.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }
  return `${normalizedBase}-${createId('dup')}`;
};
