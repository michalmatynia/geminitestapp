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

const DUELS_ROUTE = createKangurDuelsHref();
const PROFILE_ROUTE = '/profile' as Href;
const LESSONS_ROUTE = '/lessons' as Href;

export function KangurResultsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{
    family?: string | string[];
    operation?: string | string[];
  }>();
  const filterFamily = resolveResultsFilterFamily(params.family);
  const filterOperation = resolveResultsFilterOperation(params.operation);
  
  const results = useKangurMobileResults({
    family: filterOperation != null ? 'all' : filterFamily,
    operation: filterOperation,
  });
  const duelResults = useKangurMobileResultsDuels();
  const resultsAssignments = useKangurMobileResultsAssignments();
  const lessonMastery = useKangurMobileResultsLessonMastery();
  const resultsBadges = useKangurMobileResultsBadges();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus nach den Ergebnissen: ${  weakestLesson.title  } braucht noch eine schnelle Wiederholung, bevor du wieder Tempo aufbaust.`,
        en: `Post-results focus: ${  weakestLesson.title  } still needs a quick review before you build momentum again.`,
        pl: `Fokus po wynikach: ${  weakestLesson.title  } potrzebuje jeszcze szybkiej powtórki, zanim znowu wejdziesz w tempo.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${  strongestLesson.title  } hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
          en: `Stable strength: ${  strongestLesson.title  } is holding its level and works well for a short confidence run.`,
          pl: `Stabilna mocna strona: ${  strongestLesson.title  } trzyma poziom i nadaje się na krótkie, pewne wejście.`,
        })
      : null;
      
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
        <View style={{ gap: 14 }}>
          <ResultsHeader copy={copy} />
          
          {results.isLoading || !results.isEnabled ? null : (
            <>
              <ResultsOverview results={results} copy={copy} />
              <ResultsAssignmentsSection
                assignmentItems={resultsAssignments.assignmentItems}
                copy={copy}
              />
              <ResultsBadgesSection
                resultsBadges={resultsBadges}
                copy={copy}
                profileHref={PROFILE_ROUTE}
              />
              <ResultsLessonMasterySection
                lessonMastery={lessonMastery}
                lessonFocusSummary={lessonFocusSummary}
                copy={copy}
              />
              <ResultsDuelsSection
                duelResults={duelResults}
                duelsHref={DUELS_ROUTE}
                openDuelSession={openDuelSession}
              />
              <ResultsCheckpointsSection
                checkpoints={lessonCheckpoints.recentCheckpoints}
                copy={copy}
                lessonsHref={LESSONS_ROUTE}
              />
              <ResultsListSection
                results={results}
                copy={copy}
                locale={locale}
                filterFamily={filterFamily}
                filterOperation={filterOperation}
              />
            </>
          )}
        </View>
    </KangurMobileScrollScreen>
  );
}
