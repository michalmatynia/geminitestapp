'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import {
  NoteFormProvider,
  useNoteEditorContext,
  useNoteFilesContext,
  useNoteFormRuntime,
  useNoteMetadataContext,
} from '@/features/notesapp/context/NoteFormContext';
import type { NoteFormProps } from '@/shared/contracts/notes';
import { Button, Input, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';

import { FileAttachments } from './editor/FileAttachments';
import { MarkdownEditor } from './editor/MarkdownEditor';
import { NoteMetadata } from './editor/NoteMetadata';
import { NotesMarkdownToolbar } from './editor/NotesMarkdownToolbar';
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
  const { note, handleSubmit } = useNoteFormRuntime();
  const { title, setTitle } = useNoteMetadataContext();
  const { editorMode } = useNoteEditorContext();
  const { lightboxImage, setLightboxImage } = useNoteFilesContext();

  return (
    <>
      <form
        id={note ? 'note-edit-form' : undefined}
        ref={formRef}
        onSubmit={(e: React.FormEvent): void => {
          void handleSubmit(e);
        }}
      >
        <FormSection className='p-0 border-none shadow-none bg-transparent space-y-6'>
          <FormField label='Title'>
            <Input
              type='text'
              placeholder='Enter note title'
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
              className='w-full rounded-lg border bg-card/40 px-4 py-2 text-white text-lg font-semibold placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background h-12'
              required
             aria-label='Enter note title' title='Enter note title'/>
          </FormField>

          <FormField label='Content'>
            <NotesMarkdownToolbar />
            <div className='mt-2'>
              {editorMode === 'markdown' || editorMode === 'code' ? (
                <MarkdownEditor />
              ) : (
                <WysiwygEditor />
              )}
            </div>
          </FormField>

          <FileAttachments />

          <NoteMetadata showTitle={false} />
        </FormSection>
      </form>

      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className='max-w-screen-xl border-none bg-black/90 p-0 shadow-none sm:max-w-screen-xl'>
          <DialogTitle className='sr-only'>Image Preview</DialogTitle>
          <DialogDescription className='sr-only'>
            Full-screen preview of the selected note attachment.
          </DialogDescription>
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
              aria-label='Close image preview'
              title='Close image preview'
            >
              <X size={24} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NoteForm(
  props: NoteFormProps & {
    formRef?: React.RefObject<HTMLFormElement | null> | undefined;
  }
): React.JSX.Element {
  const { note, onSuccess, formRef } = props;

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
