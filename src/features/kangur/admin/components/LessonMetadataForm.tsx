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

  return (
    <div className='space-y-4'>
      <FormField label='Lesson Type'>
        <SelectSimple
          size='sm'
          value={formData.componentId}
          onValueChange={onComponentChange}
          options={KANGUR_LESSON_COMPONENT_OPTIONS}
          triggerClassName='h-9'
        />
      </FormField>

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
          triggerClassName='h-9'
        />
      </FormField>

      <FormField label='Title'>
        <Input
          value={formData.title}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setFormData((current) => ({ ...current, title: event.target.value }));
          }}
          placeholder='Lesson title'
          className='h-9'
        />
      </FormField>

      <FormField label='Description'>
        <Textarea
          value={formData.description}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            setFormData((current) => ({ ...current, description: event.target.value }));
          }}
          placeholder='Short lesson description'
          className='min-h-[90px]'
        />
      </FormField>

      <FormField label='Emoji'>
        <Input
          value={formData.emoji}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setFormData((current) => ({ ...current, emoji: event.target.value }));
          }}
          placeholder='📚'
          className='h-9'
          maxLength={12}
        />
      </FormField>

      <div className='flex items-center justify-between rounded-md border border-border/50 bg-card/40 p-3'>
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

      <div className='rounded-md border border-sky-400/20 bg-sky-500/10 p-3 text-xs text-sky-100/90'>
        {formData.contentMode === 'document'
          ? 'This lesson will render through the custom document editor. Use the document icon on the lesson row to author modular lesson pages with text, SVG blocks, SVG image references, activity widgets, and grid layouts.'
          : 'This lesson will render through the legacy Kangur component selected above. You can still open the document editor and prepare custom content before switching modes, or use the bulk import action to transfer the whole lesson library.'}
      </div>
    </div>
  );
}
