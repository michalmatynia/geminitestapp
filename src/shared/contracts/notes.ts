import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import { documentEditorModeSchema, type DocumentEditorModeDto } from './document-editor';

/**
 * Notes App DTOs
 */

export const noteEditorTypeSchema = documentEditorModeSchema;
export type NoteEditorType = DocumentEditorModeDto;

export const noteSchema = dtoBaseSchema.extend({
  title: z.string().min(1),
  content: z.string().min(1),
  notebookId: z.string().nullable(),
  editorType: noteEditorTypeSchema,
  color: z.string().nullable(),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  isFavorite: z.boolean(),
  tagIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  relatedNoteIds: z.array(z.string()),
});

export type NoteDto = z.infer<typeof noteSchema>;

export const relatedNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string().nullable(),
  content: z.string().optional(),
});

export type RelatedNoteDto = z.infer<typeof relatedNoteSchema>;

/**
 * Note Tag Relation Contract
 */
export const noteTagRelationSchema = z.object({
  noteId: z.string(),
  tagId: z.string(),
  assignedAt: z.string(),
  tag: z.lazy(() => noteTagSchema).optional(),
});

export type NoteTagRelationDto = z.infer<typeof noteTagRelationSchema>;

/**
 * Note Category Relation Contract
 */
export const noteCategoryRelationSchema = z.object({
  noteId: z.string(),
  categoryId: z.string(),
  assignedAt: z.string(),
  category: z.lazy(() => noteCategorySchema).optional(),
});

export type NoteCategoryRelationDto = z.infer<typeof noteCategoryRelationSchema>;

/**
 * Note Relation Contract
 */
export const noteRelationSchema = z.object({
  sourceNoteId: z.string(),
  targetNoteId: z.string(),
  assignedAt: z.string(),
  targetNote: z.lazy(() => relatedNoteSchema).optional(),
  sourceNote: z.lazy(() => relatedNoteSchema).optional(),
});

export type NoteRelationDto = z.infer<typeof noteRelationSchema>;

export const noteWithRelationsSchema = noteSchema.extend({
  tags: z.array(noteTagRelationSchema.extend({
    tag: z.lazy(() => noteTagSchema)
  })),
  categories: z.array(noteCategoryRelationSchema.extend({
    category: z.lazy(() => noteCategorySchema)
  })),
  relations: z.array(relatedNoteSchema).optional(),
  relationsFrom: z.array(noteRelationSchema).optional(),
  relationsTo: z.array(noteRelationSchema).optional(),
  files: z.array(z.any()).optional(),
});

export type NoteWithRelationsDto = z.infer<typeof noteWithRelationsSchema>;

export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  notebookId: z.string().nullable().optional(),
  editorType: noteEditorTypeSchema.optional(),
  color: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  relatedNoteIds: z.array(z.string()).optional(),
});

export type CreateNoteDto = z.infer<typeof createNoteSchema>;
export type UpdateNoteDto = Partial<CreateNoteDto>;

export const notebookSchema = namedDtoSchema.extend({
  name: z.string().min(1),
  color: z.string().nullable(),
  defaultThemeId: z.string().nullable(),
});

export type NotebookDto = z.infer<typeof notebookSchema>;

export const createNotebookSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  defaultThemeId: z.string().nullable().optional(),
});

export type CreateNotebookDto = z.infer<typeof createNotebookSchema>;
export type UpdateNotebookDto = Partial<CreateNotebookDto>;

export const noteCategorySchema = namedDtoSchema.extend({
  name: z.string().min(1),
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  notebookId: z.string().nullable(),
  themeId: z.string().nullable(),
  sortIndex: z.number().nullable(),
});

export type NoteCategoryDto = z.infer<typeof noteCategorySchema>;

export interface NoteCategoryWithChildrenDto extends NoteCategoryDto {
  children: NoteCategoryWithChildrenDto[];
}

export const noteCategoryWithChildrenSchema: z.ZodType<NoteCategoryWithChildrenDto> = noteCategorySchema.extend({
  children: z.array(z.lazy(() => noteCategoryWithChildrenSchema)),
});

/**
 * Note Category Record With Children (Domain-specific DTO)
 */
