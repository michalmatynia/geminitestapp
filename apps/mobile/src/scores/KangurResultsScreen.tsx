import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import {
  resolveResultsFilterFamily,
  resolveResultsFilterOperation,
} from './results-primitives';
import {
  ResultsHeader,
  ResultsOverview,
  ResultsAssignmentsSection,
  ResultsBadgesSection,
  ResultsLessonMasterySection,
  ResultsDuelsSection,
  ResultsCheckpointsSection,
  ResultsListSection,
} from './components';
import { useKangurMobileResults } from './useKangurMobileResults';
import { useKangurMobileResultsAssignments } from './useKangurMobileResultsAssignments';
import { useKangurMobileResultsLessonMastery } from './useKangurMobileResultsLessonMastery';
import { useKangurMobileResultsBadges } from './useKangurMobileResultsBadges';
import { useKangurMobileResultsDuels } from './useKangurMobileResultsDuels';
import { KangurMobileScrollScreen, LinkButton } from '../shared/KangurMobileUi';
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
  filterOperation,
  lessonFocusSummary,
  copy,
  locale,
  openDuelSession,
}: ResultsContentProps): ReactElement {
  return (
    <>
      <ResultsOverview results={results} copy={copy} />
      <ResultsAssignmentsSection assignmentItems={resultsAssignments.assignmentItems} copy={copy} />
      <ResultsBadgesSection resultsBadges={resultsBadges} copy={copy} profileHref={PROFILE_ROUTE} />
      <ResultsLessonMasterySection lessonMastery={lessonMastery} lessonFocusSummary={lessonFocusSummary} copy={copy} />
      <ResultsDuelsSection duelResults={duelResults} duelsHref={DUELS_ROUTE} openDuelSession={openDuelSession} />
      <ResultsCheckpointsSection checkpoints={lessonCheckpoints.recentCheckpoints} copy={copy} lessonsHref={LESSONS_ROUTE} />
      <ResultsListSection
        results={results}
        copy={copy}
        locale={locale}
        filterOperation={filterOperation}
      />
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

interface KangurResultsScreenData {
  results: UseKangurMobileResultsResult;
  duelResults: UseKangurMobileLearnerDuelsSummaryResult;
  resultsAssignments: UseKangurMobileResultsAssignmentsResult;
  lessonMastery: UseKangurMobileResultsLessonMasteryResult;
  resultsBadges: UseKangurMobileResultsBadgesResult;
  lessonCheckpoints: UseKangurMobileLessonCheckpointsResult;
  filterFamily: string | undefined;
  filterOperation: string | undefined;
  lessonFocusSummary: string | null;
  copy: (text: Record<string, string>) => string;
  locale: string;
  openDuelSession: (sessionId: string) => void;
}

function useKangurResultsScreenData(): KangurResultsScreenData {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{
    family?: string | string[];
    operation?: string | string[];
  }>();

  const filterFamily = resolveResultsFilterFamily(params.family);
  const filterOperation = resolveResultsFilterOperation(params.operation);

  const results = useKangurMobileResults({
    family: filterOperation !== null ? 'all' : filterFamily,
    operation: filterOperation,
  });
  
  const duelResults = useKangurMobileResultsDuels();
  const resultsAssignments = useKangurMobileResultsAssignments();
  const lessonMastery = useKangurMobileResultsLessonMastery();
  const resultsBadges = useKangurMobileResultsBadges();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });

  const lessonFocusSummary = resolveLessonFocusSummary(
    lessonMastery.weakest[0] ?? null,
    lessonMastery.strongest[0] ?? null,
    copy
  );

  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  return {
    results,
    duelResults,
    resultsAssignments,
    lessonMastery,
    resultsBadges,
    lessonCheckpoints,
    filterFamily,
    filterOperation,
    lessonFocusSummary,
    copy,
    locale,
    openDuelSession,
  };
}

function ResultsStateView({ data }: { data: KangurResultsScreenData }): React.JSX.Element {
  const { results, copy } = data;

  if (!results.isEnabled) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Melden Sie sich an, um die Ergebnisse zu sehen.',
            en: 'Sign in to see results.',
            pl: 'Zaloguj się, aby zobaczyć wyniki.',
          })}
        </Text>
        <LinkButton
          href='/'
          label={copy({
            de: 'Zum Login',
            en: 'Go to sign in',
            pl: 'Przejdź do logowania',
          })}
        />
      </View>
    );
  }

  if (results.isLoading || results.isRestoringAuth) {
    return (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Wir stellen die Anmeldung und Ergebnisse wieder her.',
          en: 'Restoring sign-in and results.',
          pl: 'Przywracamy logowanie i wyniki.',
        })}
      </Text>
    );
  }

  if (results.error !== null) {
    return (
      <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
        {results.error}
      </Text>
    );
  }

  return (
    <ResultsContent
      results={results}
      resultsAssignments={data.resultsAssignments}
      resultsBadges={data.resultsBadges}
      lessonMastery={data.lessonMastery}
      duelResults={data.duelResults}
      lessonCheckpoints={data.lessonCheckpoints}
      filterOperation={data.filterOperation}
      lessonFocusSummary={data.lessonFocusSummary}
      copy={copy}
      locale={data.locale}
      openDuelSession={data.openDuelSession}
    />
  );
}

export function KangurResultsScreen(): React.JSX.Element {
  const data = useKangurResultsScreenData();

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
      <View style={{ gap: 14 }}>
        <ResultsHeader copy={data.copy} />
        <ResultsStateView data={data} />
      </View>
    </KangurMobileScrollScreen>
  );
}
