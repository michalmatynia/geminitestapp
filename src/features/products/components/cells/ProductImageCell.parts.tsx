'use client';

import { useState, type ChangeEvent, type KeyboardEvent, type JSX, type MouseEvent } from 'react';

import { AppModal } from '@/shared/ui/feedback.public';
import { FormActions } from '@/shared/ui/FormActions';
import { cn } from '@/shared/utils/ui-utils';

import { ProductNoteColorPicker } from './ProductImageCell.note-colors';
import {
  DEFAULT_NOTE_COLOR,
  type ResolvedProductNote,
} from './ProductImageCell.helpers';
import type { ProductImageCellController } from './ProductImageCell.controller';
import { ProductImagePreviewTrigger } from './ProductImageCell.preview-trigger';

type PreviewController = Pick<
  ProductImageCellController,
  'hidePreview' | 'openNoteModal' | 'showPreview' | 'unoptimized' | 'updatePreview'
>;

interface ProductImageFrameProps extends PreviewController {
  imageUrl: string | null;
  productName: string;
  resolvedNote: ResolvedProductNote | null;
}

interface ProductNoteModalProps {
  controller: ProductImageCellController;
  productName: string;
}

const NOTE_PEEK_TARGET_WIDTH = 20;
const NOTE_RESTING_PEEK_CLASS = '-translate-x-2';
const NOTE_PEEK_CLASS = '-translate-x-3';

function isPointerLeftOfThumbnail(event: MouseEvent<HTMLDivElement>): boolean {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX - rect.left < 0;
}

function ProductNotePeekTarget({
  controller,
  onPeek,
  productName,
  resolvedNote,
}: {
  controller: PreviewController;
  onPeek: () => void;
  productName: string;
  resolvedNote: ResolvedProductNote | null;
}): JSX.Element {
  return (
    <div
      aria-hidden='true'
      className='absolute right-full top-0 z-0 h-16 cursor-pointer'
      style={{ width: `${NOTE_PEEK_TARGET_WIDTH}px` }}
      onMouseEnter={(event) => {
        onPeek();
        if (resolvedNote === null) {
          controller.hidePreview();
          return;
        }
        controller.showPreview({
          kind: 'note',
          productName,
          noteText: resolvedNote.text,
          noteColor: resolvedNote.color,
          event,
        });
      }}
    />
  );
}

function ProductNoteHandle({
  controller,
  isPeekActive,
  noteColor,
  productName,
  resolvedNote,
}: {
  controller: PreviewController;
  isPeekActive: boolean;
  noteColor: string;
  productName: string;
  resolvedNote: ResolvedProductNote | null;
}): JSX.Element {
  const isExistingNote = resolvedNote !== null;
  const ariaLabel = isExistingNote ? `View note for ${productName}` : `Add note for ${productName}`;
  const noteText = resolvedNote?.text ?? '';
  const resolvedNoteColor = resolvedNote?.color ?? noteColor;

  return (
    <button
      type='button'
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-haspopup='dialog'
      className={cn(
        'absolute left-0 top-1/2 z-0 h-11 w-11 -translate-y-1/2 translate-x-0 cursor-pointer rounded-l-sm rounded-r-md border border-black/10',
        'shadow-[0_8px_18px_rgba(15,23,42,0.14)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none',
        'focus-visible:-translate-x-3 focus-visible:shadow-[0_12px_30px_rgba(15,23,42,0.28)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        isExistingNote && NOTE_RESTING_PEEK_CLASS,
        isPeekActive && `${NOTE_PEEK_CLASS} shadow-[0_12px_30px_rgba(15,23,42,0.28)]`
      )}
      style={{ backgroundColor: resolvedNoteColor }}
      onMouseEnter={(event) => {
        if (resolvedNote === null) return;
        controller.showPreview({
          kind: 'note',
          productName,
          noteText: resolvedNote.text,
          noteColor: resolvedNote.color,
          event,
        });
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        controller.openNoteModal(noteText);
      }}
    />
  );
}

