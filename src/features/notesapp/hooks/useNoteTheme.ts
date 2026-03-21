import { useMemo, useCallback } from 'react';

import { findFolderById } from '@/features/foldertree';
import type { UseNoteThemeProps } from '@/shared/contracts/notes';
import type { NoteWithRelations, NotebookRecord, ThemeRecord } from '@/shared/contracts/notes';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function useNoteTheme({
  themes,
  notebook,
  folderTree,
  selectedFolderId,
  selectedNotebookId,
  selectedNote,
  fetchFolderTree,
  setNotebook,
}: UseNoteThemeProps): {
  getThemeForNote: (note: NoteWithRelations | null | undefined) => ThemeRecord | null;
  selectedNoteTheme: ThemeRecord | null;
  selectedFolderTheme: ThemeRecord | null;
  selectedFolderThemeId: string;
  handleThemeChange: (themeId: string | null) => Promise<void>;
} {
  const themeMap = useMemo(
    (): Map<string, ThemeRecord> =>
      new Map(themes.map((theme: ThemeRecord): [string, ThemeRecord] => [String(theme.id), theme])),
    [themes]
  );

  const defaultTheme: ThemeRecord | null = notebook?.defaultThemeId
    ? (themeMap.get(String(notebook.defaultThemeId)) ?? null)
    : null;

  const getThemeForFolderId = useCallback(
    (folderId: string | null | undefined): ThemeRecord | null => {
      if (!folderId) return null;
      const folder = findFolderById(folderTree, folderId);
      const themeId = folder?.themeId ? String(folder.themeId) : null;
      if (!themeId) return null;
      return themeMap.get(themeId) ?? null;
    },
    [folderTree, themeMap]
  );

  const selectedFolderTheme = useMemo(
    (): ThemeRecord | null => getThemeForFolderId(selectedFolderId),
    [getThemeForFolderId, selectedFolderId]
  );

  const selectedFolderThemeId: string = selectedFolderId
    ? ((): string => {
      const folder = findFolderById(folderTree, selectedFolderId);
      return folder?.themeId ? String(folder.themeId) : '';
    })()
    : notebook?.defaultThemeId
      ? String(notebook.defaultThemeId)
      : '';

  const getThemeForNote = useCallback(
    (note: NoteWithRelations | null | undefined): ThemeRecord | null => {
      if (!note) return null;
      // 1. Check selected folder's theme
      if (selectedFolderId) {
        const selectedTheme = getThemeForFolderId(selectedFolderId);
        if (selectedTheme) return selectedTheme;
      }
      // 2. Check note's category themes
      const categoryIds =
        note.categories?.map((category: { categoryId: string }): string => category.categoryId) ??
        [];
      for (const categoryId of categoryIds) {
        const theme = getThemeForFolderId(categoryId);
        if (theme) return theme;
      }
      // 3. Fall back to notebook's default theme
      return defaultTheme;
    },
    [getThemeForFolderId, selectedFolderId, defaultTheme]
  );

  const selectedNoteTheme: ThemeRecord | null = useMemo(
    (): ThemeRecord | null => getThemeForNote(selectedNote),
    [getThemeForNote, selectedNote]
  );

  const handleUpdateFolderTheme = useCallback(
    async (themeId: string | null): Promise<void> => {
      if (!selectedFolderId) return;
      try {
        const response = await fetch(`/api/notes/categories/${selectedFolderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId }),
        });
        if (response.ok) {
          await fetchFolderTree();
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useNoteTheme',
          action: 'updateFolderTheme',
          folderId: selectedFolderId,
          themeId,
        });
      }
    },
    [selectedFolderId, fetchFolderTree]
  );

  const handleUpdateNotebookDefaultTheme = useCallback(
    async (themeId: string | null): Promise<void> => {
      if (!selectedNotebookId) return;
      try {
        const response = await fetch(`/api/notes/notebooks/${selectedNotebookId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultThemeId: themeId }),
        });
        if (response.ok) {
          const updated = (await response.json()) as NotebookRecord;
          setNotebook(updated);
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useNoteTheme',
          action: 'updateNotebookDefaultTheme',
          notebookId: selectedNotebookId,
          themeId,
        });
      }
    },
    [selectedNotebookId, setNotebook]
  );

  const handleThemeChange = useCallback(
    async (themeId: string | null): Promise<void> => {
      if (selectedFolderId) {
        await handleUpdateFolderTheme(themeId);
      } else {
        await handleUpdateNotebookDefaultTheme(themeId);
      }
    },
    [selectedFolderId, handleUpdateFolderTheme, handleUpdateNotebookDefaultTheme]
  );

  return {
    getThemeForNote,
    selectedNoteTheme,
    selectedFolderTheme,
    selectedFolderThemeId,
    handleThemeChange,
  };
}
