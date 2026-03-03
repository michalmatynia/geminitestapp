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

export type NotebookDto = z.infer<typeof notebookSchema>;
export type NotebookRecord = NotebookDto;

export const createNotebookSchema = notebookSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNotebookDto = z.infer<typeof createNotebookSchema>;
export type NotebookCreateInput = CreateNotebookDto;
export type NotebookCreateData = CreateNotebookDto;

export const updateNotebookSchema = createNotebookSchema.partial();
export type UpdateNotebookDto = z.infer<typeof updateNotebookSchema>;
export type NotebookUpdateInput = UpdateNotebookDto;
export type NotebookUpdateData = UpdateNotebookDto;

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

export type NoteThemeDto = z.infer<typeof noteThemeSchema>;
export type ThemeRecord = NoteThemeDto;

export const createNoteThemeSchema = noteThemeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteThemeDto = z.input<typeof createNoteThemeSchema>;
export type ThemeCreateInput = CreateNoteThemeDto;
export type ThemeCreateData = z.infer<typeof createNoteThemeSchema>;

export const updateNoteThemeSchema = createNoteThemeSchema.partial();
export type UpdateNoteThemeDto = z.infer<typeof updateNoteThemeSchema>;
export type ThemeUpdateInput = UpdateNoteThemeDto;
export type ThemeUpdateData = UpdateNoteThemeDto;

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

export type NoteCategoryDto = z.infer<typeof noteCategorySchema>;
export type CategoryRecord = NoteCategoryDto;

export const createNoteCategorySchema = noteCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteCategoryDto = z.infer<typeof createNoteCategorySchema>;
export type CategoryCreateInput = CreateNoteCategoryDto;
export type CategoryCreateData = CreateNoteCategoryDto;

export const updateNoteCategorySchema = createNoteCategorySchema.partial();
export type UpdateNoteCategoryDto = z.infer<typeof updateNoteCategorySchema>;
export type CategoryUpdateInput = UpdateNoteCategoryDto;
export type CategoryUpdateData = UpdateNoteCategoryDto;

export type NoteCategoryRecordWithChildrenDto = NoteCategoryDto & {
  children: NoteCategoryRecordWithChildrenDto[];
  notes?: NoteRecord[] | undefined;
  _count?: { notes: number };
};

export const noteCategoryRecordWithChildrenSchema: z.ZodType<NoteCategoryRecordWithChildrenDto> =
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

export type NoteTagDto = z.infer<typeof noteTagSchema>;
export type TagRecord = NoteTagDto;

export const createNoteTagSchema = noteTagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteTagDto = z.infer<typeof createNoteTagSchema>;
export type TagCreateInput = CreateNoteTagDto;
export type TagCreateData = CreateNoteTagDto;

export const updateNoteTagSchema = createNoteTagSchema.partial();
export type UpdateNoteTagDto = z.infer<typeof updateNoteTagSchema>;
export type TagUpdateInput = UpdateNoteTagDto;
export type TagUpdateData = UpdateNoteTagDto;

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

export type NoteFileDto = z.infer<typeof noteFileSchema>;
export type NoteFileRecord = NoteFileDto;

export const createNoteFileSchema = noteFileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteFileDto = z.infer<typeof createNoteFileSchema>;
export type NoteFileCreateInput = CreateNoteFileDto;

export type CategoryWithChildren = NoteCategoryRecordWithChildrenDto & {
  notes?: NoteRecord[] | undefined;
  _count?: { notes: number };
};

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

export type NoteDto = z.infer<typeof noteSchema>;
export type NoteRecord = NoteDto;

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

export type CreateNoteDto = z.input<typeof createNoteSchema>;
export type NoteCreateInput = CreateNoteDto;
export type NoteCreateData = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial();
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
export type NoteUpdateInput = UpdateNoteDto;
export type NoteUpdateData = z.infer<typeof updateNoteSchema>;

/**
 * Note Relations
 */
export const noteTagRelationSchema = z.object({
  noteId: z.string(),
  tagId: z.string(),
  assignedAt: z.string(),
});

export type NoteTagRelationDto = z.infer<typeof noteTagRelationSchema>;
export type NoteTagRecord = NoteTagRelationDto;

export const noteCategoryRelationSchema = z.object({
  noteId: z.string(),
  categoryId: z.string(),
  assignedAt: z.string(),
});

