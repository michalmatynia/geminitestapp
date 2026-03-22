'use client';

import { useCallback } from 'react';

import type { MarkdownToolbarActionHandlers as UseMarkdownEditorReturn } from '@/features/document-editor/public';

export type UseMarkdownEditorProps = {
  content: string;
  setContent: (value: string) => void;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
};

export type { UseMarkdownEditorReturn };

export function useMarkdownEditor({
  content,
  setContent,
  contentRef,
}: UseMarkdownEditorProps): UseMarkdownEditorReturn {
  const applyWrap = useCallback(
    (prefix: string, suffix: string, placeholder: string): void => {
      const textarea = contentRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end) || placeholder;
      const nextValue = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
      setContent(nextValue);
      requestAnimationFrame((): void => {
        const cursor = start + prefix.length + selected.length + suffix.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [content, setContent, contentRef]
  );

  const insertAtCursor = useCallback(
    (value: string): void => {
      const textarea = contentRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = content.slice(0, start) + value + content.slice(end);
      setContent(nextValue);
      requestAnimationFrame((): void => {
        const cursor = start + value.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [content, setContent, contentRef]
  );

  const applyLinePrefix = useCallback(
    (prefix: string): void => {
      const textarea = contentRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const blockStart = content.lastIndexOf('\n', start - 1) + 1;
      const blockEndIndex = content.indexOf('\n', end);
      const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
      const block = content.slice(blockStart, blockEnd);
      const updated = block
        .split(/\r?\n/)
        .map((line: string): string => (line.trim().length ? `${prefix}${line}` : line))
        .join('\n');
      const nextValue = content.slice(0, blockStart) + updated + content.slice(blockEnd);
      setContent(nextValue);
      requestAnimationFrame((): void => {
        textarea.focus();
        textarea.setSelectionRange(blockStart, blockStart + updated.length);
      });
    },
    [content, setContent, contentRef]
  );

  const applySpanStyle = useCallback(
    (colorValue: string, fontValue: string): void => {
      const textarea = contentRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end);
      const styleParts: string[] = [];
      if (colorValue) {
        styleParts.push(`color: ${colorValue}`);
      }
      if (fontValue && fontValue !== 'inherit') {
        styleParts.push(`font-family: ${fontValue}`);
      }
      const styleAttribute = styleParts.length > 0 ? ` style=" ${styleParts.join('; ')}"` : '';
      const openingTag = `<span${styleAttribute}>`;
      const closingTag = '</span>';
      const wrapped = `${openingTag}${selected}${closingTag}`;
      const nextValue = content.slice(0, start) + wrapped + content.slice(end);
      setContent(nextValue);
      requestAnimationFrame((): void => {
        const cursor = selected.length > 0 ? start + wrapped.length : start + openingTag.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [content, setContent, contentRef]
  );

  const applyBulletList = useCallback(() => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      const insert = '- ';
      const nextValue = content.slice(0, start) + insert + content.slice(end);
      setContent(nextValue);
      requestAnimationFrame((): void => {
        const cursor = start + insert.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
      return;
    }

    const blockStart = content.lastIndexOf('\n', start - 1) + 1;
    const blockEndIndex = content.indexOf('\n', end);
    const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block = content.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().startsWith('- ') ? line : `- ${line}`))
      .join('\n');
    const nextValue = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  }, [content, setContent, contentRef]);

  const applyChecklist = useCallback(() => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const blockStart = content.lastIndexOf('\n', start - 1) + 1;
    const blockEndIndex = content.indexOf('\n', end);
    const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block = content.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().startsWith('- [') ? line : `- [ ] ${line}`))
      .join('\n');
    const nextValue = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  }, [content, setContent, contentRef]);

  return {
    onApplyWrap: applyWrap,
    onApplyLinePrefix: applyLinePrefix,
    onInsertAtCursor: insertAtCursor,
    onApplyBulletList: applyBulletList,
    onApplyChecklist: applyChecklist,
    onApplySpanStyle: applySpanStyle,
  };
}
