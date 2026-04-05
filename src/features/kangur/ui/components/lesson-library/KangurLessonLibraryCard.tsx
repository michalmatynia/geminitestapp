'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  KangurResolvedLessonLibraryCard,
  type KangurLessonLibraryCardCopy,
  type KangurLessonLibraryCardTranslations,
  type KangurResolvedLessonLibraryCardProps,
} from './KangurResolvedLessonLibraryCard';

export type {
  KangurLessonLibraryCardCopy,
  KangurLessonLibraryCardTranslations,
} from './KangurResolvedLessonLibraryCard';

type KangurLessonLibraryCardProps = Omit<
  KangurResolvedLessonLibraryCardProps,
  'isCoarsePointer' | 'isSixYearOld' | 'locale' | 'translations'
> & {
  locale?: string;
  translations?: KangurLessonLibraryCardTranslations;
  isCoarsePointer?: boolean;
  isSixYearOld?: boolean;
  resolvedCopy?: KangurLessonLibraryCardCopy;
};

function KangurLessonLibraryCardWithContext(
  props: KangurLessonLibraryCardProps
): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsWidgets.libraryCard');
  const isCoarsePointer = useKangurCoarsePointer();
  const { ageGroup } = useKangurAgeGroupFocus();

  return (
    <KangurResolvedLessonLibraryCard
      {...props}
      isCoarsePointer={Boolean(isCoarsePointer)}
      isSixYearOld={ageGroup === 'six_year_old'}
      locale={locale}
      translations={translations}
    />
  );
}

export function KangurLessonLibraryCard(props: KangurLessonLibraryCardProps): React.JSX.Element {
  if (
    props.locale !== undefined &&
    props.translations !== undefined &&
    props.isCoarsePointer !== undefined &&
    props.isSixYearOld !== undefined
  ) {
    const {
      isCoarsePointer,
      isSixYearOld,
      locale,
      translations,
      ...resolvedProps
    } = props;

    return (
      <KangurResolvedLessonLibraryCard
        {...resolvedProps}
        isCoarsePointer={isCoarsePointer}
        isSixYearOld={isSixYearOld}
        locale={locale}
        translations={translations}
      />
    );
  }

  return <KangurLessonLibraryCardWithContext {...props} />;
}
