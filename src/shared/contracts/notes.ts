import React from 'react';
import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Notebook Contract
 */
export const notebookSchema = namedDtoSchema.extend({
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  defaultThemeId: z.string().nullable().optional(),
});

export type NotebookRecord = z.infer<typeof notebookSchema>;

export const createNotebookSchema = notebookSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NotebookCreateInput = z.infer<typeof createNotebookSchema>;
export type NotebookCreateData = NotebookCreateInput;

export const updateNotebookSchema = createNotebookSchema.partial();
export type NotebookUpdateInput = z.infer<typeof updateNotebookSchema>;
export type NotebookUpdateData = NotebookUpdateInput;

/**
 * Note Theme Contract
 */
export const noteThemeSchema = namedDtoSchema.extend({
  description: z.string().nullable().optional(),
  isDefault: z.boolean(),
  notebookId: z.string().nullable().optional(),
  textColor: z.string().default('#e5e7eb'),
  backgroundColor: z.string().default('#111827'),
  markdownHeadingColor: z.string().default('#ffffff'),
  markdownLinkColor: z.string().default('#60a5fa'),
  markdownCodeBackground: z.string().default('#1f2937'),
  markdownCodeText: z.string().default('#e5e7eb'),
  relatedNoteBorderWidth: z.number().default(1),
  relatedNoteBorderColor: z.string().default('#374151'),
  relatedNoteBackgroundColor: z.string().default('#1f2937'),
  relatedNoteTextColor: z.string().default('#e5e7eb'),
  themeData: z.record(z.string(), z.unknown()).optional(),
});

export type ThemeRecord = z.infer<typeof noteThemeSchema>;

export const createNoteThemeSchema = noteThemeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ThemeCreateInput = z.input<typeof createNoteThemeSchema>;
export type ThemeCreateData = z.infer<typeof createNoteThemeSchema>;

export const updateNoteThemeSchema = createNoteThemeSchema.partial();
export type ThemeUpdateInput = z.infer<typeof updateNoteThemeSchema>;
export type ThemeUpdateData = ThemeUpdateInput;

/**
 * Note Category Contract
 */
export const noteCategorySchema = dtoBaseSchema.extend({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  notebookId: z.string().nullable().optional(),
  themeId: z.string().nullable().optional(),
  sortIndex: z.number().nullable().optional(),
});

export type CategoryRecord = z.infer<typeof noteCategorySchema>;

export const createNoteCategorySchema = noteCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CategoryCreateInput = z.infer<typeof createNoteCategorySchema>;
export type CategoryCreateData = CategoryCreateInput;

export const updateNoteCategorySchema = createNoteCategorySchema.partial();
export type CategoryUpdateInput = z.infer<typeof updateNoteCategorySchema>;
export type CategoryUpdateData = CategoryUpdateInput;

export type CategoryWithChildren = CategoryRecord & {
  children: CategoryWithChildren[];
  notes?: NoteRecord[] | undefined;
  _count?: { notes: number };
};

export const noteCategoryRecordWithChildrenSchema: z.ZodType<CategoryWithChildren> =
  noteCategorySchema.extend({
    children: z.array(z.lazy(() => noteCategoryRecordWithChildrenSchema)),
  });

/**
 * Note Tag Contract
 */
export const noteTagSchema = dtoBaseSchema.extend({
  name: z.string().min(1, 'Name is required'),
  color: z.string().nullable().optional(),
  notebookId: z.string().nullable().optional(),
});

export type TagRecord = z.infer<typeof noteTagSchema>;

export const createNoteTagSchema = noteTagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TagCreateInput = z.infer<typeof createNoteTagSchema>;
export type TagCreateData = TagCreateInput;

export const updateNoteTagSchema = createNoteTagSchema.partial();
export type TagUpdateInput = z.infer<typeof updateNoteTagSchema>;
export type TagUpdateData = TagUpdateInput;

/**
 * Note File Contract
 */
