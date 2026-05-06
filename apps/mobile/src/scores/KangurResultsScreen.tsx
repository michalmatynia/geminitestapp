import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import {
  resolveResultsFilterFamily,
  resolveResultsFilterOperation,
} from './results-primitives';
import { ResultsHeader, ResultsOverview, ResultsAssignmentsSection, ResultsBadgesSection, ResultsLessonMasterySection, ResultsDuelsSection, ResultsCheckpointsSection, ResultsListSection } from './components';
import { useKangurMobileResults } from './useKangurMobileResults';
import { useKangurMobileResultsAssignments } from './useKangurMobileResultsAssignments';
import { useKangurMobileResultsLessonMastery } from './useKangurMobileResultsLessonMastery';
import { useKangurMobileResultsBadges } from './useKangurMobileResultsBadges';
import { useKangurMobileResultsDuels } from './useKangurMobileResultsDuels';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import type { ReactElement } from 'react';

const DUELS_ROUTE = createKangurDuelsHref();
const PROFILE_ROUTE = '/profile' as Href;
const LESSONS_ROUTE = '/lessons' as Href;

import { type UseKangurMobileResultsResult } from './useKangurMobileResults';
import { type UseKangurMobileResultsAssignmentsResult } from './useKangurMobileResultsAssignments';
import { type UseKangurMobileResultsBadgesResult } from './useKangurMobileResultsBadges';
import { type UseKangurMobileResultsLessonMasteryResult } from './useKangurMobileResultsLessonMastery';
import { type UseKangurMobileLearnerDuelsSummaryResult } from '../duels/useKangurMobileLearnerDuelsSummary';
import { type UseKangurMobileLessonCheckpointsResult } from '../lessons/useKangurMobileLessonCheckpoints';

interface ResultsContentProps {
  results: UseKangurMobileResultsResult;
  resultsAssignments: UseKangurMobileResultsAssignmentsResult;
  resultsBadges: UseKangurMobileResultsBadgesResult;
  lessonMastery: UseKangurMobileResultsLessonMasteryResult;
  duelResults: UseKangurMobileLearnerDuelsSummaryResult;
  lessonCheckpoints: UseKangurMobileLessonCheckpointsResult;
  filterFamily: string | undefined;
  filterOperation: string | undefined;
  lessonFocusSummary: string | null;
  copy: (text: Record<string, string>) => string;
  locale: string;
  openDuelSession: (sessionId: string) => void;
}

function ResultsContent({ 
    results, 
    resultsAssignments, 
    resultsBadges, 
    lessonMastery, 
    duelResults, 
    lessonCheckpoints, 
    filterFamily, 
    filterOperation, 
    lessonFocusSummary, 
    copy, 
    locale, 
    openDuelSession 
}: ResultsContentProps): ReactElement {
  return (
    <>
      <ResultsOverview results={results} copy={copy} />
      <ResultsAssignmentsSection assignments={resultsAssignments.assignmentItems} copy={copy} />
      <ResultsBadgesSection badges={resultsBadges} copy={copy} profileHref={PROFILE_ROUTE} />
      <ResultsLessonMasterySection mastery={lessonMastery} summary={lessonFocusSummary} copy={copy} />
      <ResultsDuelsSection duelResults={duelResults} duelsHref={DUELS_ROUTE} openDuelSession={openDuelSession} />
      <ResultsCheckpointsSection checkpoints={lessonCheckpoints.recentCheckpoints} copy={copy} lessonsHref={LESSONS_ROUTE} />
      <ResultsListSection results={results} copy={copy} locale={locale} family={filterFamily} operation={filterOperation} />
    </>
  );
}

function resolveLessonFocusSummary(
  weakest: { title: string } | null, 
  strongest: { title: string } | null, 
  copy: (text: Record<string, string>) => string
): string | null {
  if (weakest !== null) {
    return copy({
      de: `Fokus nach den Ergebnissen: ${weakest.title} braucht noch eine schnelle Wiederholung, bevor du wieder Tempo aufbaust.`,
      en: `Post-results focus: ${weakest.title} still needs a quick review before you build momentum again.`,
      pl: `Fokus po wynikach: ${weakest.title} potrzebuje jeszcze szybkiej powtórki, zanim znowu wejdziesz w tempo.`,
    });
  }
  if (strongest !== null) {
    return copy({
      de: `Stabile Stärke: ${strongest.title} hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
      en: `Stable strength: ${strongest.title} is holding its level and works well for a short confidence run.`,
      pl: `Stabilna mocna strona: ${strongest.title} trzyma poziom i nadaje się na krótkie, pewne wejście.`,
    });
  }
  return null;
}

export function KangurResultsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{
    family?: string | string[];
    operation?: string | string[];
  }>();
  
  const filterFamily = resolveResultsFilterFamily(params.family);
  const filterOperation = resolveResultsFilterOperation(params.operation);
  
  const results: UseKangurMobileResultsResult = useKangurMobileResults({
    family: filterOperation !== null ? 'all' : filterFamily,
    operation: filterOperation,
  });
  const duelResults: UseKangurMobileLearnerDuelsSummaryResult = useKangurMobileResultsDuels();
  const resultsAssignments: UseParentDashboardAssignmentsResult = useParentDashboardAssignments() as UseParentDashboardAssignmentsResult;
  const lessonMastery: UseKangurMobileResultsLessonMasteryResult = useKangurMobileResultsLessonMastery();
  const resultsBadges: UseKangurMobileResultsBadgesResult = useKangurMobileResultsBadges();
  const lessonCheckpoints: UseKangurMobileLessonCheckpointsResult = useKangurMobileLessonCheckpoints({ limit: 2 });

  const lessonFocusSummary = resolveLessonFocusSummary(
      lessonMastery.weakest[0] ?? null, 
      lessonMastery.strongest[0] ?? null, 
      copy
  );
      
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
        <View style={{ gap: 14 }}>
          <ResultsHeader copy={copy} />
          
          {(results.isLoading || !results.isEnabled) ? null : (
            <ResultsContent 
                results={results} 
                resultsAssignments={resultsAssignments} 
                resultsBadges={resultsBadges} 
                lessonMastery={lessonMastery} 
                duelResults={duelResults} 
                lessonCheckpoints={lessonCheckpoints} 
                filterFamily={filterFamily} 
                filterOperation={filterOperation} 
                lessonFocusSummary={lessonFocusSummary} 
                copy={copy} 
                locale={locale} 
                openDuelSession={openDuelSession}
            />
          )}
        </View>
    </KangurMobileScrollScreen>
  );
}
