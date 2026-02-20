'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback } from 'react';

import { MarkdownToolbarActionsProvider } from '@/features/notesapp/context/MarkdownToolbarActionsContext';
import { useNoteFormContext, NoteFormProvider } from '@/features/notesapp/context/NoteFormContext';
import type { NoteFormProps } from '@/shared/contracts/notes/notes-ui';
import { Button, Input, FormField, Dialog, DialogContent, DialogTitle } from '@/shared/ui';

import { FileAttachments } from './editor/FileAttachments';
import { MarkdownEditor } from './editor/MarkdownEditor';
import { MarkdownToolbar } from './editor/MarkdownToolbar';
import { NoteMetadata } from './editor/NoteMetadata';
import { WysiwygEditor } from './editor/WysiwygEditor';

type NoteFormViewContextValue = {
  formRef?: React.RefObject<HTMLFormElement | null> | undefined;
};

const NoteFormViewContext = React.createContext<NoteFormViewContextValue>({});

function useNoteFormViewContext(): NoteFormViewContextValue {
  return React.useContext(NoteFormViewContext);
}

function NoteFormInner(): React.JSX.Element {
  const { formRef } = useNoteFormViewContext();
  const {
    note,
    content,
    setContent,
    title,
    setTitle,
    editorMode,
    handleSubmit,
    lightboxImage,
    setLightboxImage,
    contentRef,
  } = useNoteFormContext();

  const applyWrap = useCallback((prefix: string, suffix: string, placeholder: string): void => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const nextValue =
      content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [content, setContent, contentRef]);

  const insertAtCursor = useCallback((value: string): void => {
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
  }, [content, setContent, contentRef]);

  const applyLinePrefix = useCallback((prefix: string): void => {
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
  }, [content, setContent, contentRef]);

  const applySpanStyle = useCallback((colorValue: string, fontValue: string): void => {
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
    const nextValue =
      content.slice(0, start) + wrapped + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor = selected.length > 0 
        ? start + wrapped.length 
        : start + openingTag.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [content, setContent, contentRef]);

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

  const markdownToolbarActions = React.useMemo(() => ({
    onApplyWrap: applyWrap,
    onApplyLinePrefix: applyLinePrefix,
    onInsertAtCursor: insertAtCursor,
    onApplyBulletList: applyBulletList,
    onApplyChecklist: applyChecklist,
    onApplySpanStyle: applySpanStyle,
  }), [
    applyWrap,
    applyLinePrefix,
    insertAtCursor,
    applyBulletList,
    applyChecklist,
    applySpanStyle,
  ]);

  return (
    <>
      <form
        id={note ? 'note-edit-form' : undefined}
        ref={formRef}
        onSubmit={(e: React.FormEvent): void => { void handleSubmit(e); }}
        className='space-y-6'
      >      

        <FormField label='Title'>
          <Input
            type='text'
            placeholder='Enter note title'
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
            className='w-full rounded-lg border bg-gray-800 px-4 py-2 text-white text-lg font-semibold placeholder:text-gray-500 focus:border-blue-500 focus:outline-none h-12'
            required
          />
        </FormField>

        <FormField label='Content'>
          <MarkdownToolbarActionsProvider value={markdownToolbarActions}>
            <MarkdownToolbar />
          </MarkdownToolbarActionsProvider>
          <div className='mt-2'>
            {editorMode === 'markdown' || editorMode === 'code' ? (
              <MarkdownEditor isCodeMode={editorMode === 'code'} />
            ) : (
              <WysiwygEditor />
            )}
          </div>
        </FormField>

        <FileAttachments />

        <NoteMetadata showTitle={false} />
      </form>

      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className='max-w-screen-xl border-none bg-black/90 p-0 shadow-none sm:max-w-screen-xl'>
          <DialogTitle className='sr-only'>Image Preview</DialogTitle>
          <div className='relative h-[90vh] w-[90vw]'>
            {lightboxImage && (
              <Image
                src={lightboxImage}
                alt='Lightbox preview'
                fill
                sizes='90vw'
                className='object-contain'
              />
            )}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute right-4 top-4 rounded-full bg-black/20 text-white hover:bg-black/40'
              onClick={() => setLightboxImage(null)}
            >
              <X size={24} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NoteForm({
  note,
  onSuccess,
  formRef,
}: NoteFormProps & {
  formRef?: React.RefObject<HTMLFormElement | null> | undefined;
}): React.JSX.Element {
  const viewContextValue = React.useMemo(
    () => ({
      formRef: formRef ?? undefined,
    }),
    [formRef]
  );

  return (
    <NoteFormProvider note={note ?? null} onSuccess={onSuccess}>
      <NoteFormViewContext.Provider value={viewContextValue}>
        <NoteFormInner />
      </NoteFormViewContext.Provider>
    </NoteFormProvider>
  );
}
