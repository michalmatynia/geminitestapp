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

/**
 * Common configuration for split Markdown/HTML editors.
 */
export interface MarkdownSplitEditorOptions {
  value?: string;
  onChange?: (nextValue: string) => void;
  readOnly?: boolean;
  showPreview?: boolean;
  renderPreviewHtml?: (value: string) => string;
  sanitizePreviewHtml?: (value: string) => string;
  isCodeMode?: boolean;
  isPasting?: boolean;
  onPaste?: (event: any) => void | Promise<void>;
  textareaRef?: any;
  splitRef?: any;
  editorWidth?: number | null;
  onEditorWidthChange?: (next: number | null | ((prev: number | null) => number | null)) => void;
  isDraggingSplitter?: boolean;
  onDraggingSplitterChange?: (dragging: boolean) => void;
  contentBackground?: string;
  contentTextColor?: string;
  previewTypographyStyle?: any;
  onPreviewImageClick?: (src: string) => void;
  onCopyCodeFailure?: () => void;
  placeholder?: string;
  debounceMs?: number;
  textareaClassName?: string;
}
