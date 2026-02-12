import type { CategoryWithChildren } from '@/shared/types/domain/notes';
import type { FolderTreeProfile } from '@/shared/utils/folder-tree-profiles';

export interface FolderTreeProps {
  folders: CategoryWithChildren[];
  selectedFolderId: string | null;
  selectedNotebookId?: string | null | undefined;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onCreateNote: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onSelectNote: (noteId: string) => void;
  onDuplicateNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onRelateNotes: (sourceNoteId: string, targetNoteId: string) => void;
  selectedNoteId?: string | undefined;
  onDropNote: (noteId: string, folderId: string | null) => void;
  onDropFolder: (folderId: string, targetParentId: string | null) => void;
  onReorderFolder?: ((folderId: string, targetId: string, position: 'before' | 'after') => void) | undefined;
  draggedNoteId: string | null;
  setDraggedNoteId: (noteId: string | null) => void;
  onToggleCollapse?: (() => void) | undefined;
  isFavoritesActive?: boolean | undefined;
  onToggleFavorites?: (() => void) | undefined;
  canUndo?: boolean | undefined;
  onUndo?: (() => void) | undefined;
  undoHistory?: Array<{ label: string }> | undefined;
  onUndoAtIndex?: ((index: number) => void) | undefined;
  onRefreshFolders?: (() => Promise<void>) | undefined;
  profile?: FolderTreeProfile | undefined;
}
