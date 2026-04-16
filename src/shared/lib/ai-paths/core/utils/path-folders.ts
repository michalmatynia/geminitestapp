import type { PathMeta } from '@/shared/contracts/ai-paths';
import {
  canMoveTreePath,
  normalizeTreePath,
  rebaseTreePath,
} from '@/shared/utils/tree-operations';

export const normalizeAiPathFolderPath = (value: unknown): string =>
  typeof value === 'string' ? normalizeTreePath(value) : '';

export const normalizeAiPathMetaFolderPath = <T extends Pick<PathMeta, 'folderPath'>>(
  meta: T
): T => ({
  ...meta,
  folderPath: normalizeAiPathFolderPath(meta.folderPath),
});

export const canMoveAiPathFolder = (sourcePath: string, targetPath: string): boolean =>
  canMoveTreePath(sourcePath, targetPath);

export const rebaseAiPathFolderPath = (
  folderPath: string,
  sourcePath: string,
  targetPath: string
): string => rebaseTreePath(folderPath, sourcePath, targetPath);
