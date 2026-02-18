import { z } from 'zod';

/**
 * Document Editor DTOs
 */

export const documentEditorModeSchema = z.enum(['markdown', 'wysiwyg', 'code']);
export type DocumentEditorModeDto = z.infer<typeof documentEditorModeSchema>;

export const richTextEditorVariantSchema = z.enum(['compact', 'full']);
export type RichTextEditorVariantDto = z.infer<typeof richTextEditorVariantSchema>;
