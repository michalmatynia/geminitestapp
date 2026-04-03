'use client';

import React from 'react';

import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';

import type { KangurChoiceDialogOption } from '@/features/kangur/ui/components/KangurChoiceDialog';
import type { KangurSubjectDefinition } from '@/features/kangur/lessons/lesson-types';
import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

const renderSubjectOptionLabel = ({
  isSixYearOld,
  normalizedLocale,
  subject,
}: {
  isSixYearOld: boolean;
  normalizedLocale: string;
  subject: KangurLessonSubject;
}): React.ReactNode => {
  const label = getLocalizedKangurSubjectLabel(subject, normalizedLocale);

  if (!isSixYearOld) {
    return label;
  }

  const visual = getKangurSixYearOldSubjectVisual(subject);

  return (
    <KangurVisualCueContent
      detail={visual.detail}
      detailClassName='text-sm font-bold'
      detailTestId={`kangur-primary-nav-subject-option-detail-${subject}`}
      icon={visual.icon}
      iconClassName='text-lg'
      iconTestId={`kangur-primary-nav-subject-option-icon-${subject}`}
      label={label}
    />
  );
};

const renderAgeGroupOptionLabel = ({
  ageGroup,
  isSixYearOld,
  normalizedLocale,
}: {
  ageGroup: KangurLessonAgeGroup;
  isSixYearOld: boolean;
  normalizedLocale: string;
}): React.ReactNode => {
  const label = getLocalizedKangurAgeGroupLabel(ageGroup, normalizedLocale);

  if (!isSixYearOld) {
    return label;
  }

  const visual = getKangurSixYearOldAgeGroupVisual(ageGroup);

  return (
    <KangurVisualCueContent
      detail={visual.detail}
      detailClassName='text-sm font-bold'
      detailTestId={`kangur-primary-nav-age-group-option-detail-${ageGroup}`}
      icon={visual.icon}
      iconClassName='text-lg'
      iconTestId={`kangur-primary-nav-age-group-option-icon-${ageGroup}`}
      label={label}
    />
  );
};

export const buildSubjectOptions = ({
  availableSubjects,
  isSixYearOld,
  normalizedLocale,
  setSubject,
  subject,
}: {
  availableSubjects: readonly KangurSubjectDefinition[];
  isSixYearOld: boolean;
  normalizedLocale: string;
  setSubject: (value: KangurLessonSubject) => void;
  subject: KangurLessonSubject;
}): KangurChoiceDialogOption[] =>
  availableSubjects.map((availableSubject) => ({
    ariaLabel: getLocalizedKangurSubjectLabel(availableSubject.id, normalizedLocale),
    id: availableSubject.id,
    isActive: availableSubject.id === subject,
    label: renderSubjectOptionLabel({
      isSixYearOld,
      normalizedLocale,
      subject: availableSubject.id,
    }),
    onSelect: () => setSubject(availableSubject.id),
  }));

export const buildAgeGroupOptions = ({
  ageGroup,
  isSixYearOld,
  normalizedLocale,
  setAgeGroup,
}: {
  ageGroup: KangurLessonAgeGroup;
  isSixYearOld: boolean;
  normalizedLocale: string;
  setAgeGroup: (value: KangurLessonAgeGroup) => void;
}): KangurChoiceDialogOption[] =>
  KANGUR_AGE_GROUPS.map((group) => ({
    ariaLabel: getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale),
    id: group.id,
    isActive: group.id === ageGroup,
    label: renderAgeGroupOptionLabel({
      ageGroup: group.id,
      isSixYearOld,
      normalizedLocale,
    }),
    onSelect: () => setAgeGroup(group.id),
  }));
