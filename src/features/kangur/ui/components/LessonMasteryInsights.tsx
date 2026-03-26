import { useLocale, useTranslations } from 'next-intl';
import {
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurPanelRow,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_COMPACT_ROW_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import {
  buildLessonMasteryInsights,
  translateKangurLearnerProfileWithFallback,
} from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type LessonMasteryInsightsProps = {
  progress: KangurProgressState;
  sectionSummary?: React.ReactNode;
  sectionTitle?: React.ReactNode;
};

type LessonMasteryFallbackCopy = {
  attemptsLine: (attempts: number, lastScore: number) => string;
  bestScoreLine: (bestScore: number, date: string) => string;
  dateMissing: string;
  emptyDescription: string;
  reviewEmpty: string;
  reviewTitle: string;
  strongestEmpty: string;
  strongestTitle: string;
  title: string;
  trackedBadge: (count: number) => string;
  trackedSummary: (tracked: number, mastered: number, review: number) => string;
};

const getLessonMasteryFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): LessonMasteryFallbackCopy => {
  if (locale === 'uk') {
    return {
      attemptsLine: (attempts, lastScore) => `Спроби: ${attempts} · останній результат ${lastScore}%`,
      bestScoreLine: (bestScore, date) => `Найкращий результат: ${bestScore}% · Остання спроба: ${date}`,
      dateMissing: 'немає дати',
      emptyDescription:
        'Ще немає збережених спроб уроків. Заверши будь-який урок, щоб побачити сильні сторони й теми для повторення.',
      reviewEmpty: 'Усі відстежувані уроки вже на безпечному рівні.',
      reviewTitle: 'На повторення',
      strongestEmpty: 'Заверши кілька уроків, щоб побачити найсильніші напрями.',
      strongestTitle: 'Найсильніші уроки',
      title: 'Опанування уроків',
      trackedBadge: (count) => `${count} уроків зі збереженим прогресом`,
      trackedSummary: (tracked, mastered, review) =>
        `Відстежується: ${tracked} · опановано: ${mastered} · на повторення: ${review}`,
    };
  }

  if (locale === 'de') {
    return {
      attemptsLine: (attempts, lastScore) => `Versuche: ${attempts} · letztes Ergebnis ${lastScore}%`,
      bestScoreLine: (bestScore, date) => `Bestes Ergebnis: ${bestScore}% · Letzter Versuch: ${date}`,
      dateMissing: 'kein Datum',
      emptyDescription:
        'Es gibt noch keine gespeicherten Lektionsversuche. Schließe eine beliebige Lektion ab, um Stärken und Wiederholungsbereiche zu sehen.',
      reviewEmpty: 'Alle verfolgten Lektionen sind auf einem sicheren Niveau.',
      reviewTitle: 'Zur Wiederholung',
      strongestEmpty: 'Schließe zuerst ein paar Lektionen ab, um die stärksten Bereiche zu sehen.',
      strongestTitle: 'Stärkste Lektionen',
      title: 'Lektionsbeherrschung',
      trackedBadge: (count) => `${count} Lektionen mit gespeichertem Fortschritt`,
      trackedSummary: (tracked, mastered, review) =>
        `Verfolgt: ${tracked} · beherrscht: ${mastered} · zur Wiederholung: ${review}`,
    };
  }

  if (locale === 'en') {
    return {
      attemptsLine: (attempts, lastScore) => `Attempts: ${attempts} · last score ${lastScore}%`,
      bestScoreLine: (bestScore, date) => `Best score: ${bestScore}% · Last attempt: ${date}`,
      dateMissing: 'no date',
      emptyDescription:
        'There are no saved lesson attempts yet. Finish any lesson to see strengths and review areas.',
      reviewEmpty: 'All tracked lessons are at a safe level.',
      reviewTitle: 'To review',
      strongestEmpty: 'Finish a few lessons first to see the strongest areas.',
      strongestTitle: 'Strongest lessons',
      title: 'Lesson mastery',
      trackedBadge: (count) => `${count} lessons with saved progress`,
      trackedSummary: (tracked, mastered, review) =>
        `Tracked: ${tracked} · mastered: ${mastered} · to review: ${review}`,
    };
  }

  return {
    attemptsLine: (attempts, lastScore) => `Próby: ${attempts} · ostatni wynik ${lastScore}%`,
    bestScoreLine: (bestScore, date) => `Najlepszy wynik: ${bestScore}% · Ostatnia próba: ${date}`,
    dateMissing: 'brak daty',
    emptyDescription:
      'Brak zapisanych prób lekcji. Ukończ dowolną lekcję, aby zobaczyć mocne strony i obszary do powtórki.',
    reviewEmpty: 'Wszystkie śledzone lekcje są na bezpiecznym poziomie.',
    reviewTitle: 'Do powtórki',
    strongestEmpty: 'Najpierw ukończ kilka lekcji, aby zobaczyć najmocniejsze obszary.',
    strongestTitle: 'Najmocniejsze lekcje',
    title: 'Opanowanie lekcji',
    trackedBadge: (count) => `${count} lekcji z zapisem`,
    trackedSummary: (tracked, mastered, review) =>
      `Śledzone: ${tracked} · opanowane: ${mastered} · do powtórki: ${review}`,
  };
};

