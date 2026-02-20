import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Notebook Contract
 */
export const notebookSchema = namedDtoSchema.extend({
  description: z.string().nullable(),
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

export const updateNotebookSchema = createNotebookSchema.partial();
export type UpdateNotebookDto = z.infer<typeof updateNotebookSchema>;
export type NotebookUpdateInput = UpdateNotebookDto;

/**
 * Note Theme Contract
 */
export const noteThemeSchema = namedDtoSchema.extend({
  description: z.string().nullable(),
  isDefault: z.boolean(),
  themeData: z.record(z.string(), z.unknown()),
});

export type NoteThemeDto = z.infer<typeof noteThemeSchema>;
export type ThemeRecord = NoteThemeDto;

export const createNoteThemeSchema = noteThemeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteThemeDto = z.infer<typeof createNoteThemeSchema>;
export type ThemeCreateInput = CreateNoteThemeDto;

export const updateNoteThemeSchema = createNoteThemeSchema.partial();
export type UpdateNoteThemeDto = z.infer<typeof updateNoteThemeSchema>;
export type ThemeUpdateInput = UpdateNoteThemeDto;

/**
 * Note Category Contract
 */
export const noteCategorySchema = namedDtoSchema.extend({
  description: z.string().nullable(),
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  notebookId: z.string().nullable(),
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

export const updateNoteCategorySchema = createNoteCategorySchema.partial();
export type UpdateNoteCategoryDto = z.infer<typeof updateNoteCategorySchema>;
export type CategoryUpdateInput = UpdateNoteCategoryDto;

export const noteCategoryRecordWithChildrenSchema: z.ZodType<any> = noteCategorySchema.extend({
  children: z.array(z.lazy(() => noteCategoryRecordWithChildrenSchema)),
});

export type NoteCategoryRecordWithChildrenDto = z.infer<typeof noteCategoryRecordWithChildrenSchema>;

/**
 * Note Tag Contract
 */
export const noteTagSchema = namedDtoSchema.extend({
  color: z.string().nullable(),
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

export const updateNoteTagSchema = createNoteTagSchema.partial();
export type UpdateNoteTagDto = z.infer<typeof updateNoteTagSchema>;
export type TagUpdateInput = UpdateNoteTagDto;

/**
 * Note Contract
 */
export const noteEditorTypeSchema = z.enum(['markdown', 'rich-text', 'plain-text']);
export type NoteEditorType = z.infer<typeof noteEditorTypeSchema>;

export const noteSchema = namedDtoSchema.extend({
  title: z.string(),
  content: z.string(),
  description: z.string().nullable().optional(),
  editorType: noteEditorTypeSchema,
  notebookId: z.string().nullable(),
  categoryId: z.string().nullable(),
  themeId: z.string().nullable(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  shareLink: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NoteDto = z.infer<typeof noteSchema>;
export type NoteRecord = NoteDto;

export const createNoteSchema = noteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteDto = z.infer<typeof createNoteSchema>;
export type NoteCreateInput = CreateNoteDto;

export const updateNoteSchema = createNoteSchema.partial();
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
export type NoteUpdateInput = UpdateNoteDto;

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
  id: z.string(),
  sourceNoteId: z.string(),
  targetNoteId: z.string(),
  type: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NoteRelationDto = z.infer<typeof noteRelationSchema>;
export type NoteRelationRecord = NoteRelationDto;

export const relatedNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RelatedNoteDto = z.infer<typeof relatedNoteSchema>;
export type RelatedNote = RelatedNoteDto;

export const noteWithRelationsSchema = noteSchema.extend({
  tags: z.array(noteTagSchema),
  category: noteCategorySchema.nullable(),
  notebook: notebookSchema.nullable(),
  theme: noteThemeSchema.nullable(),
  relations: z.array(noteRelationSchema),
});

export type NoteWithRelationsDto = z.infer<typeof noteWithRelationsSchema>;
export type NoteWithRelations = NoteWithRelationsDto;

export const noteFiltersSchema = z.object({
  notebookId: z.string().optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  pinnedOnly: z.boolean().optional(),
  favoriteOnly: z.boolean().optional(),
  archivedOnly: z.boolean().optional(),
});

export type NoteFiltersDto = z.infer<typeof noteFiltersSchema>;
export type NoteFilters = NoteFiltersDto;

/**
 * Note File Contract
 */
export const noteFileSchema = dtoBaseSchema.extend({
  noteId: z.string(),
  fileId: z.string(),
  filename: z.string(),
  mimetype: z.string(),
  size: z.number(),
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

export type NoteRelationWithTarget = NoteRelationRecord & {
  targetNote?: RelatedNote | undefined;
};

export type NoteRelationWithSource = NoteRelationRecord & {
  sourceNote?: RelatedNote | undefined;
};

export type CategoryWithChildren = NoteCategoryRecordWithChildrenDto & {
  notes?: NoteRecord[] | undefined;
};

/**
 * Note Settings
 */
export const noteSettingsSchema = z.object({
  sidebarCollapsed: z.boolean(),
  viewMode: z.enum(['list', 'grid']),
  sortBy: z.enum(['updatedAt', 'createdAt', 'title']),
  sortOrder: z.enum(['asc', 'desc']),
  showPinnedSection: z.boolean(),
  defaultNotebookId: z.string().nullable(),
});

export type NoteSettingsDto = z.infer<typeof noteSettingsSchema>;
export type NoteSettings = NoteSettingsDto;

/**
 * Note UI and Hook Types
 */

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
  notesRef: any; // RefObject<NoteWithRelations[]>
  folderTreeRef: any; // RefObject<CategoryWithChildren[]>
  fetchNotes: () => Promise<void>;
  fetchFolderTree: () => Promise<void>;
  setUndoStack: any; // React.Dispatch<React.SetStateAction<UndoAction[]>>
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info'; duration?: number },
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
