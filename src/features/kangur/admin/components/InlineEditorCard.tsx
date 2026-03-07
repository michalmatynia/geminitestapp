import React, { useState } from 'react';
import { MediaLibraryPanel } from '@/features/cms/components/page-builder/MediaLibraryPanel';
import { DocumentWysiwygEditor } from '@/features/document-editor';
import type { KangurLessonInlineBlock } from '@/shared/contracts/kangur';
import { Badge, Button, FormField, Input, SelectSimple, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { ALIGNMENT_OPTIONS, MEDIA_FIT_OPTIONS } from '../constants';
import { clamp, parseNumberInput } from '../utils';
import { SvgCodeEditor, extractSvgViewBox } from './SvgCodeEditor';

export function InlineEditorCard(
  props: {
    block: KangurLessonInlineBlock;
    onChange: (nextValue: KangurLessonInlineBlock) => void;
    heading: string;
    accent?: 'text' | 'svg' | 'image';
  }
): React.JSX.Element {
  const { block, onChange, heading, accent = 'text' } = props;
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        accent === 'svg'
          ? 'border-sky-200/80 bg-sky-50/60'
          : accent === 'image'
            ? 'border-amber-200/80 bg-amber-50/60'
            : 'border-indigo-200/80 bg-indigo-50/50'
      )}
    >
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='text-sm font-semibold text-slate-800'>{heading}</div>
        <Badge variant='outline' className='text-[10px] uppercase tracking-wide'>
          {block.type}
        </Badge>
      </div>

      {block.type === 'text' ? (
        <div className='space-y-3'>
          <FormField label='Alignment'>
            <SelectSimple
              size='sm'
              value={block.align}
              onValueChange={(nextValue: string): void => {
                if (nextValue !== 'left' && nextValue !== 'center' && nextValue !== 'right') return;
                onChange({ ...block, align: nextValue });
              }}
              options={ALIGNMENT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Text Content'>
            <DocumentWysiwygEditor
              value={block.html}
              onChange={(nextValue): void => {
                onChange({ ...block, html: nextValue });
              }}
              placeholder='Write the lesson text here...'
            />
          </FormField>

          <FormField label='Narration Override'>
            <Textarea
              value={block.ttsText ?? ''}
              onChange={(event): void => {
                onChange({ ...block, ttsText: event.target.value });
              }}
              placeholder='Optional spoken version for this block'
              className='min-h-[100px]'
            />
          </FormField>
        </div>
      ) : block.type === 'svg' ? (
        <div className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-2'>
            <FormField label='Title'>
              <Input
                value={block.title}
                onChange={(event): void => {
                  onChange({ ...block, title: event.target.value });
                }}
                placeholder='Optional SVG title'
                className='h-9'
              />
            </FormField>
            <FormField label='Alignment'>
              <SelectSimple
                size='sm'
                value={block.align}
                onValueChange={(nextValue: string): void => {
                  if (nextValue !== 'left' && nextValue !== 'center' && nextValue !== 'right') return;
                  onChange({ ...block, align: nextValue });
                }}
                options={ALIGNMENT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                triggerClassName='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <FormField label='ViewBox'>
              <Input
                value={block.viewBox}
                onChange={(event): void => {
                  onChange({ ...block, viewBox: event.target.value });
                }}
                placeholder='0 0 100 100'
                className='h-9'
              />
            </FormField>

            <FormField label='Fit'>
              <SelectSimple
                size='sm'
                value={block.fit}
                onValueChange={(nextValue: string): void => {
                  if (nextValue !== 'contain' && nextValue !== 'cover' && nextValue !== 'none') return;
                  onChange({ ...block, fit: nextValue });
                }}
                options={MEDIA_FIT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                triggerClassName='h-9'
              />
            </FormField>

            <FormField label='Max Width'>
              <Input
                type='number'
                min={120}
                max={1200}
                value={String(block.maxWidth)}
                onChange={(event): void => {
                  onChange({
                    ...block,
                    maxWidth: clamp(parseNumberInput(event.target.value, block.maxWidth), 120, 1200),
                  });
                }}
                className='h-9'
              />
            </FormField>
          </div>

          <div className='space-y-1.5'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              SVG Markup
            </div>
            <SvgCodeEditor
              value={block.markup}
              onChange={(nextMarkup): void => {
                const detectedViewBox = extractSvgViewBox(nextMarkup);
                onChange({
                  ...block,
                  markup: nextMarkup,
                  viewBox: detectedViewBox ?? block.viewBox,
                });
              }}
              previewSize='lg'
              placeholder='<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">\n  <!-- SVG content -->\n</svg>'
            />
          </div>

          <FormField label='Narration Description'>
            <Textarea
              value={block.ttsDescription ?? ''}
              onChange={(event): void => {
                onChange({ ...block, ttsDescription: event.target.value });
              }}
              placeholder='Optional spoken description of this illustration'
              className='min-h-[100px]'
            />
          </FormField>
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-2'>
            <FormField label='Title'>
              <Input
                value={block.title}
                onChange={(event): void => {
                  onChange({ ...block, title: event.target.value });
                }}
                placeholder='Optional image title'
                className='h-9'
              />
            </FormField>
            <FormField label='Alt Text'>
              <Input
                value={block.altText ?? ''}
                onChange={(event): void => {
                  onChange({ ...block, altText: event.target.value });
                }}
                placeholder='Describe the image for accessibility'
                className='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <FormField label='Alignment'>
              <SelectSimple
                size='sm'
                value={block.align}
                onValueChange={(nextValue: string): void => {
                  if (nextValue !== 'left' && nextValue !== 'center' && nextValue !== 'right') return;
                  onChange({ ...block, align: nextValue });
                }}
                options={ALIGNMENT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                triggerClassName='h-9'
              />
            </FormField>

            <FormField label='Fit'>
              <SelectSimple
                size='sm'
                value={block.fit}
                onValueChange={(nextValue: string): void => {
                  if (nextValue !== 'contain' && nextValue !== 'cover' && nextValue !== 'none') return;
                  onChange({ ...block, fit: nextValue });
                }}
                options={MEDIA_FIT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                triggerClassName='h-9'
              />
            </FormField>

            <FormField label='Max Width'>
              <Input
                type='number'
                min={120}
                max={1200}
                value={String(block.maxWidth)}
                onChange={(event): void => {
                  onChange({
                    ...block,
                    maxWidth: clamp(parseNumberInput(event.target.value, block.maxWidth), 120, 1200),
                  });
                }}
                className='h-9'
              />
            </FormField>
          </div>

          <FormField label='Caption'>
            <Textarea
              value={block.caption ?? ''}
              onChange={(event): void => {
                onChange({ ...block, caption: event.target.value });
              }}
              placeholder='Optional caption under the image'
              className='min-h-[90px]'
            />
          </FormField>

          <FormField label='Narration Description'>
            <Textarea
              value={block.ttsDescription ?? ''}
              onChange={(event): void => {
                onChange({ ...block, ttsDescription: event.target.value });
              }}
              placeholder='Optional spoken description of this image'
              className='min-h-[100px]'
            />
          </FormField>

          <FormField label='Image Source'>
            <div className='space-y-2'>
              <Input
                value={block.src}
                onChange={(event): void => {
                  onChange({ ...block, src: event.target.value });
                }}
                placeholder='/uploads/... or https://...'
                className='h-9'
              />
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 px-3'
                  onClick={(): void => setShowMediaLibrary(true)}
                >
                  Choose from library
                </Button>
                {block.src.trim() ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-3'
                    onClick={(): void => onChange({ ...block, src: '' })}
                  >
                    Clear source
                  </Button>
                ) : null}
              </div>
            </div>
          </FormField>

          {block.src.trim() ? (
            <div className='overflow-hidden rounded-2xl border border-amber-200 bg-white/80 p-3'>
              <img
                src={block.src}
                alt={block.altText?.trim() || block.title.trim() || 'Lesson image'}
                className='max-h-[260px] w-full rounded-xl object-contain'
              />
            </div>
          ) : null}

          <MediaLibraryPanel
            open={showMediaLibrary}
            onOpenChange={setShowMediaLibrary}
            selectionMode='single'
            autoConfirmSelection
            onSelect={(filepaths): void => {
              const nextSrc = filepaths[0];
              if (!nextSrc) return;
              onChange({ ...block, src: nextSrc });
              setShowMediaLibrary(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
