import { View, Text } from 'react-native';
import { Card, KangurMobileActionButton as ActionButton, KangurMobileFilterChip, KangurMobileInsetPanel as InsetPanel, KangurMobileLinkButton as LinkButton, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { formatKangurMobileScoreOperation, formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import { getAccuracyTone } from '../results-primitives';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from './resultsHref';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import type { KangurScore } from '@kangur/contracts/kangur';
import type { KangurMobileLocale } from '../../i18n/kangurMobileI18n';

interface ResultsListSectionProps {
  results: {
    scores: KangurScore[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    availableOperations: string[];
  };
  copy: <T>(v: Record<KangurMobileLocale, T>) => T;
  locale: KangurMobileLocale;
  filterOperation: string | null;
}

function getKangurMobileScoreAccuracyPercent(score: KangurScore): number {
  if (score.total_questions === 0) return 0;
  return Math.round((score.correct_answers / score.total_questions) * 100);
}

function renderScoreItem(
  score: KangurScore,
  copy: <T>(v: Record<KangurMobileLocale, T>) => T,
  locale: KangurMobileLocale
): React.JSX.Element {
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(score);
  const accuracyTone = getAccuracyTone(accuracyPercent);
  const lessonHref = createKangurLessonHrefForPracticeOperation(score.operation);

  return (
    <InsetPanel key={score.id} gap={10}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>{formatKangurMobileScoreOperation(score.operation, locale)}</Text>
          <Text style={{ fontSize: 13 }}>{formatKangurMobileScoreDateTime(score.created_date, locale)}</Text>
        </View>
        <Pill label={`${accuracyPercent}%`} tone={accuracyTone} />
      </View>
      <Text>
        {copy({
          de: `${score.correct_answers}/${score.total_questions} richtig`,
          en: `${score.correct_answers}/${score.total_questions} correct`,
          pl: `${score.correct_answers}/${score.total_questions} poprawnych`,
        })}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <LinkButton href={createKangurPracticeHref(score.operation)} label={copy({ de: 'Trainieren', en: 'Train', pl: 'Trenuj' })} />
        {lessonHref !== undefined && lessonHref !== null && (
          <LinkButton href={lessonHref} label={copy({ de: 'Lektion', en: 'Lesson', pl: 'Lekcja' })} />
        )}
      </View>
    </InsetPanel>
  );
}

function renderFilterChips(
  operations: string[],
  filterOperation: string | null,
  locale: KangurMobileLocale
): React.JSX.Element | null {
  if (operations.length === 0) {
    return null;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {operations.map((operation) => (
        <KangurMobileFilterChip
          key={operation}
          href={createKangurResultsHref({ family: 'all', operation })}
          horizontalPadding={12}
          idleTextColor='#475569'
          label={formatKangurMobileScoreOperation(operation, locale)}
          selected={filterOperation === operation}
          selectedBackgroundColor='#eef2ff'
          selectedBorderColor='#4338ca'
          selectedTextColor='#4338ca'
          verticalPadding={8}
        />
      ))}
    </View>
  );
}

export function ResultsListSection({
  results,
  copy,
  locale,
  filterOperation,
}: ResultsListSectionProps): React.JSX.Element {
  let content: React.ReactNode;

  if (results.isLoading) {
    content = <Text>{copy({ de: 'Die Ergebnisse werden geladen.', en: 'Loading results.', pl: 'Pobieramy wyniki.' })}</Text>;
  } else if (results.error !== null && results.error !== '') {
    content = <Text style={{ color: '#b91c1c' }}>{results.error}</Text>;
  } else {
    content = results.scores.map((score) => renderScoreItem(score, copy, locale));
  }

  return (
    <Card>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
            {copy({ de: 'Vollständige Liste', en: 'Full list', pl: 'Pełna lista' })}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Hier kannst du die gesamte Ergebnisliste aktualisieren.',
              en: 'Refresh the full results list here.',
              pl: 'Tutaj odświeżysz pełną listę wyników.',
            })}
          </Text>
        </View>
        <ActionButton label={copy({ de: 'Aktualisieren', en: 'Refresh', pl: 'Odśwież' })} onPress={() => results.refresh()} />
      </View>

      <View style={{ gap: 10 }}>
        {renderFilterChips(results.availableOperations, filterOperation, locale)}
        {content}
      </View>
    </Card>
  );
}
