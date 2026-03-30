import React from 'react';

import {
  KANGUR_LESSON_ACTIVITY_OPTIONS,
  getKangurLessonActivityDefinition,
  retargetKangurLessonActivityBlock,
} from '@/features/kangur/lessons/activities';
import type { KangurLessonActivityBlock } from '@/features/kangur/shared/contracts/kangur';
import { Badge, FormField, Input, SelectSimple, Textarea } from '@/features/kangur/shared/ui';

export function ActivityEditorCard(props: {
  block: KangurLessonActivityBlock;
  onChange: (nextValue: KangurLessonActivityBlock) => void;
}): React.JSX.Element {
  const { block, onChange } = props;
  const definition = getKangurLessonActivityDefinition(block.activityId);

  return (
    <div className='rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='text-sm font-semibold text-slate-800'>Activity block</div>
        <Badge variant='outline' className='text-[10px] uppercase tracking-wide'>
          {definition.label}
        </Badge>
      </div>

      <div className='space-y-3'>
        <FormField label='Activity Type'>
          <SelectSimple
            size='sm'
            value={block.activityId}
            onValueChange={(nextValue: string): void => {
              if (!KANGUR_LESSON_ACTIVITY_OPTIONS.some((option) => option.value === nextValue))
                return;
              onChange(
                retargetKangurLessonActivityBlock(
                  block,
                  nextValue as KangurLessonActivityBlock['activityId']
                )
              );
            }}
            options={KANGUR_LESSON_ACTIVITY_OPTIONS}
            triggerClassName='h-9'
           ariaLabel='Activity Type' title='Activity Type'/>
        </FormField>

        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Title'>
            <Input
              value={block.title}
              onChange={(event): void => {
                onChange({ ...block, title: event.target.value });
              }}
              placeholder={definition.title}
              className='h-9'
             aria-label={definition.title} title={definition.title}/>
          </FormField>

          <FormField label='Description'>
            <Textarea
              value={block.description ?? ''}
              onChange={(event): void => {
                onChange({ ...block, description: event.target.value });
              }}
              placeholder={definition.description}
              className='min-h-[96px]'
             aria-label={definition.description} title={definition.description}/>
          </FormField>
        </div>

        <FormField label='Narration Description'>
          <Textarea
            value={block.ttsDescription ?? ''}
            onChange={(event): void => {
              onChange({ ...block, ttsDescription: event.target.value });
            }}
            placeholder='Optional spoken introduction for this activity'
            className='min-h-[100px]'
           aria-label='Optional spoken introduction for this activity' title='Optional spoken introduction for this activity'/>
        </FormField>

        <div className='rounded-xl border border-emerald-200/80 bg-white/75 px-3 py-3 text-sm text-slate-700'>
          This block keeps the real Kangur activity inside the modular lesson. The learner renderer
          will mount the interactive widget; editor preview shows a lightweight placeholder.
        </div>
      </div>
    </div>
  );
}
