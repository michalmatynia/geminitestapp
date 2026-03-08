'use client';

import React, { useMemo } from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import { sanitizeHtml } from '@/shared/utils';
import { useToast } from '@/shared/ui';
import { renderMarkdownToHtml } from '../../utils';
import { NoteDetailRelatedNotes } from './NoteDetailRelatedNotes';

export function NoteDetailPreview(): React.JSX.Element | null {
  const { selectedNote, selectedNoteTheme } = useNotesAppState();
  const { setIsEditing } = useNotesAppActions();

  if (!selectedNote) return null;

  const { toast } = useToast();

  const getReadableTextColor = (hexColor: string): string => {
    const normalized = hexColor.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return '#f8fafc';
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? '#0f172a' : '#f8fafc';
  };

  const fallbackTheme = useMemo(
    () => ({
      textColor: '#e5e7eb',
      backgroundColor: '#111827',
      markdownHeadingColor: '#f9fafb',
      markdownLinkColor: '#93c5fd',
      markdownCodeBackground: '#1f2937',
      markdownCodeText: '#e5e7eb',
      relatedNoteBorderWidth: 1,
      relatedNoteBorderColor: '#374151',
      relatedNoteBackgroundColor: '#1f2937',
      relatedNoteTextColor: '#e5e7eb',
    }),
    []
  );

  const effectivePreviewTheme = selectedNoteTheme ?? fallbackTheme;

  const previewStyle = useMemo((): React.CSSProperties => {
    const normalizedColor = selectedNote?.color?.toLowerCase().trim();
    const isDefaultColor = !normalizedColor || normalizedColor === '#ffffff';
    const color = !isDefaultColor
      ? (normalizedColor ?? selectedNote?.color ?? effectivePreviewTheme.backgroundColor)
      : effectivePreviewTheme.backgroundColor ||
        normalizedColor ||
        selectedNote?.color ||
        '#1f2937';
    const hex = color.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return { backgroundColor: color };
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const borderColor = luminance > 0.78 ? 'rgba(15, 23, 42, 0.35)' : 'rgba(148, 163, 184, 0.2)';
    return {
      backgroundColor: color,
      borderColor,
      boxShadow: luminance > 0.78 ? '0 0 0 1px rgba(15, 23, 42, 0.12)' : undefined,
    };
  }, [selectedNote?.color, effectivePreviewTheme.backgroundColor]);

  const previewTextColor = useMemo((): string => {
    const normalizedColor = selectedNote?.color?.toLowerCase().trim();
    const isDefaultColor = !normalizedColor || normalizedColor === '#ffffff';
    const background = !isDefaultColor
      ? (normalizedColor ?? selectedNote?.color ?? effectivePreviewTheme.backgroundColor)
      : effectivePreviewTheme.backgroundColor ||
        normalizedColor ||
        selectedNote?.color ||
        '#1f2937';
    if (effectivePreviewTheme.textColor && !isDefaultColor) {
      return getReadableTextColor(background);
    }
    return effectivePreviewTheme.textColor ?? getReadableTextColor(background);
  }, [selectedNote?.color, effectivePreviewTheme.backgroundColor, effectivePreviewTheme.textColor]);

  const previewTypographyStyle = useMemo(
    () => ({
      color: previewTextColor,
      ['--tw-prose-body' as never]: previewTextColor,
      ['--tw-prose-headings' as never]:
        effectivePreviewTheme.markdownHeadingColor ?? previewTextColor,
      ['--tw-prose-lead' as never]: previewTextColor,
      ['--tw-prose-bold' as never]: previewTextColor,
      ['--tw-prose-counters' as never]: previewTextColor,
      ['--tw-prose-bullets' as never]: previewTextColor,
      ['--tw-prose-quotes' as never]: previewTextColor,
      ['--tw-prose-quote-borders' as never]: 'rgba(148, 163, 184, 0.35)',
      ['--tw-prose-hr' as never]: 'rgba(148, 163, 184, 0.35)',
      ['--note-link-color' as never]: effectivePreviewTheme.markdownLinkColor ?? '#38bdf8',
      ['--note-code-bg' as never]: effectivePreviewTheme.markdownCodeBackground ?? '#0f172a',
      ['--note-code-text' as never]: effectivePreviewTheme.markdownCodeText ?? '#e2e8f0',
      ['--note-inline-code-bg' as never]:
        effectivePreviewTheme.markdownCodeBackground ?? 'rgba(15, 23, 42, 0.12)',
    }),
    [previewTextColor, effectivePreviewTheme]
  );

  const contentRenderer = renderMarkdownToHtml as (val: string) => string;
  const previewContentRef = React.useRef<HTMLDivElement | null>(null);
  const copyResetTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const previewContent = previewContentRef.current;
    if (!previewContent) return;

    const revealCopyButton = (event: MouseEvent, visible: boolean): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const wrapper = target.closest('[data-code]');
      const button = wrapper?.querySelector('[data-copy-code]');
      if (button instanceof HTMLElement) {
        button.style.opacity = visible ? '1' : '0';
      }
    };

    const handleClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const copyButton = target.closest('[data-copy-code]');
      if (!(copyButton instanceof HTMLButtonElement)) return;
      const wrapper = copyButton.closest('[data-code]');
      const encoded = wrapper?.getAttribute('data-code');
      if (!encoded) return;
      const originalLabel = copyButton.textContent;
      void navigator.clipboard
        .writeText(decodeURIComponent(encoded))
        .then((): void => {
          copyButton.textContent = 'Copied';
          if (copyResetTimeoutRef.current !== null) {
            window.clearTimeout(copyResetTimeoutRef.current);
          }
          copyResetTimeoutRef.current = window.setTimeout((): void => {
            copyResetTimeoutRef.current = null;
            copyButton.textContent = originalLabel ?? 'Copy';
          }, 1500);
        })
        .catch((): void => {
          toast('Failed to copy code', { variant: 'error' });
        });
    };

    const handleMouseOver = (event: MouseEvent): void => revealCopyButton(event, true);
    const handleMouseOut = (event: MouseEvent): void => revealCopyButton(event, false);

    previewContent.addEventListener('mouseover', handleMouseOver);
    previewContent.addEventListener('mouseout', handleMouseOut);
    previewContent.addEventListener('click', handleClick);

    return (): void => {
      previewContent.removeEventListener('mouseover', handleMouseOver);
      previewContent.removeEventListener('mouseout', handleMouseOut);
      previewContent.removeEventListener('click', handleClick);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
        copyResetTimeoutRef.current = null;
      }
    };
  }, [toast]);

  return (
    <div
      className='flex-1 overflow-y-auto rounded-lg border border-border/60 bg-card/40 p-6 cursor-text'
      onDoubleClick={() => setIsEditing(true)}
      style={previewStyle}
    >
      <h1 className='mb-4 text-3xl font-bold' style={{ color: previewTextColor }}>
        {selectedNote.title}
      </h1>
      <div
        ref={previewContentRef}
        className='prose max-w-none'
        style={previewTypographyStyle}
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(
            typeof selectedNote.editorType === 'string' && selectedNote.editorType === 'wysiwyg'
              ? selectedNote.content
              : contentRenderer(selectedNote.content)
          ),
        }}
      />

      <NoteDetailRelatedNotes />

      <div className='mt-8 pt-4 border-t border-border flex gap-6 text-sm text-gray-500'>
        <span>Created: {new Date(selectedNote.createdAt || 0).toLocaleString()}</span>
        <span>
          Modified:{' '}
          {selectedNote.updatedAt
            ? new Date(selectedNote.updatedAt || 0).toLocaleString()
            : 'Never'}
        </span>
      </div>
    </div>
  );
}
