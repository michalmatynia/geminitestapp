import { useCallback } from 'react';

import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { type Toast } from '@/shared/contracts/ui';

export function useCaseResolverStateRelatedFilesActions({
  workspace,
  updateWorkspace,
  toast,
}: {
  workspace: CaseResolverWorkspace;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
  toast: Toast;
}) {
  const handleLinkRelatedFiles = useCallback(
    (fileIdA: string, fileIdB: string): void => {
      const normalizedFileIdA = fileIdA.trim();
      const normalizedFileIdB = fileIdB.trim();
      if (!normalizedFileIdA || !normalizedFileIdB || normalizedFileIdA === normalizedFileIdB) {
        return;
      }

      const fileA = workspace.files.find((f: CaseResolverFile) => f.id === normalizedFileIdA);
      const fileB = workspace.files.find((f: CaseResolverFile) => f.id === normalizedFileIdB);
      if (!fileA || !fileB) {
        toast('Cannot link documents because one of them no longer exists.', {
          variant: 'warning',
        });
        return;
      }
      if (fileA.fileType === 'case' || fileB.fileType === 'case') {
        toast('Only documents can be linked in this panel.', { variant: 'info' });
        return;
      }
      if (fileA.isLocked || fileB.isLocked) {
        toast('Unlock both documents before changing links.', { variant: 'warning' });
        return;
      }

      const linkInA = (fileA.relatedFileIds ?? []).includes(normalizedFileIdB);
      const linkInB = (fileB.relatedFileIds ?? []).includes(normalizedFileIdA);
      if (linkInA && linkInB) {
        toast('These documents are already linked.', { variant: 'info' });
        return;
      }
      const now = new Date().toISOString();
      updateWorkspace(
        (current) => {
          const currentFileA =
            current.files.find(
              (file: CaseResolverFile): boolean => file.id === normalizedFileIdA
            ) ?? null;
          const currentFileB =
            current.files.find(
              (file: CaseResolverFile): boolean => file.id === normalizedFileIdB
            ) ?? null;
          if (!currentFileA || !currentFileB) return current;
          if (
            currentFileA.fileType === 'case' ||
            currentFileB.fileType === 'case' ||
            currentFileA.isLocked ||
            currentFileB.isLocked
          ) {
            return current;
          }
          return {
            ...current,
            files: current.files.map((file: CaseResolverFile) => {
              if (file.id === normalizedFileIdA) {
                const existing = file.relatedFileIds ?? [];
                const next = Array.from(new Set([...existing, normalizedFileIdB])).sort(
                  (left, right) => left.localeCompare(right)
                );
                return { ...file, relatedFileIds: next, updatedAt: now };
              }
              if (file.id === normalizedFileIdB) {
                const existing = file.relatedFileIds ?? [];
                const next = Array.from(new Set([...existing, normalizedFileIdA])).sort(
                  (left, right) => left.localeCompare(right)
                );
                return { ...file, relatedFileIds: next, updatedAt: now };
              }
              return file;
            }),
          };
        },
        { persistNow: true, source: 'case_view_link_related_files' }
      );
      const nameA = fileA?.name ?? fileIdA;
      const nameB = fileB?.name ?? fileIdB;
      toast(
        linkInA || linkInB
          ? `Repaired relation link between "${nameA}" and "${nameB}".`
          : `"${nameA}" linked to "${nameB}".`,
        { variant: 'success' }
      );
    },
    [updateWorkspace, workspace.files, toast]
  );

  const handleUnlinkRelatedFile = useCallback(
    (sourceFileId: string, targetFileId: string): void => {
      const normalizedSourceFileId = sourceFileId.trim();
      const normalizedTargetFileId = targetFileId.trim();
      if (
        !normalizedSourceFileId ||
        !normalizedTargetFileId ||
        normalizedSourceFileId === normalizedTargetFileId
      ) {
        return;
      }
      const sourceFile = workspace.files.find(
        (file: CaseResolverFile) => file.id === normalizedSourceFileId
      );
      const targetFile = workspace.files.find(
        (file: CaseResolverFile) => file.id === normalizedTargetFileId
      );
      if (!sourceFile || !targetFile) {
        toast('Cannot unlink documents because one of them no longer exists.', {
          variant: 'warning',
        });
        return;
      }
      if (sourceFile.isLocked || targetFile.isLocked) {
        toast('Unlock both documents before changing links.', { variant: 'warning' });
        return;
      }
      const now = new Date().toISOString();
      updateWorkspace(
        (current) => {
          const currentSourceFile =
            current.files.find(
              (file: CaseResolverFile): boolean => file.id === normalizedSourceFileId
            ) ?? null;
          const currentTargetFile =
            current.files.find(
              (file: CaseResolverFile): boolean => file.id === normalizedTargetFileId
            ) ?? null;
          if (!currentSourceFile || !currentTargetFile) return current;
          if (currentSourceFile.isLocked || currentTargetFile.isLocked) return current;
          return {
            ...current,
            files: current.files.map((file: CaseResolverFile) => {
              if (file.id === normalizedSourceFileId || file.id === normalizedTargetFileId) {
                const otherId =
                  file.id === normalizedSourceFileId
                    ? normalizedTargetFileId
                    : normalizedSourceFileId;
                const next = (file.relatedFileIds ?? []).filter((id: string) => id !== otherId);
                return {
                  ...file,
                  relatedFileIds: next.length > 0 ? next : undefined,
                  updatedAt: now,
                };
              }
              return file;
            }),
          };
        },
        { persistNow: true, source: 'case_view_unlink_related_files' }
      );
    },
    [toast, updateWorkspace, workspace.files]
  );

  return {
    handleLinkRelatedFiles,
    handleUnlinkRelatedFile,
  };
}
