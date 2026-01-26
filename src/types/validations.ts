import { z } from 'zod';
import { productCreateSchema, productUpdateSchema } from '@/features/products/validations';
import { 
  noteCreateSchema, 
  noteUpdateSchema, 
  tagCreateSchema, 
  tagUpdateSchema, 
  categoryCreateSchema, 
  categoryUpdateSchema, 
  notebookCreateSchema, 
  notebookUpdateSchema,
  themeCreateSchema,
  themeUpdateSchema
} from '@/lib/validations/notes';

export type ProductCreateData = z.infer<typeof productCreateSchema>;
export type ProductUpdateData = z.infer<typeof productUpdateSchema>;

export type NoteCreateData = z.infer<typeof noteCreateSchema>;
export type NoteUpdateData = z.infer<typeof noteUpdateSchema>;
export type TagCreateData = z.infer<typeof tagCreateSchema>;
export type TagUpdateData = z.infer<typeof tagUpdateSchema>;
export type CategoryCreateData = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateData = z.infer<typeof categoryUpdateSchema>;
export type NotebookCreateData = z.infer<typeof notebookCreateSchema>;
export type NotebookUpdateData = z.infer<typeof notebookUpdateSchema>;
export type ThemeCreateData = z.infer<typeof themeCreateSchema>;
export type ThemeUpdateData = z.infer<typeof themeUpdateSchema>;