export type NoteCategoryRelationDto = z.infer<typeof noteCategoryRelationSchema>;
export type NoteCategoryRecord = NoteCategoryRelationDto;

export const noteRelationSchema = z.object({
  sourceNoteId: z.string(),
  targetNoteId: z.string(),
  assignedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NoteRelationDto = z.infer<typeof noteRelationSchema>;

export type NoteRelationWithSource = NoteRelationDto & {
  sourceNote?: RelatedNoteDto | undefined;
};

export type NoteRelationWithTarget = NoteRelationDto & {
  targetNote?: RelatedNoteDto | undefined;
};

export type NoteTagWithDetails = NoteTagRelationDto & {
  tag: NoteTagDto;
};
export type NoteRelationRecord = NoteRelationDto;

export const relatedNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  color: z.string().nullable().optional(),
  content: z.string().optional(),
});

export type RelatedNoteDto = z.infer<typeof relatedNoteSchema>;
export type RelatedNote = RelatedNoteDto;

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

export type NoteWithRelationsDto = z.infer<typeof noteWithRelationsSchema>;
export type NoteWithRelations = NoteWithRelationsDto;

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

export type NoteFiltersDto = z.infer<typeof noteFiltersSchema>;
export type NoteFilters = NoteFiltersDto;

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

export type NoteSettingsDto = z.infer<typeof noteSettingsSchema>;
export type NoteSettings = NoteSettingsDto;

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

export interface UseNoteFiltersProps {
  settings: NoteSettings;
  updateSettings: (settings: Partial<NoteSettings>) => void;
}

export interface UseNoteThemeProps {
  themes: NoteThemeDto[];
  notebook: NotebookDto | null;
  folderTree: CategoryWithChildren[];
  selectedFolderId: string | null;
  selectedNotebookId: string | null;
  selectedNote: NoteWithRelations | null;
  fetchFolderTree: () => Promise<void>;
  setNotebook: (notebook: NotebookDto) => void;
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
  create(data: CreateNoteDto): Promise<NoteWithRelations>;
  update(id: string, data: UpdateNoteDto): Promise<NoteWithRelations | null>;
  syncRelatedNotesBatch(noteId: string, addedIds: string[], removedIds: string[]): Promise<void>;
  delete(id: string): Promise<boolean>;

  // Tags
  getAllTags(notebookId?: string | null): Promise<NoteTagDto[]>;
  getTagById(id: string): Promise<NoteTagDto | null>;
  createTag(data: CreateNoteTagDto): Promise<NoteTagDto>;
  updateTag(id: string, data: UpdateNoteTagDto): Promise<NoteTagDto | null>;
  deleteTag(id: string): Promise<boolean>;

  // Categories
  getAllCategories(notebookId?: string | null): Promise<NoteCategoryDto[]>;
  getCategoryById(id: string): Promise<NoteCategoryDto | null>;
  getCategoryTree(notebookId?: string | null): Promise<NoteCategoryRecordWithChildrenDto[]>;
  createCategory(data: CreateNoteCategoryDto): Promise<NoteCategoryDto>;
  updateCategory(id: string, data: UpdateNoteCategoryDto): Promise<NoteCategoryDto | null>;
  deleteCategory(id: string, recursive?: boolean): Promise<boolean>;

  // Notebooks
  getAllNotebooks(): Promise<NotebookDto[]>;
  getNotebookById(id: string): Promise<NotebookDto | null>;
  createNotebook(data: CreateNotebookDto): Promise<NotebookDto>;
  updateNotebook(id: string, data: UpdateNotebookDto): Promise<NotebookDto | null>;
  deleteNotebook(id: string): Promise<boolean>;
  getOrCreateDefaultNotebook(): Promise<NotebookDto>;
  invalidateDefaultNotebookCache(): Promise<void>;

  // Themes
  getAllThemes(notebookId?: string | null): Promise<NoteThemeDto[]>;
  getThemeById(id: string): Promise<NoteThemeDto | null>;
  createTheme(data: CreateNoteThemeDto): Promise<NoteThemeDto>;
  updateTheme(id: string, data: UpdateNoteThemeDto): Promise<NoteThemeDto | null>;
  deleteTheme(id: string): Promise<boolean>;

  // Files
  createNoteFile(data: CreateNoteFileDto): Promise<NoteFileDto>;
  getNoteFiles(noteId: string): Promise<NoteFileDto[]>;
  deleteNoteFile(noteId: string, slotIndex: number): Promise<boolean>;
}
