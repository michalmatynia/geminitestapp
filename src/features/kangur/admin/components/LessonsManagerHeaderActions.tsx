'use client';

import React from 'react';
import { Badge, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import type { UseAdminKangurLessonsManagerLogicReturn } from '../hooks/lessons-manager/useAdminKangurLessonsManagerLogic';
import type { KangurAdminLocale } from '../kangur-admin-locale';
import type { KangurLessonAgeGroup } from '@/shared/contracts/kangur-lesson-constants';
import type { KangurLessonAuthoringFilter } from '../content-creator-insights';

export function LessonsManagerHeaderActions({
  logic,
}: {
  logic: UseAdminKangurLessonsManagerLogicReturn;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-3'>
      <SelectSimple
        value={logic.contentLocale}
        onChange={(value) => logic.setContentLocale(value as KangurAdminLocale)}
        options={logic.contentLocaleOptions as { value: string; label: string }[]}
        className='w-40'
        ariaLabel='Content locale'
        title='Content locale'
      />
      <Badge variant='outline'>{logic.contentLocaleLabel}</Badge>
      <SelectSimple
        value={logic.ageGroupFilter}
        onChange={(value) => logic.setAgeGroupFilter(value as KangurLessonAgeGroup | 'all')}
        options={[
          { value: 'all', label: 'All Ages' },
          ...KANGUR_AGE_GROUPS.map((group) => ({
            value: group.id,
            label: group.label,
          })),
        ]}
        className='w-40'
        ariaLabel='Age group filter'
        title='Age group filter'
      />
      <SelectSimple
        value={logic.authoringFilter}
        onChange={(value) => logic.setAuthoringFilter(value as KangurLessonAuthoringFilter)}
        options={logic.authoringFilterCounts.map((item: any) => ({
          value: item.id,
          label: `${item.label} (${item.count})`,
        }))}
        className='w-52'
        ariaLabel='Editorial state filter'
        title='Editorial state filter'
      />
      <KangurButton variant='primary' onClick={logic.handleCreate}>
        New lesson
      </KangurButton>
    </div>
  );
}
