'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

import { updateProduct } from '@/features/products/api';
import { useProductImagePreview } from '@/features/products/context/ProductImagePreviewContext';
import {
  normalizeProductNotes,
  type ProductWithImages,
} from '@/shared/contracts/products/product';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { AppModal } from '@/shared/ui/feedback.public';
import { FormActions } from '@/shared/ui/FormActions';
import MissingImagePlaceholder from '@/shared/ui/missing-image-placeholder';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

type ProductNoteValue = {
  text?: string | null;
  color?: string | null;
} | null | undefined;

interface ProductImageCellProps {
  imageUrl: string | null;
  productId: string;
  productName: string;
  note?: ProductNoteValue;
}

type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[] }
  | null
  | undefined;

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzJhIi8+PC9zdmc+';
const DEFAULT_NOTE_COLOR = '#f5e7c3';

const shouldSkipOptimization = (url: string): boolean => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (url.startsWith('/')) return false;

  try {
    const { hostname } = new URL(url);
    if (
      hostname === 'ik.imagekit.io' ||
      hostname === 'upload.cdn.baselinker.com' ||
      hostname === 'milkbardesigners.com'
    ) {
      return false;
    }
  } catch {
    return true;
  }

  return true;
};

const normalizeNoteText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeNoteColor = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return DEFAULT_NOTE_COLOR;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_NOTE_COLOR;
};

const resolveProductNote = (
  note: ProductNoteValue
): { text: string; color: string } | null => {
  if (!note) return null;

  const text = normalizeNoteText(note.text);
  if (!text) return null;
  const color = normalizeNoteColor(note.color);

  return {
    text,
    color,
  };
};

const mergeProductIntoListCache = (
  cacheValue: ProductListCacheValue,
  savedProduct: ProductWithImages
): ProductListCacheValue => {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === savedProduct.id ? { ...product, ...savedProduct } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === savedProduct.id ? { ...product, ...savedProduct } : product
      ),
    };
  }
  return cacheValue;
};

const applySavedProductNoteOverride = (
  savedProduct: ProductWithImages,
  noteOverride?: ProductNoteValue
): ProductWithImages =>
  noteOverride === undefined
    ? savedProduct
    : {
        ...savedProduct,
        notes: normalizeProductNotes(noteOverride),
      };

export const ProductImageCell = React.memo(({
  imageUrl,
  productId,
  productName,
  note,
}: ProductImageCellProps): React.JSX.Element => {
  const { showPreview, updatePreview, hidePreview } = useProductImagePreview();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [draftNoteText, setDraftNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const unoptimized = useMemo(
    () => (imageUrl ? shouldSkipOptimization(imageUrl) : false),
    [imageUrl]
  );
  const resolvedNote = useMemo(() => resolveProductNote(note), [note]);
  const noteColor = resolvedNote?.color ?? DEFAULT_NOTE_COLOR;
  const hasDraftChanges = Boolean(resolvedNote && draftNoteText !== resolvedNote.text);

  useEffect(() => {
    if (noteModalOpen && resolvedNote) {
      setDraftNoteText(resolvedNote.text);
    }
  }, [noteModalOpen, resolvedNote]);

  const syncSavedProduct = (
    savedProduct: ProductWithImages,
    noteOverride?: ProductNoteValue
  ): void => {
    const mergedSavedProduct = applySavedProductNoteOverride(savedProduct, noteOverride);
    queryClient.setQueriesData({ queryKey: QUERY_KEYS.products.lists() }, (old: ProductListCacheValue) =>
      mergeProductIntoListCache(old, mergedSavedProduct)
    );
    queryClient.setQueryData(QUERY_KEYS.products.detail(savedProduct.id), mergedSavedProduct);
    queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), mergedSavedProduct);
  };

  const saveNote = async (options: { closeAfter?: boolean } = {}): Promise<void> => {
    if (!resolvedNote || isSavingNote) {
      if (options.closeAfter) setNoteModalOpen(false);
      return;
    }

    const nextText = draftNoteText.trim();
    if (nextText === resolvedNote.text) {
      if (options.closeAfter) setNoteModalOpen(false);
      return;
    }

    try {
      setIsSavingNote(true);
      const nextNotes = nextText
        ? { text: nextText, color: resolvedNote.color }
        : null;
      const savedProduct = await updateProduct(productId, {
        notes: nextNotes ?? { text: null, color: null },
      } as Partial<ProductWithImages>);
      syncSavedProduct(savedProduct, nextNotes);
      toast(nextText ? 'Product note updated' : 'Product note removed', { variant: 'success' });
      if (options.closeAfter || !nextText) {
        setNoteModalOpen(false);
      }
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductImageCell',
        action: 'saveNote',
        productId,
      });
      toast(error instanceof Error ? error.message : 'Failed to update product note', {
        variant: 'error',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const cancelNoteModal = (): void => {
    if (resolvedNote) {
      setDraftNoteText(resolvedNote.text);
    }
    setNoteModalOpen(false);
  };

  return (
    <>
      <div
        className='relative inline-flex h-16 w-16 items-center justify-end overflow-visible'
        onMouseLeave={hidePreview}
        onMouseMove={(event) => {
          updatePreview(event);
        }}
      >
        {resolvedNote ? (
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
              showPreview({
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
              hidePreview();
              setDraftNoteText(resolvedNote.text);
              setNoteModalOpen(true);
            }}
          />
        ) : null}

        <div
          className='group/image relative z-10 h-16 w-16'
          onMouseEnter={(event) => {
            if (!imageUrl) return;
            showPreview({
              kind: 'image',
              imageUrl,
              productName,
              unoptimized,
              event,
            });
          }}
        >
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
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
      </div>

      {resolvedNote ? (
        <AppModal
          open={noteModalOpen}
          onClose={cancelNoteModal}
          title='Product note'
          titleHidden
          description={`Internal product note for ${productName}`}
          size='sm'
          padding='none'
          showClose={false}
          closeOnOutside={!isSavingNote}
          closeOnEscape={!isSavingNote}
          className='overflow-hidden border-black/10 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.32)]'
          bodyClassName='p-0'
          style={{ backgroundColor: noteColor }}
          header={
            <div className='flex flex-col gap-3 text-slate-900 lg:flex-row lg:items-start lg:justify-between'>
              <div className='min-w-0'>
                <div className='flex min-w-0 items-center gap-2'>
                  <FormActions
                    onSave={() => {
                      void saveNote();
                    }}
                    saveText='Save'
                    saveVariant={hasDraftChanges ? 'success' : 'outline'}
                    isSaving={isSavingNote}
                    isDisabled={!hasDraftChanges || isSavingNote}
                    className='mr-2'
                  />
                  <h2 className='truncate text-lg font-semibold leading-tight'>Product note</h2>
                </div>
                <p className='mt-1 truncate text-xs text-slate-700'>{productName}</p>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <FormActions
                  onCancel={cancelNoteModal}
                  cancelText='Cancel'
                  isSaving={isSavingNote}
                  isDisabled={isSavingNote}
                />
              </div>
            </div>
          }
        >
          <textarea
            value={draftNoteText}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              setDraftNoteText(event.target.value);
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void saveNote();
              }
            }}
            disabled={isSavingNote}
            aria-label={`Edit note for ${productName}`}
            className='block min-h-56 w-full resize-none border-0 border-t border-black/10 bg-transparent px-6 py-5 text-sm leading-relaxed text-slate-900 outline-none ring-0 placeholder:text-slate-700/50 focus:border-t-black/20 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-70'
            placeholder='Write an internal product note...'
          />
        </AppModal>
      ) : null}
    </>
  );
});