const formatCompletedAt = (
  value: string | null,
  translate: (key: string, values?: Record<string, string | number>) => string,
  locale: string,
  fallbackCopy: LessonMasteryFallbackCopy
): string => {
  if (!value) {
    return translateLessonMasteryWithFallback(translate, 'dateMissing', fallbackCopy.dateMissing);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return translateLessonMasteryWithFallback(translate, 'dateMissing', fallbackCopy.dateMissing);
  }

  return parsed.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
};

const getMasteryTone = (masteryPercent: number): KangurAccent => {
  if (masteryPercent >= 80) {
    return 'emerald';
  }
  if (masteryPercent >= 60) {
    return 'amber';
  }
  return 'rose';
};

const translateLessonMasteryWithFallback = (
  translate: (key: string, values?: Record<string, string | number>) => string,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
): string =>
  translateKangurLearnerProfileWithFallback(
    translate,
    key,
    fallback,
    values
  );

type InsightListProps = {
  emptyState: string;
  items: ReturnType<typeof buildLessonMasteryInsights>['strongest'];
  title: string;
};

const InsightList = ({ emptyState, items, title }: InsightListProps): React.JSX.Element => {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = getLessonMasteryFallbackCopy(normalizedLocale);
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const translateWithFallback = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ): string => translateLessonMasteryWithFallback(translations, key, fallback, values);

  return (
    <KangurInfoCard accent='slate' padding='md' tone='muted'>
      <KangurSectionEyebrow as='div' className='text-xs tracking-wide'>
        {title}
      </KangurSectionEyebrow>
      {items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-3'
          description={emptyState}
          padding='md'
        />
      ) : (
        <div className='mt-3 flex flex-col kangur-panel-gap'>
          {items.map((item) => (
            <KangurInfoCard
              key={item.componentId}
              accent='slate'
              className='rounded-[22px]'
              padding='md'
            >
              <KangurPanelRow className='items-start sm:justify-between'>
                <div className='min-w-0'>
                  <KangurCardTitle as='div'>
                    {item.emoji} {item.title}
                  </KangurCardTitle>
                  <KangurMetaText as='div' className='mt-1' size='xs'>
                    {translateWithFallback(
                      'attemptsLine',
                      fallbackCopy.attemptsLine(item.attempts, item.lastScorePercent),
                      {
                        attempts: item.attempts,
                        lastScore: item.lastScorePercent,
                      }
                    )}
                  </KangurMetaText>
                </div>
                <KangurStatusChip
                  accent={getMasteryTone(item.masteryPercent)}
                  className='self-start sm:self-auto'
                  size='md'
                >
                  {item.masteryPercent}%
                </KangurStatusChip>
              </KangurPanelRow>
              <KangurMetaText as='div' className='mt-2' size='xs'>
                {translateWithFallback(
                  'bestScoreLine',
                  fallbackCopy.bestScoreLine(
                    item.bestScorePercent,
                    formatCompletedAt(item.lastCompletedAt, translations, locale, fallbackCopy)
                  ),
                  {
                    bestScore: item.bestScorePercent,
                    date: formatCompletedAt(item.lastCompletedAt, translations, locale, fallbackCopy),
                  }
                )}
              </KangurMetaText>
            </KangurInfoCard>
          ))}
        </div>
      )}
    </KangurInfoCard>
  );
};

export default function LessonMasteryInsights({
  progress,
  sectionSummary,
  sectionTitle,
}: LessonMasteryInsightsProps): React.JSX.Element {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = getLessonMasteryFallbackCopy(normalizedLocale);
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const translateWithFallback = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ): string => translateLessonMasteryWithFallback(translations, key, fallback, values);
  const insights = buildLessonMasteryInsights(progress, 3, locale);
  const resolvedSectionTitle =
    sectionTitle ?? translateWithFallback('title', fallbackCopy.title);
  const resolvedSectionSummary =
    sectionSummary ??
    translateWithFallback(
      'trackedSummary',
      fallbackCopy.trackedSummary(
        insights.trackedLessons,
        insights.masteredLessons,
        insights.lessonsNeedingPractice
      ),
      {
        tracked: insights.trackedLessons,
        mastered: insights.masteredLessons,
        review: insights.lessonsNeedingPractice,
      }
    );

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-end sm:justify-between`}>
        <KangurPanelIntro description={resolvedSectionSummary} eyebrow={resolvedSectionTitle} />
        {insights.trackedLessons > 0 && (
          <KangurStatusChip accent='indigo' size='md'>
            {translateWithFallback(
              'trackedBadge',
              fallbackCopy.trackedBadge(insights.trackedLessons),
              { count: insights.trackedLessons }
            )}
          </KangurStatusChip>
        )}
      </div>

      {insights.trackedLessons === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4'
          description={translateWithFallback(
            'emptyDescription',
            fallbackCopy.emptyDescription
          )}
          padding='lg'
        />
      ) : (
        <div className='mt-4 grid grid-cols-1 xl:grid-cols-2 kangur-panel-gap'>
          <InsightList
            title={translateWithFallback('reviewTitle', fallbackCopy.reviewTitle)}
            items={insights.weakest}
            emptyState={translateWithFallback(
              'reviewEmpty',
              fallbackCopy.reviewEmpty
            )}
          />
          <InsightList
            title={translateWithFallback('strongestTitle', fallbackCopy.strongestTitle)}
            items={insights.strongest}
            emptyState={translateWithFallback(
              'strongestEmpty',
              fallbackCopy.strongestEmpty
            )}
          />
        </div>
      )}
    </KangurGlassPanel>
  );
}
