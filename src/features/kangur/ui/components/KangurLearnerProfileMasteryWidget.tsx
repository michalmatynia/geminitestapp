'use client';

import { useLocale, useTranslations } from 'next-intl';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { translateKangurLearnerProfileWithFallback } from '@/features/kangur/ui/services/profile';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const getKangurLearnerProfileMasteryFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
) => {
  if (locale === 'uk') {
    return {
      summary: 'Переглянь теми для повторення та найсильніші напрями на основі збережених уроків.',
      title: 'Опанування уроків',
    };
  }

  if (locale === 'de') {
    return {
      summary: 'Prüfe Themen zur Wiederholung und die stärksten Bereiche auf Basis gespeicherter Lektionen.',
      title: 'Lektionsbeherrschung',
    };
  }

  if (locale === 'en') {
    return {
      summary: 'Check topics to revisit and the strongest areas based on saved lessons.',
      title: 'Lesson mastery',
    };
  }

  return {
    summary: 'Najsłabsze i najmocniejsze lekcje na podstawie zapisanych prób.',
    title: 'Opanowanie lekcji',
  };
};

export function KangurLearnerProfileMasteryWidget(): React.JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const fallbackCopy = getKangurLearnerProfileMasteryFallbackCopy(locale);
  const { progress } = useKangurLearnerProfileRuntime();
  const { entry: masteryContent } = useKangurPageContentEntry('learner-profile-mastery');

  return (
    <LessonMasteryInsights
      progress={progress}
      sectionSummary={
        masteryContent?.summary ??
        translateKangurLearnerProfileWithFallback(
          translations,
          'summary',
          fallbackCopy.summary
        )
      }
      sectionTitle={
        masteryContent?.title ??
        translateKangurLearnerProfileWithFallback(
          translations,
          'title',
          fallbackCopy.title
        )
      }
    />
  );
}