export const noteFileSchema = dtoBaseSchema.extend({
  noteId: z.string(),
  slotIndex: z.number(),
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  publicUrl: z.string().optional(),
});

export type NoteFileRecord = z.infer<typeof noteFileSchema>;

export const createNoteFileSchema = noteFileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NoteFileCreateInput = z.infer<typeof createNoteFileSchema>;

/**
 * Note Contract
 */
export const noteEditorTypeSchema = z.enum([
  'markdown',
  'rich-text',
  'plain-text',
  'code',
  'wysiwyg',
]);
export type NoteEditorType = z.infer<typeof noteEditorTypeSchema>;

export const noteSchema = dtoBaseSchema.extend({
  name: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  description: z.string().nullable().optional(),
  editorType: noteEditorTypeSchema,
  notebookId: z.string().nullable(),
  categoryId: z.string().nullable().optional(),
  themeId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  shareLink: z.string().nullable().optional(),
  tags: z.array(z.unknown()).optional().default([]),
  tagIds: z.array(z.string()).optional().default([]),
  categories: z.array(z.unknown()).optional().default([]),
  categoryIds: z.array(z.string()).optional().default([]),
  relatedNoteIds: z.array(z.string()).optional().default([]),
  relations: z.array(z.unknown()).optional().default([]),
  relationsFrom: z.array(z.unknown()).optional(),
  relationsTo: z.array(z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NoteRecord = z.infer<typeof noteSchema>;

export const createNoteSchema = noteSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    editorType: noteEditorTypeSchema.optional(),
    notebookId: z.string().nullable().optional(),
  });

export type NoteCreateInput = z.input<typeof createNoteSchema>;
export type NoteCreateData = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial();
export type NoteUpdateInput = z.infer<typeof updateNoteSchema>;
export type NoteUpdateData = z.infer<typeof updateNoteSchema>;

/**
 * Note Relations
 */
export const noteTagRelationSchema = z.object({
  noteId: z.string(),
  tagId: z.string(),
  assignedAt: z.string(),
});

export type NoteTagRecord = z.infer<typeof noteTagRelationSchema>;

export const noteCategoryRelationSchema = z.object({
  noteId: z.string(),
  categoryId: z.string(),
  assignedAt: z.string(),
});

export type NoteCategoryRecord = z.infer<typeof noteCategoryRelationSchema>;

export const noteRelationSchema = z.object({
  sourceNoteId: z.string(),
  targetNoteId: z.string(),
  assignedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NoteRelationRecord = z.infer<typeof noteRelationSchema>;

export type NoteRelationWithSource = NoteRelationRecord & {
  sourceNote?: RelatedNote | undefined;
};

export type NoteRelationWithTarget = NoteRelationRecord & {
  targetNote?: RelatedNote | undefined;
};

export type NoteTagWithDetails = NoteTagRecord & {
  tag: TagRecord;
};

export const relatedNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  color: z.string().nullable().optional(),
  content: z.string().optional(),
});

export type RelatedNote = z.infer<typeof relatedNoteSchema>;

export const noteWithRelationsSchema = noteSchema.extend({
  tags: z
    .array(
      z.object({
        noteId: z.string().optional(),
        tagId: z.string(),
        assignedAt: z.string().optional(),
        tag: noteTagSchema,
      })
    )
    .optional(),
  category: z
    .object({
      noteId: z.string().optional(),
      categoryId: z.string(),
      assignedAt: z.string().optional(),
      category: noteCategorySchema,
    })
    .nullable()
    .optional(),
  categories: z
    .array(
      z.object({
        noteId: z.string().optional(),
        categoryId: z.string(),
        assignedAt: z.string().optional(),
        category: noteCategorySchema,
      })
    )
    .optional(),
  notebook: notebookSchema.nullable().optional(),
  theme: noteThemeSchema.nullable().optional(),
  files: z.array(noteFileSchema).optional(),
  relations: z.array(relatedNoteSchema).optional(),
  relationsFrom: z
    .array(noteRelationSchema.extend({ targetNote: relatedNoteSchema.optional() }))
    .optional(),
  relationsTo: z
    .array(noteRelationSchema.extend({ sourceNote: relatedNoteSchema.optional() }))
    .optional(),
});

export type NoteWithRelations = z.infer<typeof noteWithRelationsSchema>;

export const noteFiltersSchema = z.object({
  notebookId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  tagId: z.string().nullable().optional(),
  search: z.string().optional(),
  pinnedOnly: z.boolean().optional(),
  favoriteOnly: z.boolean().optional(),
  archivedOnly: z.boolean().optional(),
  truncateContent: z.boolean().optional(),
  searchScope: z.enum(['both', 'title', 'content']).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

export type NoteFilters = z.infer<typeof noteFiltersSchema>;

export interface FetchNotesParams {
  notebookId?: string | undefined;
  search?: string | undefined;
  searchScope?: string | undefined;
  isPinned?: boolean | undefined;
  isArchived?: boolean | undefined;
  isFavorite?: boolean | undefined;
  tagIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  truncateContent?: boolean | undefined;
}

/**
 * Note Settings
 */
export const noteSettingsSchema = z.object({
  sidebarCollapsed: z.boolean(),
  viewMode: z.enum(['list', 'grid']),
  sortBy: z.union([
    z.enum(['updatedAt', 'createdAt', 'title']),
    z.enum(['name', 'created', 'updated']),
  ]),
  sortOrder: z.enum(['asc', 'desc']),
  showPinnedSection: z.boolean(),
  showTimestamps: z.boolean().default(true),
  showBreadcrumbs: z.boolean().default(true),
  showRelatedNotes: z.boolean().default(true),
  defaultNotebookId: z.string().nullable(),
  selectedFolderId: z.string().nullable().optional(),
  selectedNoteId: z.string().nullable().optional(),
  selectedNotebookId: z.string().nullable().optional(),
  searchScope: z.enum(['both', 'title', 'content']).default('both'),
  gridDensity: z.number().default(4),
  editorMode: z
    .enum(['markdown', 'rich-text', 'plain-text', 'code', 'wysiwyg'])
    .default('markdown'),
  autoformatOnPaste: z.boolean().default(true),
});

export type NoteSettings = z.infer<typeof noteSettingsSchema>;

/**
 * Note UI and Hook Types
 */

export type NotesMasterNodeRef =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'note'; id: string; nodeId: string };

export type NotesExternalDropAction =
  | {
      type: 'relate_notes';
      noteId: string;
      targetNoteId: string;
    }
  | {
      type: 'move_note';
      noteId: string;
      targetFolderId: string | null;
    }
  | {
      type: 'reorder_folder_root_top';
      folderId: string;
      anchorFolderId: string;
    }
  | {
      type: 'move_folder';
      folderId: string;
      targetFolderId: string | null;
    };

export type NotesMasterTreeOperations = {
  handleMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  handleMoveFolderToFolder: (folderId: string, targetParentId: string | null) => Promise<void>;
  handleReorderFolder: (
    folderId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => Promise<void>;
  handleRenameNote: (noteId: string, newTitle: string) => Promise<void>;
  handleRenameFolder: (folderId: string, newName: string) => Promise<void>;
};

export type UndoAction =
  | {
      type: 'moveNote';
      noteId: string;
      fromFolderId: string | null;
      toFolderId: string | null;
    }
  | {
      type: 'moveFolder';
      folderId: string;
      fromParentId: string | null;
      toParentId: string | null;
    }
  | { type: 'renameFolder'; folderId: string; fromName: string; toName: string }
  | { type: 'renameNote'; noteId: string; fromTitle: string; toTitle: string };

export interface UseNoteOperationsProps {
  selectedNotebookId: string | null;
  notesRef: React.RefObject<NoteWithRelations[] | null>;
  folderTreeRef: React.RefObject<CategoryWithChildren[] | null>;
  fetchNotes: () => Promise<void>;
  fetchFolderTree: () => Promise<void>;
  setUndoStack: React.Dispatch<React.SetStateAction<UndoAction[]>>;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info'; duration?: number }
  ) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  selectedNote: NoteWithRelations | null;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => void;
  promptAction: (config: {
    title: string;
    message?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void | Promise<void>;
    required?: boolean;
  }) => void;
}

export interface UseNoteOperationsResult {
  handleCreateFolder: (parentId?: string | null) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleRenameFolder: (folderId: string, newName: string) => Promise<void>;
  handleDuplicateNote: (noteId: string) => Promise<void>;
  handleDeleteNoteFromTree: (noteId: string) => Promise<void>;
  handleRenameNote: (noteId: string, newTitle: string) => Promise<void>;
  handleMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  handleMoveFolderToFolder: (folderId: string, targetParentId: string | null) => Promise<void>;
  handleReorderFolder: (
    folderId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => Promise<void>;
  handleRelateNotes: (sourceNoteId: string, targetNoteId: string) => Promise<void>;
}

export interface UseNoteFiltersProps {
  settings: NoteSettings;
  updateSettings: (settings: Partial<NoteSettings>) => void;
}

export interface UseNoteThemeProps {
  themes: ThemeRecord[];
  notebook: NotebookRecord | null;
  folderTree: CategoryWithChildren[];
  selectedFolderId: string | null;
  selectedNotebookId: string | null;
  selectedNote: NoteWithRelations | null;
  fetchFolderTree: () => Promise<void>;
  setNotebook: (notebook: NotebookRecord) => void;
}

export interface UseNoteDataProps {
  selectedNotebookId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  searchScope: 'both' | 'title' | 'content';
  filterPinned?: boolean | undefined;
  filterArchived?: boolean | undefined;
  filterFavorite?: boolean | undefined;
  filterTagIds: string[];
  setSelectedNotebookId: (id: string | null) => void;
}

export interface NoteFormProps {
  note?: NoteWithRelations | null;
  onSuccess: () => void;
}

export interface NoteRepository {
  // Notes
  getAll(filters: NoteFilters): Promise<NoteWithRelations[]>;
  getById(id: string): Promise<NoteWithRelations | null>;
  create(data: NoteCreateInput): Promise<NoteWithRelations>;
  update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null>;
  syncRelatedNotesBatch(noteId: string, addedIds: string[], removedIds: string[]): Promise<void>;
  delete(id: string): Promise<boolean>;

  // Tags
  getAllTags(notebookId?: string | null): Promise<TagRecord[]>;
  getTagById(id: string): Promise<TagRecord | null>;
  createTag(data: TagCreateInput): Promise<TagRecord>;
  updateTag(id: string, data: TagUpdateInput): Promise<TagRecord | null>;
  deleteTag(id: string): Promise<boolean>;

  // Categories
  getAllCategories(notebookId?: string | null): Promise<CategoryRecord[]>;
  getCategoryById(id: string): Promise<CategoryRecord | null>;
  getCategoryTree(notebookId?: string | null): Promise<CategoryWithChildren[]>;
  createCategory(data: CategoryCreateInput): Promise<CategoryRecord>;
  updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null>;
  deleteCategory(id: string, recursive?: boolean): Promise<boolean>;

  // Notebooks
  getAllNotebooks(): Promise<NotebookRecord[]>;
  getNotebookById(id: string): Promise<NotebookRecord | null>;
  createNotebook(data: NotebookCreateInput): Promise<NotebookRecord>;
  updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null>;
  deleteNotebook(id: string): Promise<boolean>;
  getOrCreateDefaultNotebook(): Promise<NotebookRecord>;
  invalidateDefaultNotebookCache(): Promise<void>;

  // Themes
  getAllThemes(notebookId?: string | null): Promise<ThemeRecord[]>;
  getThemeById(id: string): Promise<ThemeRecord | null>;
  createTheme(data: ThemeCreateInput): Promise<ThemeRecord>;
  updateTheme(id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null>;
  deleteTheme(id: string): Promise<boolean>;

  // Files
  createNoteFile(data: NoteFileCreateInput): Promise<NoteFileRecord>;
  getNoteFiles(noteId: string): Promise<NoteFileRecord[]>;
  deleteNoteFile(noteId: string, slotIndex: number): Promise<boolean>;
}

/**
 * Notes UI Context DTOs
 */

export type UseNoteFiltersResult = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  filterPinned: boolean | undefined;
  setFilterPinned: (v: boolean | undefined) => void;
  filterArchived: boolean | undefined;
  setFilterArchived: (v: boolean | undefined) => void;
  filterFavorite: boolean | undefined;
  setFilterFavorite: (v: boolean | undefined) => void;
  filterTagIds: string[];
  setFilterTagIds: (ids: string[]) => void;
  highlightTagId: string | null;
  setHighlightTagId: (id: string | null) => void;
  page: number;
  setPage: (p: number | ((curr: number) => number)) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  handleFilterByTag: (
    tagId: string,
    setSelectedFolderId: (id: string | null) => void,
    setSelectedNote: (val: NoteWithRelations | null) => void,
    setIsEditing: (val: boolean) => void
  ) => void;
  handleToggleFavoritesFilter: (
    setSelectedFolderId: (id: string | null) => void,
    setSelectedNote: (val: NoteWithRelations | null) => void,
    setIsEditing: (val: boolean) => void
  ) => void;
};

export interface NotesAppContextValue {
  settings: NoteSettings;
  updateSettings: (updates: Partial<NoteSettings>) => void;
  filters: UseNoteFiltersResult;
  folderTree: CategoryWithChildren[];
  tags: TagRecord[];
  themes: ThemeRecord[];
  loading: boolean;
  selectedNote: NoteWithRelations | null;
  setSelectedNote: (note: NoteWithRelations | null) => void;
  selectedFolderId: string | null;
  selectedNotebookId: string | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  isFolderTreeCollapsed: boolean;
  setIsFolderTreeCollapsed: (val: boolean) => void;
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  sortedNotes: NoteWithRelations[];
  pagedNotes: NoteWithRelations[];
  totalPages: number;
  noteLayoutClassName: string;
  availableTagsInScope: TagRecord[];
  selectedFolderThemeId: string;
  selectedFolderTheme: ThemeRecord | null;
  selectedNoteTheme: ThemeRecord | null;
  getThemeForNote: (note: NoteWithRelations) => ThemeRecord | null;
  handleThemeChange: (themeId: string | null) => void | Promise<void>;
  fetchTags: () => void;
  setSelectedFolderId: (id: string | null) => void;
  handleSelectNoteFromTree: (id: string) => Promise<void>;
  handleToggleFavorite: (note: NoteWithRelations) => Promise<void>;
  handleDeleteNote: () => Promise<void>;
  handleUpdateSuccess: () => void;
  handleCreateSuccess: () => void;
  handleUnlinkRelatedNote: (id: string) => Promise<void>;
  handleFilterByTag: (tagId: string) => void;

  // Confirmation Modal
  confirmation: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null;
  setConfirmation: (
    val: {
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
      confirmText?: string;
      isDangerous?: boolean;
    } | null
  ) => void;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => void;

  // Prompt Modal
  prompt: {
    title: string;
    message?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void | Promise<void>;
    required?: boolean;
  } | null;
  setPrompt: (
    val: {
      title: string;
      message?: string;
      label?: string;
      defaultValue?: string;
      placeholder?: string;
      onConfirm: (value: string) => void | Promise<void>;
      required?: boolean;
    } | null
  ) => void;
  promptAction: (config: {
    title: string;
    message?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void | Promise<void>;
    required?: boolean;
  }) => void;

  // Operations
  operations: UseNoteOperationsResult;
  undoStack: UndoAction[];
  undoHistory: { label: string }[];
  handleUndoFolderTree: (count?: number) => Promise<void>;
  handleUndoAtIndex: (index: number) => void;
  fetchFolderTree: () => Promise<void>;
}
