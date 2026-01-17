import type { Note } from "@prisma/client";
import type { 
  CategoryWithChildren, 
  NoteWithRelations, 
  ThemeRecord, 
  TagRecord
} from "@/types/notes";
import type { NoteSettings } from "@/types/notes-settings";

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

export interface NoteListViewProps {
  loading: boolean;
  sortedNotes: NoteWithRelations[];
  pagedNotes: NoteWithRelations[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  selectedFolderId: string | null;
  folderTree: CategoryWithChildren[];
  isFolderTreeCollapsed: boolean;
  onExpandFolderTree: () => void;
  onCreateNote: () => void;
  selectedFolderThemeId: string;
  themes: ThemeRecord[];
  onThemeChange: (id: string | null) => void;
  availableTagsInScope: TagRecord[];
  filterTagIds: string[];
  setFilterTagIds: (ids: string[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchScope: "both" | "title" | "content";
  updateSettings: (settings: Partial<NoteSettings>) => void;
  sortBy: NoteSettings["sortBy"];
  sortOrder: NoteSettings["sortOrder"];
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  viewMode: NoteSettings["viewMode"];
  gridDensity: NoteSettings["gridDensity"];
  highlightTagId: string | null;
  filterPinned: boolean | undefined;
  setFilterPinned: (val: boolean | undefined) => void;
  filterArchived: boolean | undefined;
  setFilterArchived: (val: boolean | undefined) => void;
  noteLayoutClassName: string;
  getThemeForNote: (note: NoteWithRelations) => ThemeRecord | null;
  onSelectNote: (note: NoteWithRelations) => void;
  onSelectFolderFromCard: (id: string | null) => void;
  onToggleFavorite: (note: NoteWithRelations) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  setIsEditing: (val: boolean) => void;
}

export interface NoteDetailViewProps {
  selectedNote: NoteWithRelations;
  folderTree: CategoryWithChildren[];
  selectedFolderId: string | null;
  isFolderTreeCollapsed: boolean;
  onExpandFolderTree: () => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onToggleFavorite: (note: NoteWithRelations) => void;
  onDeleteNote: () => Promise<void>;
  tags: TagRecord[];
  selectedNotebookId: string | null;
  onUpdateSuccess: () => void;
  fetchTags: () => void;
  selectedNoteTheme: ThemeRecord | null;
  onSelectRelatedNote: (noteId: string) => void;
  onFilterByTag: (tagId: string) => void;
  onUnlinkRelatedNote: (relatedId: string) => Promise<void>;
}

export interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderTree: CategoryWithChildren[];
  selectedFolderId: string | null;
  tags: TagRecord[];
  selectedNotebookId: string | null;
  onSuccess: () => void;
  onTagCreated: () => void;
  folderTheme: ThemeRecord | null;
  onSelectRelatedNote: (noteId: string) => void;
}

export interface NoteFormProps {
  note?: NoteWithRelations | null;
  folderTree: CategoryWithChildren[];
  defaultFolderId?: string | null;
  availableTags: TagRecord[];
  onSuccess: () => void;
  onTagCreated: () => void;
  onSelectRelatedNote: (noteId: string) => void;
  onTagClick?: (tagId: string) => void;
  notebookId?: string | null;
  folderTheme?: ThemeRecord | null;
}

export interface NotesFiltersProps {
  selectedFolderId: string | null;
  folderTree: CategoryWithChildren[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  tags: TagRecord[];
  filterTagIds: string[];
  setFilterTagIds: (value: string[]) => void;
  searchScope: "both" | "title" | "content";
  updateSettings: (updates: {
    sortBy?: "created" | "updated" | "name";
    sortOrder?: "asc" | "desc";
    showTimestamps?: boolean;
    showBreadcrumbs?: boolean;
    showRelatedNotes?: boolean;
    searchScope?: "both" | "title" | "content";
    viewMode?: "grid" | "list";
    gridDensity?: 4 | 8;
  }) => void;
  sortBy: "created" | "updated" | "name";
  sortOrder: "asc" | "desc";
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  viewMode: "grid" | "list";
  gridDensity: 4 | 8;
  highlightTagId?: string | null;
  buildBreadcrumbPath: (
    categoryId: string | null,
    noteTitle: string | null,
    categories: CategoryWithChildren[]
  ) => Array<{ id: string | null; name: string; isNote?: boolean }>;
}

export interface NoteCardProps {
  note: NoteWithRelations;
  folderTree: CategoryWithChildren[];
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  enableDrag?: boolean;
  onSelectNote: (note: NoteWithRelations) => void;
  onSelectFolder: (folderId: string | null) => void;
  onToggleFavorite: (note: NoteWithRelations) => void;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
  buildBreadcrumbPath: (
    categoryId: string | null,
    noteTitle: string | null,
    categories: CategoryWithChildren[]
  ) => Array<{ id: string | null; name: string; isNote?: boolean }>;
  theme?: ThemeRecord | null;
}