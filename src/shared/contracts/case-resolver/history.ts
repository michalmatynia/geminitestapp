import { z } from 'zod';

/**
 * Case Resolver History
 */
export const caseResolverDocumentHistoryEntrySchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  documentContentVersion: z.number(),
  activeDocumentVersion: z.enum(['original', 'exploded']),
  editorType: z.enum(['wysiwyg', 'markdown', 'code', 'rich-text', 'plain-text']),
  documentContent: z.string(),
  documentContentMarkdown: z.string().optional(),
  documentContentHtml: z.string().optional(),
  documentContentPlainText: z.string().optional(),
  documentId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
});

export interface CaseResolverDocumentHistoryEntry {
  id: string;
  savedAt: string;
  documentContentVersion: number;
  activeDocumentVersion: 'original' | 'exploded';
  editorType: 'wysiwyg' | 'markdown' | 'code' | 'rich-text' | 'plain-text';
  documentContent: string;
  documentContentMarkdown?: string | undefined;
  documentContentHtml?: string | undefined;
  documentContentPlainText?: string | undefined;
  documentId?: string | undefined;
  userId?: string | undefined;
  action?: string | undefined;
  changes?: Record<string, unknown> | undefined;
  timestamp?: string | undefined;
}
