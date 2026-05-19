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

function DailyPlanHeader({
  assignmentsCount,
  authError,
  copy,
  displayName,
  isAuthenticated,
  isLoadingAuth,
  lessonsCount,
  refresh,
  resultsCount,
  signIn,
  supportsLearnerCredentials,
}: {
  assignmentsCount: number;
  authError: string | null;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  displayName: string | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  lessonsCount: number;
  refresh: () => Promise<void>;
  resultsCount: number;
  signIn: () => Promise<void>;
  supportsLearnerCredentials: boolean;
}): React.JSX.Element {
  return (
    <DailyPlanSummaryCard
      assignmentsCount={assignmentsCount}
      authError={authError}
      copy={copy}
      displayName={displayName}
      isAuthenticated={isAuthenticated}
      isLoadingAuth={isLoadingAuth}
      lessonsCount={lessonsCount}
      refresh={() => { void refresh(); }}
      resultsCount={resultsCount}
      signIn={() => { void signIn(); }}
      supportsLearnerCredentials={supportsLearnerCredentials}
    />
  );
}

function DailyPlanContent({
  copy,
  locale,
  lessonCheckpoints,
  lessonMastery,
  dailyPlanBadges,
  dailyPlanAssignments,
  authError,
  displayName,
  isAuthenticated,
  isLoadingAuth,
  isLoading,
  recentResultItems,
  refresh,
  scoreError,
  signIn,
  supportsLearnerCredentials,
  duelPlan,
  openDuelSession,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
  lessonCheckpoints: ReturnType<typeof useKangurMobileLessonCheckpoints>;
  lessonMastery: ReturnType<typeof useKangurMobileDailyPlanLessonMastery>;
  dailyPlanBadges: ReturnType<typeof useKangurMobileDailyPlanBadges>;
  dailyPlanAssignments: ReturnType<typeof useKangurMobileDailyPlanAssignments>;
  authError: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoading: boolean;
  recentResultItems: any[];
  refresh: () => Promise<void>;
  scoreError: string | null;
  signIn: () => Promise<void>;
  supportsLearnerCredentials: boolean;
  duelPlan: ReturnType<typeof useKangurMobileDailyPlanDuels>;
  openDuelSession: (sessionId: string) => void;
}): React.JSX.Element {
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;

  const lessonFocusSummary = useMemo(() => {
    if (weakestLesson !== null) {
      return copy({
        de: `Fokus für heute: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du wieder Tempo aufnimmst.`,
        en: `Focus for today: ${weakestLesson.title} still needs a short review before you build pace again.`,
        pl: `Fokus na dziś: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim znowu wejdziesz w tempo.`,
      });
    }
    if (strongestLesson !== null) {
      return copy({
        de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
        en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short confident start.`,
        pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótki, pewny start.`,
      });
    }
    return null;
  }, [weakestLesson, strongestLesson, copy]);

  return (
    <View style={{ gap: 14 }}>
      <LinkButton href='/' label={copy({ de: 'Zurück', en: 'Back', pl: 'Wróć' })} />
      <DailyPlanHeader
        assignmentsCount={dailyPlanAssignments.assignmentItems.length}
        authError={authError}
        copy={copy}
        displayName={displayName}
        isAuthenticated={isAuthenticated}
        isLoadingAuth={isLoadingAuth}
        lessonsCount={lessonMastery.trackedLessons}
        refresh={refresh}
        resultsCount={recentResultItems.length}
        signIn={signIn}
        supportsLearnerCredentials={supportsLearnerCredentials}
      />
      <DailyPlanFocusSection
        copy={copy}
        isAuthenticated={duelPlan.isAuthenticated}
        isLoading={duelPlan.isLoading}
        scoreError={duelPlan.scoreError}
        strongestFocus={duelPlan.strongestFocus}
        weakestFocus={duelPlan.weakestFocus}
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
  );
}

export function KangurDailyPlanScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonMastery = useKangurMobileDailyPlanLessonMastery();
  const dailyPlanBadges = useKangurMobileDailyPlanBadges();
  const dailyPlanAssignments = useKangurMobileDailyPlanAssignments();
  const dailyPlan = useKangurMobileDailyPlan();
  const duelPlan = useKangurMobileDailyPlanDuels();

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
      <DailyPlanContent
        copy={copy}
        locale={locale}
        lessonCheckpoints={lessonCheckpoints}
        lessonMastery={lessonMastery}
        dailyPlanBadges={dailyPlanBadges}
        dailyPlanAssignments={dailyPlanAssignments}
        authError={dailyPlan.authError}
        displayName={dailyPlan.displayName}
        isAuthenticated={dailyPlan.isAuthenticated}
        isLoadingAuth={dailyPlan.isLoadingAuth}
        isLoading={dailyPlan.isLoading}
        recentResultItems={dailyPlan.recentResultItems}
        refresh={dailyPlan.refresh}
        scoreError={dailyPlan.scoreError}
        signIn={dailyPlan.signIn}
        strongestFocus={dailyPlan.strongestFocus}
        supportsLearnerCredentials={dailyPlan.supportsLearnerCredentials}
        weakestFocus={dailyPlan.weakestFocus}
        duelPlan={duelPlan}
        openDuelSession={openDuelSession}
      />
    </KangurMobileScrollScreen>
  );
}
