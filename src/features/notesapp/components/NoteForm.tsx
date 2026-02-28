'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { MarkdownToolbarActionsProvider } from '@/features/notesapp/context/MarkdownToolbarActionsContext';
import { useNoteFormContext, NoteFormProvider } from '@/features/notesapp/context/NoteFormContext';
import type { NoteFormProps } from '@/shared/contracts/notes';
import { Button, Input, FormField, Dialog, DialogContent, DialogTitle } from '@/shared/ui';

import { FileAttachments } from './editor/FileAttachments';
import { MarkdownEditor } from './editor/MarkdownEditor';
import { MarkdownToolbar } from './editor/MarkdownToolbar';
import { NoteMetadata } from './editor/NoteMetadata';
import { WysiwygEditor } from './editor/WysiwygEditor';

import { useMarkdownEditor } from '@/features/notesapp/hooks/useMarkdownEditor';

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

  const markdownToolbarActions = useMarkdownEditor({
    content,
    setContent,
    contentRef,
  });

  return (
    <>
      <form
        id={note ? 'note-edit-form' : undefined}
        ref={formRef}
        onSubmit={(e: React.FormEvent): void => {
          void handleSubmit(e);
        }}
        className='space-y-6'
      >
        <FormField label='Title'>
          <Input
            type='text'
            placeholder='Enter note title'
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
            className='w-full rounded-lg border bg-card/40 px-4 py-2 text-white text-lg font-semibold placeholder:text-gray-500 focus:border-blue-500 focus:outline-none h-12'
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
