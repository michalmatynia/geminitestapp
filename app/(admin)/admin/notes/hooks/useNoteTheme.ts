import { useMemo, useCallback } from "react";
import type { NoteWithRelations, NotebookRecord } from "@/types/notes";
import type { UseNoteThemeProps } from "@/types/notes-hooks";
import { findFolderById } from "../utils";

export function useNoteTheme({
  themes,
  notebook,
  folderTree,
  selectedFolderId,
  selectedNotebookId,
  selectedNote,
  fetchFolderTree,
  setNotebook,
}: UseNoteThemeProps) {
  
  const themeMap = useMemo(
    () => new Map(themes.map((theme) => [String(theme.id), theme])),
    [themes]
  );

  const defaultTheme = useMemo(() => {
    if (!notebook?.defaultThemeId) return null;
    return themeMap.get(String(notebook.defaultThemeId)) ?? null;
  }, [notebook?.defaultThemeId, themeMap]);

  const getThemeForFolderId = useCallback(
    (folderId: string | null | undefined) => {
      if (!folderId) return null;
      const folder = findFolderById(folderTree, folderId);
      const themeId = folder?.themeId ? String(folder.themeId) : null;
      if (!themeId) return null;
      return themeMap.get(themeId) ?? null;
    },
    [folderTree, themeMap]
  );

  const selectedFolderTheme = useMemo(
    () => getThemeForFolderId(selectedFolderId),
    [getThemeForFolderId, selectedFolderId]
  );

  const selectedFolderThemeId = useMemo(() => {
    if (selectedFolderId) {
      const folder = findFolderById(folderTree, selectedFolderId);
      return folder?.themeId ? String(folder.themeId) : "";
    }
    return notebook?.defaultThemeId ? String(notebook.defaultThemeId) : "";
  }, [selectedFolderId, folderTree, notebook?.defaultThemeId]);

  const getThemeForNote = useCallback(
    (note: NoteWithRelations | null | undefined) => {
      if (!note) return null;
      // 1. Check selected folder's theme
      if (selectedFolderId) {
        const selectedTheme = getThemeForFolderId(selectedFolderId);
        if (selectedTheme) return selectedTheme;
      }
      // 2. Check note's category themes
      const categoryIds = note.categories?.map((category) => category.categoryId) ?? [];
      for (const categoryId of categoryIds) {
        const theme = getThemeForFolderId(categoryId);
        if (theme) return theme;
      }
      // 3. Fall back to notebook's default theme
      return defaultTheme;
    },
    [getThemeForFolderId, selectedFolderId, defaultTheme]
  );

  const selectedNoteTheme = useMemo(
    () => getThemeForNote(selectedNote),
    [getThemeForNote, selectedNote]
  );

  const handleUpdateFolderTheme = useCallback(
    async (themeId: string | null) => {
      if (!selectedFolderId) return;
      try {
        const response = await fetch(`/api/notes/categories/${selectedFolderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeId }),
        });
        if (response.ok) {
          await fetchFolderTree();
        }
      } catch (error) {
        console.error("Failed to update folder theme:", error);
      }
    },
    [selectedFolderId, fetchFolderTree]
  );

  const handleUpdateNotebookDefaultTheme = useCallback(
    async (themeId: string | null) => {
      if (!selectedNotebookId) return;
      try {
        const response = await fetch(`/api/notes/notebooks/${selectedNotebookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultThemeId: themeId }),
        });
        if (response.ok) {
          const updated = (await response.json()) as NotebookRecord;
          setNotebook(updated);
        }
      } catch (error) {
        console.error("Failed to update notebook default theme:", error);
      }
    },
    [selectedNotebookId, setNotebook]
  );

  const handleThemeChange = useCallback(
    async (themeId: string | null) => {
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
