'use client';

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { type ProductFormData } from '@/shared/contracts/products/drafts';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input, Textarea } from '@/shared/ui/primitives.public';

const DEFAULT_NOTE_COLOR = '#f5e7c3';
const NOTE_COLOR_SWATCHES = [
  DEFAULT_NOTE_COLOR,
  '#f1f5f9',
  '#fde68a',
  '#fecaca',
  '#bbf7d0',
  '#bfdbfe',
  '#e9d5ff',
  '#fed7aa',
];

const normalizeNoteColor = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return DEFAULT_NOTE_COLOR;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_NOTE_COLOR;
};

const normalizeNoteText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : '';

type ProductNotesPatch = Partial<NonNullable<ProductFormData['notes']>>;
type ProductNotesValue = ProductFormData['notes'];

const normalizeNullableNoteColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveNextNoteText = (
  patch: ProductNotesPatch,
  watchedNotes: ProductNotesValue
): string => normalizeNoteText(patch.text ?? watchedNotes?.text);

const resolveNextNoteColor = (
  patch: ProductNotesPatch,
  watchedNotes: ProductNotesValue
): string | null => normalizeNullableNoteColor(patch.color ?? watchedNotes?.color ?? null);

const isEmptyProductNotesValue = (text: string, color: string | null): boolean =>
  text.trim().length === 0 && color === null;

const normalizeStoredNoteText = (text: string): string | null => {
  if (text !== '') return text;
  return null;
};

const buildProductNotesValue = (
  patch: ProductNotesPatch,
  watchedNotes: ProductNotesValue
): ProductNotesValue => {
  const nextText = resolveNextNoteText(patch, watchedNotes);
  const nextColor = resolveNextNoteColor(patch, watchedNotes);
  if (isEmptyProductNotesValue(nextText, nextColor)) return undefined;
  return {
    text: normalizeStoredNoteText(nextText),
    color: nextColor,
  };
};

const useProductNotesController = (): {
  noteText: string;
  noteColor: string;
  updateNotes: (patch: ProductNotesPatch) => void;
} => {
  const { control, setValue } = useFormContext<ProductFormData>();
  const watchedNotes = useWatch({
    control,
    name: 'notes',
  });

  const noteText = normalizeNoteText(watchedNotes?.text);
  const noteColor = normalizeNoteColor(watchedNotes?.color);

  const updateNotes = (patch: ProductNotesPatch): void => {
    setValue('notes', buildProductNotesValue(patch, watchedNotes), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  return { noteText, noteColor, updateNotes };
};

export default function ProductFormNotes(): React.JSX.Element {
  const { noteText, noteColor, updateNotes } = useProductNotesController();

  return (
    <div className='space-y-4'>
      <FormSection
        title='Notes'
        description='Store internal product notes and choose a paper color for quick visual scanning.'
      >
        <FormField label='Product Note'>
          <Textarea
            value={noteText}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              updateNotes({ text: event.target.value });
            }}
            placeholder='Add internal notes about this product...'
            className='min-h-[180px]'
            aria-label='Product note'
            title='Product note'
          />
        </FormField>

        <ProductNoteColorField
          noteText={noteText}
          noteColor={noteColor}
          updateNotes={updateNotes}
        />
      </FormSection>
    </div>
  );
}

function ProductNoteColorField({
  noteText,
  noteColor,
  updateNotes,
}: {
  noteText: string;
  noteColor: string;
  updateNotes: (patch: ProductNotesPatch) => void;
}): React.JSX.Element {
  return (
    <FormField label='Paper Color'>
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          {NOTE_COLOR_SWATCHES.map((swatch) => (
            <ProductNoteColorSwatch
              key={swatch}
              swatch={swatch}
              selected={noteColor === swatch}
              updateNotes={updateNotes}
            />
          ))}
          <ProductNoteColorInput noteColor={noteColor} updateNotes={updateNotes} />
        </div>
        <ProductNotePreview noteText={noteText} noteColor={noteColor} />
      </div>
    </FormField>
  );
}

function ProductNoteColorSwatch({
  swatch,
  selected,
  updateNotes,
}: {
  swatch: string;
  selected: boolean;
  updateNotes: (patch: ProductNotesPatch) => void;
}): React.JSX.Element {
  return (
    <button
      type='button'
      className={`h-7 w-7 rounded border transition-all ${
        selected ? 'border-white ring-2 ring-white/20' : 'border-border/60 hover:border-white/40'
      }`}
      style={{ backgroundColor: swatch }}
      onClick={() => updateNotes({ color: swatch })}
      aria-label={`Set note color ${swatch}`}
      title={`Set note color ${swatch}`}
    />
  );
}

function ProductNoteColorInput({
  noteColor,
  updateNotes,
}: {
  noteColor: string;
  updateNotes: (patch: ProductNotesPatch) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Input
        type='color'
        value={noteColor}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          updateNotes({ color: event.target.value });
        }}
        className='h-8 w-10 cursor-pointer p-1'
        aria-label='Paper color'
        title='Paper color'
      />
      <span className='font-mono text-[11px] text-gray-400'>{noteColor}</span>
    </div>
  );
}

function ProductNotePreview({
  noteText,
  noteColor,
}: {
  noteText: string;
  noteColor: string;
}): React.JSX.Element {
  const previewText =
    noteText.trim().length > 0 ? noteText : 'Preview: your note will appear here.';

  return (
    <div
      className='rounded border border-border/60 px-4 py-3 text-sm text-gray-900 shadow-sm'
      style={{ backgroundColor: noteColor }}
    >
      {previewText}
    </div>
  );
}
