import { normalizeFolderPath } from '../../settings';

export const folderBaseName = (path: string): string => {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return '';
  if (!normalized.includes('/')) return normalized;
  return normalized.slice(normalized.lastIndexOf('/') + 1);
};

export const isPathWithinFolder = (candidatePath: string, folderPath: string): boolean => {
  const normalizedCandidatePath = normalizeFolderPath(candidatePath);
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  if (!normalizedFolderPath) return false;
  return (
    normalizedCandidatePath === normalizedFolderPath ||
    normalizedCandidatePath.startsWith(`${normalizedFolderPath}/`)
  );
};

export const createUniqueFolderPath = (
  existingFolders: string[],
  targetFolderPath: string | null
): string => {
  const parent = normalizeFolderPath(targetFolderPath ?? '');
  const existing = new Set(existingFolders.map((folder: string) => normalizeFolderPath(folder)));
  const baseName = 'new-folder';

  let index = 1;
  while (index < 10000) {
    const candidateName = index === 1 ? baseName : `${baseName}-${index}`;
    const candidatePath = normalizeFolderPath(
      parent ? `${parent}/${candidateName}` : candidateName
    );
    if (candidatePath && !existing.has(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }

  return normalizeFolderPath(
    parent ? `${parent}/${baseName}-${Date.now()}` : `${baseName}-${Date.now()}`
  );
};
