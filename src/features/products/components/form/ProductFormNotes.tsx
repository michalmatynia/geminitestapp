'use client';

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { ProductFormData } from '@/shared/contracts/products/drafts';
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

export default function ProductFormNotes(): React.JSX.Element {
  const { control, setValue } = useFormContext<ProductFormData>();
  const watchedNotes = useWatch({
    control,
    name: 'notes',
  });

  const noteText = normalizeNoteText(watchedNotes?.text);
  const noteColor = normalizeNoteColor(watchedNotes?.color);

  const updateNotes = (patch: Partial<NonNullable<ProductFormData['notes']>>): void => {
    const nextText = normalizeNoteText(patch.text ?? watchedNotes?.text);
    const nextColorValue = patch.color ?? watchedNotes?.color ?? null;
    const nextColor =
      typeof nextColorValue === 'string' && nextColorValue.trim().length > 0
        ? nextColorValue.trim()
        : null;

    setValue(
      'notes',
      !nextText.trim() && !nextColor
        ? undefined
        : {
            text: nextText || null,
            color: nextColor,
          },
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      }
    );
  };

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

        <FormField label='Paper Color'>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-2'>
              {NOTE_COLOR_SWATCHES.map((swatch: string) => (
                <button
                  key={swatch}
                  type='button'
                  className={`h-7 w-7 rounded border transition-all ${
                    noteColor === swatch
                      ? 'border-white ring-2 ring-white/20'
                      : 'border-border/60 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: swatch }}
                  onClick={() => updateNotes({ color: swatch })}
                  aria-label={`Set note color ${swatch}`}
                  title={`Set note color ${swatch}`}
                />
              ))}
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
            </div>

            <div
              className='rounded border border-border/60 px-4 py-3 text-sm text-gray-900 shadow-sm'
              style={{ backgroundColor: noteColor }}
            >
              {noteText.trim() ? noteText : 'Preview: your note will appear here.'}
            </div>
          </div>
        </FormField>
      </FormSection>
    </div>
  );
}
