import type { CategoryWithChildren, NoteRecord } from '@/shared/types/notes';

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
}

export interface FolderNodeProps {
  folder: CategoryWithChildren;
  level: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onCreateNote: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onSelectNote: (noteId: string) => void;
  onDuplicateNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onRelateNotes: (sourceNoteId: string, targetNoteId: string) => void;
  selectedNoteId?: string | undefined;
  onDropNote: (noteId: string, folderId: string | null) => void;
  onDropFolder: (folderId: string, targetParentId: string | null) => void;
  onReorderFolder?: ((folderId: string, targetId: string, position: 'before' | 'after') => void) | undefined;
  draggedFolderId: string | null;
  draggedNoteId: string | null;
  setDraggedNoteId: (noteId: string | null) => void;
  onDragStart: (folderId: string) => void;
  onDragEnd: () => void;
  allFolders: CategoryWithChildren[];
  renamingFolderId: string | null;
  onStartRename: (folderId: string) => void;
  onCancelRename: () => void;
  renamingNoteId: string | null;
  onStartNoteRename: (noteId: string) => void;
  onCancelNoteRename: () => void;
  expandedFolderIds: Set<string>;
  onToggleExpand: (folderId: string) => void;
}

export interface NoteItemProps {
  note: NoteRecord;
  level: number;
  isSelected: boolean;
  isRenaming: boolean;
  folderId: string;
  onSelectNote: (noteId: string) => void;
  onCreateNote: (folderId: string) => void;
  onDuplicateNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onStartRename: (noteId: string) => void;
  onCancelRename: () => void;
  onRelateNotes: (sourceNoteId: string, targetNoteId: string) => void;
  draggedNoteId: string | null;
  setDraggedNoteId: (noteId: string | null) => void;
}
