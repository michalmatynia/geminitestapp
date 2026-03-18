import React from 'react';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  KangurLessonCalloutBlock,
  KangurLessonCalloutVariant,
} from '@/features/kangur/shared/contracts/kangur';
import { FormField, Input, Textarea } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

const LazyDocumentWysiwygEditor = React.lazy(() =>
  import('@/features/document-editor').then((mod) => ({
    default: mod.DocumentWysiwygEditor,
  }))
);

const VARIANT_OPTIONS: Array<
  LabeledOptionDto<KangurLessonCalloutVariant> & { icon: string; className: string }
> = [
  { value: 'info', label: 'Info', icon: 'ℹ️', className: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
  { value: 'tip', label: 'Wskazówka', icon: '💡', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'warning', label: 'Uwaga', icon: '⚠️', className: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'success', label: 'Sukces', icon: '✅', className: 'border-teal-300 bg-teal-50 text-teal-700' },
];

export function CalloutEditorCard(props: {
  block: KangurLessonCalloutBlock;
  onChange: (nextBlock: KangurLessonCalloutBlock) => void;
}): React.JSX.Element {
  const { block, onChange } = props;

  return (
    <div className='space-y-4'>
      <div>
        <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Callout variant
        </div>
        <div className='flex flex-wrap gap-2'>
          {VARIANT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type='button'
              onClick={(): void => onChange({ ...block, variant: option.value })}
              aria-pressed={block.variant === option.value}
              aria-label={option.label}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                block.variant === option.value
                  ? option.className + ' ring-2 ring-offset-1'
                  : 'border-border/60 bg-card/30 text-muted-foreground hover:bg-card/50'
              )}
            >
              <span aria-hidden className='mr-1'>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <FormField label='Title (optional)'>
        <Input
          value={block.title ?? ''}
          onChange={(e): void => onChange({ ...block, title: e.target.value })}
          placeholder='Callout heading'
          className='h-9'
         aria-label='Callout heading' title='Callout heading'/>
      </FormField>

      <FormField label='Content'>
        <React.Suspense
          fallback={
            <div className='min-h-[220px] rounded-lg border border-border/40 bg-card/20 p-4 text-sm text-muted-foreground'>
              Loading editor...
            </div>
          }
        >
          <LazyDocumentWysiwygEditor
            value={block.html}
            onChange={(nextHtml): void => onChange({ ...block, html: nextHtml })}
          />
        </React.Suspense>
      </FormField>

      <FormField label='TTS narration override (optional)'>
        <Textarea
          value={block.ttsText ?? ''}
          onChange={(e): void => onChange({ ...block, ttsText: e.target.value })}
          placeholder='Spoken text override for screen readers and narration'
          className='min-h-[72px]'
         aria-label='Spoken text override for screen readers and narration' title='Spoken text override for screen readers and narration'/>
      </FormField>
    </div>
  );
}
