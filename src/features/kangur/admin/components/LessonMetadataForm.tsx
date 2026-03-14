import React from 'react';

import { KANGUR_LESSON_COMPONENT_OPTIONS } from '@/features/kangur/settings';
import { FormField, Input, SelectSimple, Switch, Textarea } from '@/shared/ui';

import { LESSON_CONTENT_MODE_OPTIONS } from '../constants';

import type { LessonFormData } from '../types';

export function LessonMetadataForm(props: {
  formData: LessonFormData;
  setFormData: React.Dispatch<React.SetStateAction<LessonFormData>>;
  onComponentChange: (componentId: string) => void;
}): React.JSX.Element {
  const { formData, setFormData, onComponentChange } = props;
  const selectedComponentLabel =
    KANGUR_LESSON_COMPONENT_OPTIONS.find((option) => option.value === formData.componentId)
      ?.label ?? formData.componentId;
  const selectedContentModeLabel =
    LESSON_CONTENT_MODE_OPTIONS.find((option) => option.value === formData.contentMode)?.label ??
    formData.contentMode;

  return (
    <div className='grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]'>
      <div className='space-y-5'>
        <div className='overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(135deg,rgba(12,18,32,0.96),rgba(17,38,68,0.86))] p-5 shadow-[0_18px_55px_-32px_rgba(34,197,94,0.38)]'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80'>
            Lesson workspace
          </div>
          <div className='mt-2 text-lg font-semibold text-white'>
            Set the lesson identity first, then choose how the content is authored and rendered.
          </div>
          <div className='mt-2 max-w-2xl text-sm leading-6 text-slate-300'>
            This editor keeps the learner-facing label, rendering strategy, and visibility state in
            one place so new lessons are easier to create consistently.
          </div>
          <div className='mt-4 grid gap-3 md:grid-cols-3'>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                Lesson type
              </div>
              <div className='mt-1 text-sm font-medium text-white'>{selectedComponentLabel}</div>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                Rendering
              </div>
              <div className='mt-1 text-sm font-medium text-white'>{selectedContentModeLabel}</div>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
              <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                Visibility
              </div>
              <div className='mt-1 text-sm font-medium text-white'>
                {formData.enabled ? 'Visible for learners' : 'Hidden from learners'}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <div className='rounded-3xl border border-border/50 bg-card/30 p-4'>
            <FormField label='Lesson Type'>
              <SelectSimple
                size='sm'
                value={formData.componentId}
                onValueChange={onComponentChange}
                options={KANGUR_LESSON_COMPONENT_OPTIONS}
                triggerClassName='h-10'
               ariaLabel="Lesson Type" title="Lesson Type"/>
            </FormField>
          </div>
          <div className='rounded-3xl border border-border/50 bg-card/30 p-4'>
            <FormField label='Rendering Mode'>
              <SelectSimple
                size='sm'
                value={formData.contentMode}
                onValueChange={(value: string): void => {
                  if (value !== 'component' && value !== 'document') return;
                  setFormData((current) => ({ ...current, contentMode: value }));
                }}
                options={LESSON_CONTENT_MODE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                triggerClassName='h-10'
               ariaLabel="Rendering Mode" title="Rendering Mode"/>
            </FormField>
          </div>
        </div>

        <div className='rounded-3xl border border-border/50 bg-card/25 p-5'>
          <div className='grid gap-4'>
            <FormField label='Title'>
              <Input
                value={formData.title}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setFormData((current) => ({ ...current, title: event.target.value }));
                }}
                placeholder='Lesson title'
                className='h-10'
               aria-label="Lesson title" title="Lesson title"/>
            </FormField>

            <FormField label='Description'>
              <Textarea
                value={formData.description}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                  setFormData((current) => ({ ...current, description: event.target.value }));
                }}
                placeholder='Short lesson description'
                className='min-h-[120px]'
               aria-label="Short lesson description" title="Short lesson description"/>
            </FormField>
          </div>
        </div>
      </div>

      <div className='space-y-4'>
        <div className='rounded-3xl border border-border/50 bg-card/30 p-5'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground'>
            Lesson badge
          </div>
          <div className='mt-4 flex items-center gap-4'>
            <div className='flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-400/25 bg-emerald-500/10 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'>
              {formData.emoji?.trim() || '📘'}
            </div>
            <div className='min-w-0 space-y-1'>
              <div className='truncate text-base font-semibold text-white'>
                {formData.title?.trim() || 'Untitled lesson'}
              </div>
              <div className='line-clamp-2 text-sm text-muted-foreground'>
                {formData.description?.trim() || 'Add a short summary so learners know what this lesson teaches.'}
              </div>
            </div>
          </div>
          <div className='mt-4'>
            <FormField label='Emoji'>
              <Input
                value={formData.emoji}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setFormData((current) => ({ ...current, emoji: event.target.value }));
                }}
                placeholder='📚'
                className='h-10'
                maxLength={12}
               aria-label="📚" title="📚"/>
            </FormField>
          </div>
        </div>

        <div className='flex items-center justify-between rounded-3xl border border-border/50 bg-card/30 p-4'>
          <div>
            <div className='text-sm font-medium text-white'>Visible in lessons view</div>
            <div className='text-xs text-gray-400'>Disabled lessons are hidden from users.</div>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked: boolean): void => {
              setFormData((current) => ({ ...current, enabled: checked }));
            }}
          />
        </div>

        <div className='rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100/90'>
          <div className='mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80'>
            Authoring note
          </div>
          {formData.contentMode === 'document'
            ? 'This lesson will render through the custom document editor. Use the document icon on the lesson row to author modular lesson pages with text, SVG blocks, SVG image references, activity widgets, and grid layouts.'
            : 'This lesson will render through the legacy Kangur component selected above. You can still prepare a custom document before switching modes, or use the bulk import action to migrate the whole lesson library.'}
        </div>
      </div>
    </div>
  );
}
