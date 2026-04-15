'use client';

import Image from 'next/image';
import React, { useMemo, useState } from 'react';

import { useProductImagePreview } from '@/features/products/context/ProductImagePreviewContext';
import { AppModal } from '@/shared/ui/feedback.public';
import MissingImagePlaceholder from '@/shared/ui/missing-image-placeholder';
import { cn } from '@/shared/utils/ui-utils';

type ProductNoteValue = {
  text?: string | null;
  color?: string | null;
} | null | undefined;

interface ProductImageCellProps {
  imageUrl: string | null;
  productName: string;
  note?: ProductNoteValue;
}

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
  const color = normalizeNoteColor(note.color);
  const hasExplicitColor = typeof note.color === 'string' && note.color.trim().length > 0;

  if (!text && !hasExplicitColor) {
    return null;
  }

  return {
    text,
    color,
  };
};

export const ProductImageCell = React.memo(({
  imageUrl,
  productName,
  note,
}: ProductImageCellProps): React.JSX.Element => {
  const { showPreview, updatePreview, hidePreview } = useProductImagePreview();
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  const unoptimized = useMemo(
    () => (imageUrl ? shouldSkipOptimization(imageUrl) : false),
    [imageUrl]
  );
  const resolvedNote = useMemo(() => resolveProductNote(note), [note]);

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
          onClose={() => setNoteModalOpen(false)}
          title='Product note'
          subtitle={productName}
          description={`Internal product note for ${productName}`}
          size='sm'
        >
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              <span
                aria-hidden='true'
                className='inline-flex h-3.5 w-3.5 rounded-sm border border-black/10 shadow-sm'
                style={{ backgroundColor: resolvedNote.color }}
              />
              Note paper
            </div>

            <div
              className='rounded-md border border-black/10 px-4 py-4 text-sm leading-relaxed text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.22)]'
              style={{ backgroundColor: resolvedNote.color }}
            >
              <p className='whitespace-pre-wrap break-words'>
                {resolvedNote.text || 'No note text added yet.'}
              </p>
            </div>
          </div>
        </AppModal>
      ) : null}
    </>
  );
});