export function ProductImageFrame({
  hidePreview,
  imageUrl,
  openNoteModal,
  productName,
  resolvedNote,
  showPreview,
  unoptimized,
  updatePreview,
}: ProductImageFrameProps): JSX.Element {
  const controller = { hidePreview, openNoteModal, showPreview, unoptimized, updatePreview };
  const [isNotePeekActive, setIsNotePeekActive] = useState(false);
  const noteColor = resolvedNote?.color ?? DEFAULT_NOTE_COLOR;

  const updateNotePeek = (event: MouseEvent<HTMLDivElement>): void => {
    const nextIsNotePeekActive = isPointerLeftOfThumbnail(event);
    setIsNotePeekActive((previous) =>
      previous === nextIsNotePeekActive ? previous : nextIsNotePeekActive
    );
  };

  return (
    <div
      className='isolate relative inline-flex h-16 w-16 items-center justify-end overflow-visible'
      onMouseEnter={updateNotePeek}
      onMouseLeave={() => {
        setIsNotePeekActive(false);
        hidePreview();
      }}
      onMouseMove={(event) => {
        updateNotePeek(event);
        updatePreview(event);
      }}
    >
      <ProductNotePeekTarget
        controller={controller}
        onPeek={() => setIsNotePeekActive(true)}
        productName={productName}
        resolvedNote={resolvedNote}
      />
      <ProductNoteHandle
        controller={controller}
        isPeekActive={isNotePeekActive}
        noteColor={noteColor}
        productName={productName}
        resolvedNote={resolvedNote}
      />
      <ProductImagePreviewTrigger
        imageUrl={imageUrl}
        productName={productName}
        showPreview={showPreview}
        unoptimized={unoptimized}
      />
    </div>
  );
}

function ProductNoteModalHeader({
  controller,
  productName,
}: ProductNoteModalProps): JSX.Element {
  return (
    <div className='flex flex-col gap-3 text-slate-900 lg:flex-row lg:items-start lg:justify-between'>
      <div className='min-w-0'>
        <div className='flex min-w-0 items-center gap-2'>
          <FormActions
            onSave={() => {
              void controller.saveNote();
            }}
            saveText='Save'
            saveVariant={controller.hasDraftChanges ? 'success' : 'outline'}
            isSaving={controller.isSavingNote}
            isDisabled={controller.hasDraftChanges === false || controller.isSavingNote}
            className='mr-2'
          />
          <h2 className='truncate text-lg font-semibold leading-tight'>Product note</h2>
        </div>
        <p className='mt-1 truncate text-xs text-slate-700'>{productName}</p>
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <FormActions
          onCancel={controller.cancelNoteModal}
          cancelText='Cancel'
          isSaving={controller.isSavingNote}
          isDisabled={controller.isSavingNote}
        />
      </div>
    </div>
  );
}

function ProductNoteTextarea({ controller, productName }: ProductNoteModalProps): JSX.Element {
  return (
    <textarea
      value={controller.draftNoteText}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
        controller.setDraftNoteText(event.target.value);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          void controller.saveNote();
        }
      }}
      disabled={controller.isSavingNote}
      aria-label={`Edit note for ${productName}`}
      className='block min-h-56 w-full resize-none border-0 border-t border-black/10 bg-transparent px-6 py-5 text-sm leading-relaxed text-slate-900 outline-none ring-0 placeholder:text-slate-700/50 focus:border-t-black/20 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-70'
      placeholder='Write an internal product note...'
    />
  );
}

export function ProductNoteModal({
  controller,
  productName,
}: ProductNoteModalProps): JSX.Element {
  return (
    <AppModal
      open={controller.noteModalOpen}
      onClose={controller.cancelNoteModal}
      title='Product note'
      titleHidden
      description={`Internal product note for ${productName}`}
      size='sm'
      padding='none'
      showClose={false}
      closeOnOutside={controller.isSavingNote === false}
      closeOnEscape={controller.isSavingNote === false}
      className='overflow-hidden border-black/10 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.32)]'
      bodyClassName='p-0'
      style={{ backgroundColor: controller.noteColor }}
      header={<ProductNoteModalHeader controller={controller} productName={productName} />}
    >
      <ProductNoteColorPicker controller={controller} />
      <ProductNoteTextarea controller={controller} productName={productName} />
    </AppModal>
  );
}
