import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileLessonCheckpoints,
} from '../lessons/useKangurMobileLessonCheckpoints';
import {
  KangurMobileLinkButton as LinkButton,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';
import {
  DUELS_ROUTE,
} from './daily-plan-primitives';
import { useKangurMobileDailyPlanAssignments } from './useKangurMobileDailyPlanAssignments';
import {
  useKangurMobileDailyPlanBadges,
} from './useKangurMobileDailyPlanBadges';
import { useKangurMobileDailyPlanDuels } from './useKangurMobileDailyPlanDuels';
import { useKangurMobileDailyPlan } from './useKangurMobileDailyPlan';
import { useKangurMobileDailyPlanLessonMastery } from './useKangurMobileDailyPlanLessonMastery';
import { DailyPlanSummaryCard } from './components/DailyPlanSummaryCard';
import { DailyPlanFocusSection } from './components/DailyPlanFocusSection';
import { DailyPlanBadgesSection } from './components/DailyPlanBadgesSection';
import { DailyPlanDuelsSection } from './components/DailyPlanDuelsSection';
import { DailyPlanAssignmentsSection } from './components/DailyPlanAssignmentsSection';
import { DailyPlanMasterySection } from './components/DailyPlanMasterySection';
import { DailyPlanCheckpointsSection } from './components/DailyPlanCheckpointsSection';
import { DailyPlanResultsSection } from './components/DailyPlanResultsSection';
import { createKangurDuelsHref } from '../duels/duelsHref';

export function KangurDailyPlanScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonMastery = useKangurMobileDailyPlanLessonMastery();
  const dailyPlanBadges = useKangurMobileDailyPlanBadges();
  const dailyPlanAssignments = useKangurMobileDailyPlanAssignments();
  const {
    authError,
    displayName,
    isAuthenticated,
    isLoadingAuth,
    isLoading,
    recentResultItems,
    refresh,
    scoreError,
    signIn,
    strongestFocus,
    supportsLearnerCredentials,
    weakestFocus,
  } = useKangurMobileDailyPlan();
  const duelPlan = useKangurMobileDailyPlanDuels();
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;

  let lessonFocusSummary: string | null = null;
  if (weakestLesson !== null) {
    lessonFocusSummary = copy({
      de: `Fokus für heute: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du wieder Tempo aufnimmst.`,
      en: `Focus for today: ${weakestLesson.title} still needs a short review before you build pace again.`,
      pl: `Fokus na dziś: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim znowu wejdziesz w tempo.`,
    });
  } else if (strongestLesson !== null) {
    lessonFocusSummary = copy({
      de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
      en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short confident start.`,
      pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótki, pewny start.`,
    });
  }

  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
        <View style={{ gap: 14 }}>
          <LinkButton
            href='/'
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
          />

          <DailyPlanSummaryCard
            assignmentsCount={dailyPlanAssignments.assignmentItems.length}
            authError={authError}
            copy={copy}
            displayName={displayName}
            isAuthenticated={isAuthenticated}
            isLoadingAuth={isLoadingAuth}
            lessonsCount={lessonMastery.trackedLessons}
            refresh={() => refresh()}
            resultsCount={recentResultItems.length}
            signIn={() => signIn()}
            supportsLearnerCredentials={supportsLearnerCredentials}
          />

          <DailyPlanFocusSection
            copy={copy}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            scoreError={scoreError}
            strongestFocus={strongestFocus}
            weakestFocus={weakestFocus}
          />

          <DailyPlanBadgesSection
            copy={copy}
            recentBadges={dailyPlanBadges.recentBadges}
            remainingBadges={dailyPlanBadges.remainingBadges}
            totalBadges={dailyPlanBadges.totalBadges}
            unlockedBadges={dailyPlanBadges.unlockedBadges}
          />

          <DailyPlanDuelsSection
            copy={copy}
            duelPlan={duelPlan}
            locale={locale}
            openDuelSession={openDuelSession}
          />

          <DailyPlanAssignmentsSection
            assignmentItems={dailyPlanAssignments.assignmentItems}
            copy={copy}
          />

          <DailyPlanMasterySection
            copy={copy}
            lessonFocusSummary={lessonFocusSummary}
            lessonMastery={lessonMastery}
          />

          <DailyPlanCheckpointsSection
            copy={copy}
            lessonCheckpoints={lessonCheckpoints}
          />

          <DailyPlanResultsSection
            copy={copy}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            recentResultItems={recentResultItems}
            scoreError={scoreError}
          />
        </View>
    </KangurMobileScrollScreen>
  );
}
