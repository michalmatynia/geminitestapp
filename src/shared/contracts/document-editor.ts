import { z } from 'zod';

/**
 * Document Editor DTOs
 */

export const documentEditorModeSchema = z.enum([
  'markdown',
  'wysiwyg',
  'code',
  'rich-text',
  'plain-text',
]);
export type DocumentEditorMode = z.infer<typeof documentEditorModeSchema>;

export const richTextEditorVariantSchema = z.enum(['compact', 'full']);
export type RichTextEditorVariant = z.infer<typeof richTextEditorVariantSchema>;
