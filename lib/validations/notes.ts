import { z } from "zod";

export const noteCreateSchema = z
  .object({
    title: z.string().min(1),
    content: z.string().min(1),
    color: z.string().nullable().optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    tagIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    relatedNoteIds: z.array(z.string()).optional(),
    notebookId: z.string().nullable().optional(),
  })
  .strict();

export const noteUpdateSchema = noteCreateSchema.partial().strict();

export type NoteCreateData = z.infer<typeof noteCreateSchema>;
export type NoteUpdateData = z.infer<typeof noteUpdateSchema>;

export const tagCreateSchema = z
  .object({
    name: z.string().min(1),
    color: z.string().nullable().optional(),
    notebookId: z.string().nullable().optional(),
  })
  .strict();

export const tagUpdateSchema = tagCreateSchema.partial().strict();

export type TagCreateData = z.infer<typeof tagCreateSchema>;
export type TagUpdateData = z.infer<typeof tagUpdateSchema>;

export const categoryCreateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    notebookId: z.string().nullable().optional(),
  })
  .strict();

export const categoryUpdateSchema = categoryCreateSchema.partial().strict();

export type CategoryCreateData = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateData = z.infer<typeof categoryUpdateSchema>;

export const notebookCreateSchema = z
  .object({
    name: z.string().min(1),
    color: z.string().nullable().optional(),
  })
  .strict();

export const notebookUpdateSchema = notebookCreateSchema.partial().strict();

export type NotebookCreateData = z.infer<typeof notebookCreateSchema>;
export type NotebookUpdateData = z.infer<typeof notebookUpdateSchema>;
