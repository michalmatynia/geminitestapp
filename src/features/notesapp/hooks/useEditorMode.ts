import { useState, useEffect } from 'react';

import { logClientError } from '@/features/observability';
import type { NoteEditorType } from '@/shared/contracts/notes';
import { ApiError } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

// Why: Editor mode (markdown/wysiwyg) has complex migration logic:
// - Existing notes lock to their type
// - New notes use preferences
// - Conversion requires async HTML/Markdown transformation
// - Migration involves API calls and content updates
// Extracting this prevents NoteForm bloat and makes migrations testable.
export function useEditorMode(
  note: { id?: string; editorType?: string; content?: string; [key: string]: any } | null,
  settingsEditorMode: NoteEditorType
): {
  editorMode: NoteEditorType;
  setEditorMode: (mode: NoteEditorType) => void;
  isEditorModeLocked: boolean;
  isMigrating: boolean;
  handleMigrateToWysiwyg: (content: string, onSuccess?: () => void) => Promise<string | undefined>;
  handleMigrateToMarkdown: (content: string, onSuccess?: () => void) => Promise<string | undefined>;
} {
  const { toast } = useToast();
  const [editorMode, setEditorMode] = useState<NoteEditorType>(
    (note?.editorType as NoteEditorType) || settingsEditorMode
  );
  const [isMigrating, setIsMigrating] = useState(false);

  // Sync editor mode from note's editorType
  useEffect((): void => {
    if (note?.editorType) {
      setEditorMode(note.editorType as NoteEditorType);
    } else {
      setEditorMode(settingsEditorMode);
    }
  }, [note?.id, note?.editorType, settingsEditorMode]);

  const isEditorModeLocked = Boolean(note?.id);

  const handleEditorModeChange = (mode: NoteEditorType): void => {
    if (!note?.id) {
      setEditorMode(mode);
    }
  };

  const convertMarkdownToHtml = (markdown: string): string => {
    let html = markdown;
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html
      .split('\n\n')
      .map((p: string) => {
        if (!p.startsWith('<')) return `<p>${p}</p>`;
        return p;
      })
      .join('\n');
    return html;
  };

  const convertHtmlToMarkdown = async (html: string): Promise<string> => {
    const TurndownService = (await import('turndown')).default;
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    return turndownService.turndown(html);
  };

  const handleMigrateToWysiwyg = async (
    content: string,
    onSuccess?: () => void
  ): Promise<string | undefined> => {
    if (!note?.id) return;

    setIsMigrating(true);
    try {
      const htmlContent = convertMarkdownToHtml(content);

      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: htmlContent,
          editorType: 'wysiwyg',
        }),
      });

      if (!res.ok) {
        throw new ApiError('Failed to migrate note', res.status);
      }

      setEditorMode('wysiwyg');
      toast('Note migrated to WYSIWYG format', { variant: 'success' });
      onSuccess?.();
      return htmlContent;
    } catch (error) {
      logClientError(error, { context: { source: 'useEditorMode', action: 'migrateToWysiwyg', noteId: note.id } });
      toast('Failed to migrate note', { variant: 'error' });
      throw error;
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateToMarkdown = async (
    content: string,
    onSuccess?: () => void
  ): Promise<string | undefined> => {
    if (!note?.id) return;

    setIsMigrating(true);
    try {
      const markdownContent = await convertHtmlToMarkdown(content);

      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: markdownContent,
          editorType: 'markdown',
        }),
      });

      if (!res.ok) {
        throw new ApiError('Failed to migrate note', res.status);
      }

      setEditorMode('markdown');
      toast('Note migrated to Markdown format', { variant: 'success' });
      onSuccess?.();
      return markdownContent;
    } catch (error) {
      logClientError(error, { context: { source: 'useEditorMode', action: 'migrateToMarkdown', noteId: note.id } });
      toast('Failed to migrate note', { variant: 'error' });
      throw error;
    } finally {
      setIsMigrating(false);
    }
  };

  return {
    editorMode,
    setEditorMode: handleEditorModeChange,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
  };
}
