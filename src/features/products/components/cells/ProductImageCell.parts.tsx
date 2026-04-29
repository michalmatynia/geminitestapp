'use client';

import Image from 'next/image';
import type { ChangeEvent, KeyboardEvent, JSX } from 'react';

import { AppModal } from '@/shared/ui/feedback.public';
import { FormActions } from '@/shared/ui/FormActions';
import MissingImagePlaceholder from '@/shared/ui/missing-image-placeholder';
import { cn } from '@/shared/utils/ui-utils';

import {
  BLUR_PLACEHOLDER,
  hasImageUrl,
  type ResolvedProductNote,
} from './ProductImageCell.helpers';
import type { ProductImageCellController } from './ProductImageCell.controller';

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

function ProductNoteHandle({
  controller,
  productName,
  resolvedNote,
}: {
  controller: PreviewController;
  productName: string;
  resolvedNote: ResolvedProductNote;
}): JSX.Element {
  return (
    <button
      type='button'
      aria-label={`View note for ${productName}`}
      title={`View note for ${productName}`}
      aria-haspopup='dialog'
      className={cn(
        'absolute left-0 top-1/2 z-0 h-11 w-8 -translate-y-1/2 -translate-x-[12px] cursor-pointer rounded-l-sm rounded-r-md border border-black/10',
        'shadow-[0_10px_24px_rgba(15,23,42,0.22)] transition-[width,transform,box-shadow] duration-300 ease-in-out',
        'hover:w-11 focus-visible:w-11',
        'hover:-translate-x-[16px] focus-visible:-translate-x-[16px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
      )}
      style={{ backgroundColor: resolvedNote.color }}
      onMouseEnter={(event) => {
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
        controller.openNoteModal(resolvedNote.text);
      }}
    />
  );
}

function ProductImagePreviewTrigger({
  imageUrl,
  productName,
  showPreview,
  unoptimized,
}: {
  imageUrl: string | null;
  productName: string;
  showPreview: ProductImageCellController['showPreview'];
  unoptimized: boolean;
}): JSX.Element {
  const previewImageUrl = hasImageUrl(imageUrl) ? imageUrl : null;

  return (
    <div
      className='group/image relative z-10 h-16 w-16'
      onMouseEnter={(event) => {
        if (previewImageUrl === null) return;
        showPreview({
          kind: 'image',
          imageUrl: previewImageUrl,
          productName,
          unoptimized,
          event,
        });
      }}
    >
      {previewImageUrl !== null ? (
        <>
          <Image
            src={previewImageUrl}
            alt={productName}
            fill
            sizes='64px'
            unoptimized={unoptimized}
            placeholder='blur'
            blurDataURL={BLUR_PLACEHOLDER}
            className='cursor-pointer rounded-md object-cover transition-[filter] duration-300 ease-in-out group-hover/image:brightness-70 group-hover/image:contrast-110'
            quality={75}
          />
          <div className='pointer-events-none absolute inset-0 rounded-md bg-[radial-gradient(circle,transparent_38%,rgba(15,23,42,0.58)_100%)] opacity-0 transition-opacity duration-300 ease-in-out group-hover/image:opacity-100' />
        </>
      ) : (
        <MissingImagePlaceholder className='size-16' />
      )}
    </div>
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

  return (
    <div
      className='relative inline-flex h-16 w-16 items-center justify-end overflow-visible'
      onMouseLeave={hidePreview}
      onMouseMove={(event) => {
        updatePreview(event);
      }}
    >
      {resolvedNote !== null ? (
        <ProductNoteHandle
          controller={controller}
          productName={productName}
          resolvedNote={resolvedNote}
        />
      ) : null}
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
      <ProductNoteTextarea controller={controller} productName={productName} />
    </AppModal>
  );
}