export interface NoteCategoryRecordWithChildrenDto extends NoteCategoryDto {
  children: NoteCategoryRecordWithChildrenDto[];
  notes?: NoteDto[] | undefined;
  _count?: {
    notes: number;
  } | undefined;
}

export const noteCategoryRecordWithChildrenSchema: z.ZodType<NoteCategoryRecordWithChildrenDto> = noteCategorySchema.extend({
  children: z.array(z.lazy(() => noteCategoryRecordWithChildrenSchema)),
  notes: z.array(noteSchema).optional(),
  _count: z.object({
    notes: z.number(),
  }).optional(),
});

export const createNoteCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  notebookId: z.string().nullable().optional(),
  themeId: z.string().nullable().optional(),
  sortIndex: z.number().int().nullable().optional(),
});

export type CreateNoteCategoryDto = z.infer<typeof createNoteCategorySchema>;
export type UpdateNoteCategoryDto = Partial<CreateNoteCategoryDto>;

export const noteTagSchema = namedDtoSchema.extend({
  name: z.string().min(1),
  color: z.string().nullable(),
  notebookId: z.string().nullable(),
});

export type NoteTagDto = z.infer<typeof noteTagSchema>;

export const createNoteTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  notebookId: z.string().nullable().optional(),
});

export type CreateNoteTagDto = z.infer<typeof createNoteTagSchema>;
export type UpdateNoteTagDto = Partial<CreateNoteTagDto>;

export const noteThemeSchema = namedDtoSchema.extend({
  name: z.string().min(1),
  notebookId: z.string().nullable(),
  textColor: z.string(),
  backgroundColor: z.string(),
  markdownHeadingColor: z.string(),
  markdownLinkColor: z.string(),
  markdownCodeBackground: z.string(),
  markdownCodeText: z.string(),
  relatedNoteBorderWidth: z.number(),
  relatedNoteBorderColor: z.string(),
  relatedNoteBackgroundColor: z.string(),
  relatedNoteTextColor: z.string(),
});

export type NoteThemeDto = z.infer<typeof noteThemeSchema>;

export const createNoteThemeSchema = z.object({
  name: z.string().min(1),
  notebookId: z.string().nullable().optional(),
  textColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  markdownHeadingColor: z.string().optional(),
  markdownLinkColor: z.string().optional(),
  markdownCodeBackground: z.string().optional(),
  markdownCodeText: z.string().optional(),
  relatedNoteBorderWidth: z.number().optional(),
  relatedNoteBorderColor: z.string().optional(),
  relatedNoteBackgroundColor: z.string().optional(),
  relatedNoteTextColor: z.string().optional(),
});

export type CreateNoteThemeDto = z.infer<typeof createNoteThemeSchema>;
export type UpdateNoteThemeDto = Partial<CreateNoteThemeDto>;

/**
 * Note Filter and File DTOs
 */

export const noteFiltersSchema = z.object({
  search: z.string().optional(),
  searchScope: z.enum(['both', 'title', 'content']).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  notebookId: z.string().nullable().optional(),
  truncateContent: z.boolean().optional(),
});

export type NoteFiltersDto = z.infer<typeof noteFiltersSchema>;

export const noteFileSchema = dtoBaseSchema.extend({
  noteId: z.string(),
  slotIndex: z.number(),
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export type NoteFileDto = z.infer<typeof noteFileSchema>;

export const createNoteFileSchema = noteFileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNoteFileDto = z.infer<typeof createNoteFileSchema>;

/**
 * Note Settings DTOs
 */

export const noteSettingsSchema = z.object({
  sortBy: z.enum(['created', 'updated', 'name']),
  sortOrder: z.enum(['asc', 'desc']),
  showTimestamps: z.boolean(),
  showBreadcrumbs: z.boolean(),
  showRelatedNotes: z.boolean(),
  searchScope: z.enum(['both', 'title', 'content']),
  selectedFolderId: z.string().nullable(),
  selectedNotebookId: z.string().nullable(),
  viewMode: z.enum(['grid', 'list']),
  gridDensity: z.union([z.literal(4), z.literal(8)]),
  autoformatOnPaste: z.boolean(),
  editorMode: z.enum(['markdown', 'wysiwyg', 'code']),
});

export type NoteSettingsDto = z.infer<typeof noteSettingsSchema>;
