import type { Note } from "@prisma/client";
import type { CategoryWithChildren } from "@/types/notes";

export interface FolderTreeProps {
  folders: CategoryWithChildren[];
  selectedFolderId: string | null;
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
  selectedNoteId?: string;
  onDropNote: (noteId: string, folderId: string | null) => void;
  onDropFolder: (folderId: string, targetParentId: string | null) => void;
  draggedNoteId: string | null;
  setDraggedNoteId: (noteId: string | null) => void;
  onToggleCollapse?: () => void;
  isFavoritesActive?: boolean;
  onToggleFavorites?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  undoHistory?: Array<{ label: string }>;
  onUndoAtIndex?: (index: number) => void;
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
  selectedNoteId?: string;
  onDropNote: (noteId: string, folderId: string | null) => void;
  onDropFolder: (folderId: string, targetParentId: string | null) => void;
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
  note: Note;
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
