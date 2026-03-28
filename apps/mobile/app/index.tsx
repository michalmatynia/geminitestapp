import { type Href, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { KangurScore } from '@kangur/contracts/kangur';
import { useKangurMobileAuth } from '../src/auth/KangurMobileAuthContext';
import { createKangurCompetitionHref } from '../src/competition/competitionHref';
import { createKangurDuelsHref } from '../src/duels/duelsHref';
import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
} from '../src/home/homeDebugProof';
import { getKangurHomeAuthBoundaryViewModel } from '../src/home/homeAuthBoundary';
import { HomeLoadingShell } from '../src/home/HomeLoadingShell';
import {
  KangurMobileHomeProgressSnapshotProvider,
} from '../src/home/KangurMobileHomeProgressSnapshotContext';
import {
  useHomeScreenDeferredPanelGroup,
  useHomeScreenDeferredPanelSequence,
  useHomeScreenDeferredPanels,
} from '../src/home/useHomeScreenDeferredPanels';
import { useKangurMobileHomeAssignments } from '../src/home/useKangurMobileHomeAssignments';
import { useKangurMobileHomeLessonMastery } from '../src/home/useKangurMobileHomeLessonMastery';
import {
  useKangurMobileHomeLessonCheckpoints,
  type KangurMobileHomeLessonCheckpointItem,
} from '../src/home/useKangurMobileHomeLessonCheckpoints';
import { useKangurMobileHomeBadges } from '../src/home/useKangurMobileHomeBadges';
import {
  buildPersistedKangurMobileHomeLessonCheckpointSnapshot,
  persistKangurMobileHomeLessonCheckpoints,
  resolveKangurMobileHomeLessonCheckpointIdentity,
  resolvePersistedKangurMobileHomeLessonCheckpoints,
} from '../src/home/persistedKangurMobileHomeLessonCheckpoints';
import { useKangurMobileRecentResults } from '../src/home/useKangurMobileRecentResults';
import { useKangurMobileTrainingFocus } from '../src/home/useKangurMobileTrainingFocus';
import { useHomeScreenBootState } from '../src/home/useHomeScreenBootState';
import {
  AuthenticatedHomePrivateDuelSectionGroup,
  AuthenticatedHomeRematchesSection,
  AnonymousHomePrivateDuelSectionGroup,
  AnonymousHomeRematchesSection,
  HomeLiveDuelsSection,
  HomeDuelLeaderboardSection,
  DeferredDuelAdvancedSectionPlaceholder,
} from '../src/home/HomeDuelSections';
import {
  SectionCard,
  OutlineLink,
  PrimaryButton,
  LabeledTextField,
  FocusCard,
  SummaryChip,
  BadgeChip,
  AssignmentCard,
  LessonMasteryCard,
  LessonCheckpointCard,
} from '../src/home/homeScreenPrimitives';
import { useKangurMobileI18n } from '../src/i18n/kangurMobileI18n';
import { createKangurLessonHref } from '../src/lessons/lessonHref';
import { createKangurParentDashboardHref } from '../src/parent/parentHref';
import { createKangurPlanHref } from '../src/plan/planHref';
import { createKangurPracticeHref } from '../src/practice/practiceHref';
import { useKangurMobileRuntime } from '../src/providers/KangurRuntimeContext';
import {
  createKangurResultsHref,
} from '../src/scores/resultsHref';
import {
  formatKangurMobileScoreOperation,
  type KangurMobileOperationPerformance,
} from '../src/scores/mobileScoreSummary';
import { createKangurTestsHref } from '../src/tests/testsHref';

const RESULTS_ROUTE = '/results' as Href;
const PROFILE_ROUTE = '/profile' as Href;
const LEADERBOARD_ROUTE = '/leaderboard' as Href;
const LESSONS_ROUTE = '/lessons' as Href;
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const TESTS_ROUTE = createKangurTestsHref();
const COMPETITION_ROUTE = createKangurCompetitionHref();
const PLAN_ROUTE = createKangurPlanHref();
const DUELS_ROUTE = createKangurDuelsHref();
const PARENT_ROUTE = createKangurParentDashboardHref();
const HOME_DUEL_PANEL_SEQUENCE = [
  'home:duels',
  'home:duels:secondary',
  'home:duels:invites',
  'home:duels:advanced',
] as const;
const HOME_INSIGHT_SCORE_REFRESH_SEQUENCE = [
  'home:insights',
  'home:insights:scores',
] as const;
const HOME_PRIMARY_SURFACE_PANEL_GROUP = [
  'home:hero:intro',
  'home:hero:details',
  'home:account:summary',
] as const;
const HOME_SCORE_DETAILS_PANEL_GROUP = [
  'home:hero:scores',
  'home:training-focus:details',
] as const;
const HOME_ACCOUNT_DETAILS_PANEL_GROUP = [
  'home:account:details',
  'home:account:sign-in',
] as const;
const HOME_NAVIGATION_PANEL_SEQUENCE = [
  'home:navigation:secondary',
  'home:navigation:extended',
] as const;
const HOME_INSIGHTS_SECTION_PANEL_GROUP = [
  'home:insights:lessons',
  'home:insights:extras',
] as const;
const HOME_INSIGHTS_EXTRAS_PANEL_GROUP = [
  'home:insights:extras:details',
  'home:insights:extras:results',
] as const;
const HOME_BADGES_PANEL_SEQUENCE = [
  'home:insights:extras:badges',
  'home:insights:extras:badges:details',
] as const;
const HOME_PLAN_PANEL_SEQUENCE = [
  'home:insights:extras:plan',
  'home:insights:extras:plan:details',
  'home:insights:extras:plan:assignments',
] as const;
const HOME_RESULTS_HUB_PANEL_SEQUENCE = [
  'home:insights:results',
  'home:insights:results:actions',
  'home:insights:results:cards',
] as const;

function DeferredHomeActivitySectionsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Nächste Startbereiche',
        en: 'Next home sections',
        pl: 'Kolejne sekcje startowe',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Duelle, Trainingsfokus und weitere gespeicherte Bereiche fur die nächsten Startschritte vor.',
          en: 'Preparing duels, training focus, and more saved sections for the next home steps.',
          pl: 'Przygotowujemy pojedynki, fokus treningowy i kolejne zapisane sekcje na następne etapy ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeStartupSectionsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Startbereiche',
        en: 'Home startup sections',
        pl: 'Sekcje startowe',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Kontostatus, Navigation, Duelle, Trainingsfokus und weitere gespeicherte Bereiche fur die nächsten Startschritte vor.',
          en: 'Preparing account status, navigation, duels, training focus, and more saved sections for the next home steps.',
          pl: 'Przygotowujemy status konta, nawigację, pojedynki, fokus treningowy i kolejne zapisane sekcje na następne etapy ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomePrimaryStartupCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Start in Kangur',
        en: 'Kangur startup',
        pl: 'Start w Kangurze',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Ergebnisse, Lektionen, Kontostatus, Navigation, Duelle und weitere gespeicherte Bereiche fur die nächsten Startschritte vor.',
          en: 'Preparing results, lessons, account status, navigation, duels, and more saved sections for the next home steps.',
          pl: 'Przygotowujemy wyniki, lekcje, status konta, nawigację, pojedynki i kolejne zapisane sekcje na następne etapy ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredTrainingFocusDetailsPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die detaillierten Trainingskarten fur den nachsten Startschritt vor.',
        en: 'Preparing detailed training cards for the next home step.',
        pl: 'Przygotowujemy szczegółowe karty treningowe na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredResultsHubSummaryPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die Kurzfassung der letzten Ergebnisse fur den nachsten Startschritt vor.',
        en: 'Preparing the compact recent-results summary for the next home step.',
        pl: 'Przygotowujemy skrót ostatnich wyników na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredResultsHubActionsPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die Schnellaktionen fur die letzten Ergebnisse fur den nachsten Startschritt vor.',
        en: 'Preparing the recent-result quick actions for the next home step.',
        pl: 'Przygotowujemy akcje ostatnich wyników na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

type HomeRecentResultsSectionProps = {
  recentResults: {
    error: string | null;
    isDeferred: boolean;
    isLoading: boolean;
    isRestoringAuth: boolean;
    results: KangurScore[];
  };
};

type HomeSecondaryInsightsSectionGroupProps = HomeRecentResultsSectionProps & {
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
};

function DeferredHomeInsightsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Weitere Startdaten',
        en: 'More home insights',
        pl: 'Więcej danych startowych',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten gespeicherte Lektionen, Abzeichen, Aufgaben und den erweiterten Ergebnisbereich fur den Start vor.',
          en: 'Preparing saved lessons, badges, tasks, and the extended results area for the home screen.',
          pl: 'Przygotowujemy zapisane lekcje, odznaki, zadania i rozszerzoną sekcję wyników na ekran startowy.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeNavigationExtendedLinks(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere Navigationsziele fur den nachsten Startschritt vor.',
        en: 'Preparing more navigation destinations for the next home step.',
        pl: 'Przygotowujemy kolejne skróty nawigacji na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeNavigationSecondaryLinks(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten Tagesplan, Ergebnisse und weitere Lernwege fur den nachsten Startschritt vor.',
        en: 'Preparing the daily plan, results, and more learning routes for the next home step.',
        pl: 'Przygotowujemy plan dnia, wyniki i kolejne ścieżki nauki na następny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeAccountSummary(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten Status, Nutzerprofil und weitere Kontodetails fur den nachsten Startschritt vor.',
        en: 'Preparing status, learner profile, and more account details for the next home step.',
        pl: 'Przygotowujemy status, profil ucznia i kolejne szczegóły konta na następny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeQuickAccessCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Schnellzugriff',
        en: 'Quick access',
        pl: 'Szybki dostęp',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Kontostatus, Anmeldung und weitere Navigationswege fur den nächsten Startschritt vor.',
          en: 'Preparing account status, sign-in, and more navigation routes for the next home step.',
          pl: 'Przygotowujemy status konta, logowanie i kolejne ścieżki nawigacji na następny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeAccountDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere Konto- und Verbindungsdetails fur den nachsten Startschritt vor.',
        en: 'Preparing more account and connection details for the next home step.',
        pl: 'Przygotowujemy kolejne szczegóły konta i połączenia na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeAccountSignInForm({
  onOpen,
}: {
  onOpen: () => void;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten das Schüler-Login fur den nachsten Startschritt vor. Du kannst es sofort öffnen.',
          en: 'Preparing the learner sign-in form for the next home step. You can open it immediately.',
          pl: 'Przygotowujemy formularz logowania ucznia na kolejny etap ekranu startowego. Możesz otworzyć go od razu.',
        })}
      </Text>
      <PrimaryButton
        hint={copy({
          de: 'Öffnet sofort das Formular für den Schüler-Login.',
          en: 'Opens the learner sign-in form immediately.',
          pl: 'Otwiera od razu formularz logowania ucznia.',
        })}
        label={copy({
          de: 'Anmeldung öffnen',
          en: 'Open sign-in',
          pl: 'Otwórz logowanie',
        })}
        onPress={onOpen}
      />
    </View>
  );
}

function DeferredHomeHeroDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die letzte Lektion, das letzte Ergebnis und weitere Schnellzugriffe fur den nachsten Startschritt vor.',
        en: 'Preparing the latest lesson, latest score, and more quick links for the next home step.',
        pl: 'Przygotowujemy ostatnią lekcję, ostatni wynik i kolejne szybkie skróty na następny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeHeroOverview({
  homeHeroLearnerName,
  isRestoringAuth,
}: {
  homeHeroLearnerName: string | null;
  isRestoringAuth: boolean;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
      {isRestoringAuth
        ? copy({
            de: 'Wir stellen Anmeldung, letzte Ergebnisse, Lektionen und Schnellzugriffe fur den nächsten Startschritt wieder her.',
            en: 'Restoring sign-in, recent results, lessons, and quick links for the next home step.',
            pl: 'Przywracamy logowanie, ostatnie wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.',
          })
        : homeHeroLearnerName
          ? copy({
              de: `Willkommen zurück, ${homeHeroLearnerName}. Wir bereiten Ergebnisse, Lektionen und Schnellzugriffe fur den nächsten Startschritt vor.`,
              en: `Welcome back, ${homeHeroLearnerName}. Preparing results, lessons, and quick links for the next home step.`,
              pl: `Witaj ponownie, ${homeHeroLearnerName}. Przygotowujemy wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.`,
            })
          : copy({
              de: 'Wir bereiten Ergebnisse, Lektionen und Schnellzugriffe fur den nächsten Startschritt vor.',
              en: 'Preparing results, lessons, and quick links for the next home step.',
              pl: 'Przygotowujemy wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.',
            })}
    </Text>
  );
}

function DeferredHomeHeroIntro({
  homeHeroLearnerName,
  isRestoringAuth,
}: {
  homeHeroLearnerName: string | null;
  isRestoringAuth: boolean;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
      {isRestoringAuth
        ? copy({
            de: 'Wir bereiten die Startdaten gerade vor.',
            en: 'Preparing your home startup data.',
            pl: 'Przygotowujemy teraz dane startowe.',
          })
        : homeHeroLearnerName
          ? copy({
              de: `Willkommen zurück, ${homeHeroLearnerName}.`,
              en: `Welcome back, ${homeHeroLearnerName}.`,
              pl: `Witaj ponownie, ${homeHeroLearnerName}.`,
            })
          : copy({
              de: 'Lektionen, Training und Ergebnisse sind hier schnell erreichbar.',
              en: 'Lessons, practice, and results are all close here.',
              pl: 'Lekcje, trening i wyniki są tutaj pod ręką.',
            })}
    </Text>
  );
}

function DeferredHomeInsightsLessonPlanCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Lektionsplan zum Start',
        en: 'Lesson plan from home',
        pl: 'Plan lekcji ze startu',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die vollstandige Lektionszusammenfassung fur den nachsten Startschritt vor.',
          en: 'Preparing the full lesson summary for the next home step.',
          pl: 'Przygotowujemy pełne podsumowanie lekcji na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsLessonPlanDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die Detailkarten und Lernhinweise fur den nachsten Startschritt vor.',
        en: 'Preparing the lesson detail cards and study cues for the next home step.',
        pl: 'Przygotowujemy szczegółowe karty lekcji i wskazówki nauki na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeInsightsRecentLessonsDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere gespeicherte Lektionen und Schnellwege fur den nachsten Startschritt vor.',
        en: 'Preparing more saved lessons and quick links for the next home step.',
        pl: 'Przygotowujemy kolejne zapisane lekcje i szybkie przejścia na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function DeferredHomeInsightsExtrasCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Weitere gespeicherte Bereiche',
        en: 'More saved sections',
        pl: 'Kolejne zapisane sekcje',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Abzeichen, Aufgaben und das Ergebniszentrum fur den nachsten Startschritt vor.',
          en: 'Preparing badges, tasks, and the results hub for the next home step.',
          pl: 'Przygotowujemy odznaki, zadania i centrum wyników na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function LiveHomeSecondaryLessonPlanSection(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const lessonMastery = useKangurMobileHomeLessonMastery();

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <SummaryChip
          accent='blue'
          label={copy({
            de: `Verfolgt ${lessonMastery.trackedLessons}`,
            en: `Tracked ${lessonMastery.trackedLessons}`,
            pl: `Śledzone ${lessonMastery.trackedLessons}`,
          })}
        />
        <SummaryChip
          accent='emerald'
          label={copy({
            de: `Beherrscht ${lessonMastery.masteredLessons}`,
            en: `Mastered ${lessonMastery.masteredLessons}`,
            pl: `Opanowane ${lessonMastery.masteredLessons}`,
          })}
        />
        <SummaryChip
          accent='amber'
          label={copy({
            de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
            en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
            pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
          })}
        />
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
            en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
            pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {lessonMastery.weakest[0] ? (
            <LessonMasteryCard
              insight={lessonMastery.weakest[0]}
              title={copy({
                de: 'Zum Wiederholen',
                en: 'Needs review',
                pl: 'Do powtórki',
              })}
            />
          ) : (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Alle verfolgten Lektionen sind aktuell auf einem sicheren Niveau.',
                en: 'All tracked lessons are currently at a safe level.',
                pl: 'Wszystkie śledzone lekcje są obecnie na bezpiecznym poziomie.',
              })}
            </Text>
          )}

          {lessonMastery.strongest[0] ? (
            <LessonMasteryCard
              insight={lessonMastery.strongest[0]}
              title={copy({
                de: 'Stärkste Lektion',
                en: 'Strongest lesson',
                pl: 'Najmocniejsza lekcja',
              })}
            />
          ) : null}
        </View>
      )}
    </>
  );
}

function HomeSecondaryLessonPlanSection(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const areDeferredHomeInsightLessonPlanDetailsReady = useHomeScreenDeferredPanels(
    'home:insights:lessons:plan:details',
    false,
  );

  return (
    <SectionCard
      title={copy({
        de: 'Lektionsplan zum Start',
        en: 'Lesson plan from home',
        pl: 'Plan lekcji ze startu',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Sieh sofort, was wiederholt werden sollte und welche Lektion nur kurz aufgefrischt werden muss.',
          en: 'See right away what needs review and which lesson only needs a quick refresh.',
          pl: 'Od razu zobacz, co wymaga powtórki, a którą lekcję trzeba tylko krótko odświeżyć.',
        })}
      </Text>
      {!areDeferredHomeInsightLessonPlanDetailsReady ? (
        <DeferredHomeInsightsLessonPlanDetails />
      ) : (
        <LiveHomeSecondaryLessonPlanSection />
      )}
    </SectionCard>
  );
}

function HomeSecondaryRecentLessonsSection({
  recentCheckpoints,
}: {
  recentCheckpoints: KangurMobileHomeLessonCheckpointItem[];
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const areDeferredHomeInsightRecentLessonsDetailsReady = useHomeScreenDeferredPanels(
    'home:insights:lessons:recent:details',
    false,
  );
  const primaryCheckpoint = recentCheckpoints[0] ?? null;

  return (
    <SectionCard
      title={copy({
        de: 'Zurück zu den letzten Lektionen',
        en: 'Return to recent lessons',
        pl: 'Powrót do ostatnich lekcji',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Jeder lokal gespeicherte Checkpoint oder Lektionsabschluss erscheint hier sofort, damit du vom Start aus direkt an der zuletzt gespeicherten Stelle weitermachen kannst.',
          en: 'Every locally saved checkpoint or lesson completion appears here right away so you can resume from home at the most recently saved lesson.',
          pl: 'Każdy lokalnie zapisany checkpoint albo ukończenie lekcji pojawia się tutaj od razu, aby można było ze startu wrócić do ostatnio zapisanej lekcji.',
        })}
      </Text>
      {recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit die letzten Lektionen hier erscheinen.',
            en: 'There are no saved checkpoints yet. Open a lesson and save the first checkpoint so recent lessons appear here.',
            pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby ostatnie lekcje pojawiły się tutaj.',
          })}
        </Text>
      ) : !areDeferredHomeInsightRecentLessonsDetailsReady && primaryCheckpoint ? (
        <View style={{ gap: 12 }}>
          <LessonCheckpointCard item={primaryCheckpoint} />
          <DeferredHomeInsightsRecentLessonsDetails />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {recentCheckpoints.map((item) => (
            <LessonCheckpointCard
              key={item.componentId}
              item={item}
            />
          ))}
          <OutlineLink
            href={LESSONS_ROUTE}
            hint={copy({
              de: 'Öffnet den vollständigen Lektionskatalog.',
              en: 'Opens the full lessons catalog.',
              pl: 'Otwiera pełny katalog lekcji.',
            })}
            label={copy({
              de: 'Alle Lektionen öffnen',
              en: 'Open all lessons',
              pl: 'Otwórz wszystkie lekcje',
            })}
          />
        </View>
      )}
    </SectionCard>
  );
}

function LiveHomeSecondaryRecentLessonsSection(): React.JSX.Element {
  const lessonCheckpoints = useKangurMobileHomeLessonCheckpoints();

  return (
    <HomeSecondaryRecentLessonsSection
      recentCheckpoints={lessonCheckpoints.recentCheckpoints}
    />
  );
}

function DeferredHomeInsightsBadgesAndPlanCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Weitere Fortschrittskarten',
        en: 'More progress cards',
        pl: 'Kolejne karty postępu',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten gespeicherte Abzeichen und den Aktionsplan fur den nachsten Startschritt vor.',
          en: 'Preparing saved badges and the action plan for the next home step.',
          pl: 'Przygotowujemy zapisane odznaki i plan działań na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsPlanCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten den Aktionsplan fur den nachsten Startschritt vor.',
          en: 'Preparing the action plan for the next home step.',
          pl: 'Przygotowujemy plan działań na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsPlanDetailsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die nächsten Aufgaben und Aktionslinks fur den nachsten Startschritt vor.',
          en: 'Preparing the next tasks and action links for the next home step.',
          pl: 'Przygotowujemy kolejne zadania i linki działań na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsPlanAssignmentsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die Aufgabenkarte und den Tagesplan-Link fur den nachsten Startschritt vor.',
          en: 'Preparing the assignment card and daily-plan link for the next home step.',
          pl: 'Przygotowujemy kartę zadań i link do planu dnia na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsBadgesCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Abzeichen-Zentrale',
        en: 'Badge hub',
        pl: 'Centrum odznak',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die gespeicherte Abzeichenübersicht fur den nachsten Startschritt vor.',
          en: 'Preparing the saved badge summary for the next home step.',
          pl: 'Przygotowujemy zapisane podsumowanie odznak na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsBadgesDetailsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Abzeichen-Zentrale',
        en: 'Badge hub',
        pl: 'Centrum odznak',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die letzten Freischaltungen und Abzeichen-Links fur den nachsten Startschritt vor.',
          en: 'Preparing recent unlocks and badge links for the next home step.',
          pl: 'Przygotowujemy ostatnie odblokowania i linki do odznak na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function DeferredHomeInsightsResultsHubCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Ergebniszentrale',
        en: 'Results hub',
        pl: 'Centrum wyników',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die gespeicherte Ergebnisübersicht fur den nachsten Startschritt vor.',
          en: 'Preparing the saved results summary for the next home step.',
          pl: 'Przygotowujemy zapisane podsumowanie wyników na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

function HomeSecondaryInsightsBadgesSectionGroup(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const homeBadges = useKangurMobileHomeBadges();

  return (
    <>
      <SectionCard
        title={copy({
          de: 'Abzeichen-Zentrale',
          en: 'Badge hub',
          pl: 'Centrum odznak',
        })}
      >
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Die letzten Freischaltungen und der direkte Weg zum vollständigen Abzeichenüberblick bleiben hier griffbereit.',
            en: 'The latest unlocks and the direct path to the full badge overview stay close here.',
            pl: 'Ostatnie odblokowania i bezpośrednie przejście do pełnego przeglądu odznak są tutaj zawsze pod ręką.',
          })}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SummaryChip
            accent='blue'
            label={copy({
              de: `Freigeschaltet ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
              en: `Unlocked ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
              pl: `Odblokowane ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
            })}
          />
          <SummaryChip
            accent='amber'
            label={copy({
              de: `Offen ${homeBadges.remainingBadges}`,
              en: `Remaining ${homeBadges.remainingBadges}`,
              pl: `Do zdobycia ${homeBadges.remainingBadges}`,
            })}
          />
        </View>
        {homeBadges.recentBadges.length === 0 ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
              en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
              pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
            })}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
              {copy({
                de: 'Zuletzt freigeschaltet',
                en: 'Recently unlocked',
                pl: 'Ostatnio odblokowane',
              })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {homeBadges.recentBadges.map((item) => (
                <BadgeChip key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}
        <OutlineLink
          href={PROFILE_ROUTE}
          hint={copy({
            de: 'Öffnet das Profil mit der vollständigen Abzeichenübersicht.',
            en: 'Opens the profile with the full badge overview.',
            pl: 'Otwiera profil z pełnym przeglądem odznak.',
          })}
          label={copy({
            de: 'Profil und Abzeichen öffnen',
            en: 'Open profile and badges',
            pl: 'Otwórz profil i odznaki',
          })}
        />
      </SectionCard>
    </>
  );
}

function HomeSecondaryInsightsPlanSection(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const homeAssignments = useKangurMobileHomeAssignments();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Verwandle Fortschritt und gespeicherte Lektionen direkt in die nächsten Schritte.',
          en: 'Turn progress and saved lessons directly into the next steps.',
          pl: 'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
        })}
      </Text>
      {homeAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Aufgaben. Öffne eine Lektion oder schließe ein Training ab, um sie zu erzeugen.',
            en: 'There are no tasks yet. Open a lesson or finish practice to generate them.',
            pl: 'Nie ma jeszcze zadań. Otwórz lekcję albo ukończ trening, aby je wygenerować.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {homeAssignments.assignmentItems.map((item) => (
            <AssignmentCard
              key={item.assignment.id}
              item={item}
            />
          ))}
          <OutlineLink
            href={PLAN_ROUTE}
            hint={copy({
              de: 'Öffnet den vollständigen Tagesplan mit der erweiterten Aufgabenliste.',
              en: 'Opens the full daily plan with the extended task list.',
              pl: 'Otwiera pełny plan dnia z rozszerzoną listą zadań.',
            })}
            label={copy({
              de: 'Vollen Tagesplan öffnen',
              en: 'Open full daily plan',
              pl: 'Otwórz pełny plan dnia',
            })}
          />
        </View>
      )}
    </SectionCard>
  );
}

function HomeSecondaryInsightsBadgesAndPlanSectionGroup(): React.JSX.Element {
  const [
    areDeferredHomeInsightBadgesReady,
    areDeferredHomeInsightBadgesDetailsReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_BADGES_PANEL_SEQUENCE, false);
  const [
    areDeferredHomeInsightPlanReady,
    areDeferredHomeInsightPlanDetailsReady,
    areDeferredHomeInsightPlanAssignmentsReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_PLAN_PANEL_SEQUENCE, false);

  return (
    <>
      {!areDeferredHomeInsightBadgesReady ? (
        <DeferredHomeInsightsBadgesCard />
      ) : !areDeferredHomeInsightBadgesDetailsReady ? (
        <DeferredHomeInsightsBadgesDetailsCard />
      ) : (
        <HomeSecondaryInsightsBadgesSectionGroup />
      )}
      {!areDeferredHomeInsightPlanReady ? (
        <DeferredHomeInsightsPlanCard />
      ) : !areDeferredHomeInsightPlanDetailsReady ? (
        <DeferredHomeInsightsPlanDetailsCard />
      ) : !areDeferredHomeInsightPlanAssignmentsReady ? (
        <DeferredHomeInsightsPlanAssignmentsCard />
      ) : (
        <HomeSecondaryInsightsPlanSection />
      )}
    </>
  );
}

function HomeSecondaryInsightsExtrasSectionGroup({
  recentResults,
}: HomeRecentResultsSectionProps): React.JSX.Element {
  const [
    areDeferredHomeInsightBadgesAndPlanReady,
    areDeferredHomeInsightResultsSummaryReady,
  ] = useHomeScreenDeferredPanelGroup(HOME_INSIGHTS_EXTRAS_PANEL_GROUP, false);

  return (
    <>
      {!areDeferredHomeInsightBadgesAndPlanReady ? (
        <DeferredHomeInsightsBadgesAndPlanCard />
      ) : (
        <HomeSecondaryInsightsBadgesAndPlanSectionGroup />
      )}
      {!areDeferredHomeInsightResultsSummaryReady ? (
        <DeferredHomeInsightsResultsHubCard />
      ) : (
        <HomeResultsHubSection recentResults={recentResults} />
      )}
    </>
  );
}

function HomeResultsHubSection({
  recentResults,
}: HomeRecentResultsSectionProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const [hasRequestedDetailedResults, setHasRequestedDetailedResults] = useState(false);
  const [
    areDeferredHomeResultsHubSummaryReady,
    areDeferredHomeResultsHubActionsReady,
    areDeferredHomeResultsHubCardsReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_RESULTS_HUB_PANEL_SEQUENCE, false);
  const latestResult = recentResults.results[0] ?? null;
  const shouldRenderDetailedResults =
    (areDeferredHomeResultsHubSummaryReady &&
      areDeferredHomeResultsHubActionsReady &&
      areDeferredHomeResultsHubCardsReady) ||
    hasRequestedDetailedResults;

  return (
    <SectionCard
      title={copy({
        de: 'Ergebniszentrale',
        en: 'Results hub',
        pl: 'Centrum wyników',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training oder in den vollständigen Verlauf springen kannst.',
          en: 'The latest results stay close here so you can jump straight back into practice or the full history.',
          pl: 'Ostatnie wyniki są tutaj pod ręką, aby od razu wrócić do treningu albo pełnej historii.',
        })}
      </Text>
      {recentResults.isRestoringAuth || recentResults.isLoading ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Die Ergebnisse des Schulers werden geladen.',
            en: 'Loading learner results.',
            pl: 'Pobieramy wyniki ucznia.',
          })}
        </Text>
      ) : recentResults.isDeferred && recentResults.results.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Wir bereiten die aktualisierte Ergebnisübersicht für den nächsten Startschritt vor.',
            en: 'Preparing the refreshed results summary for the next home step.',
            pl: 'Przygotowujemy odświeżone podsumowanie wyników na kolejny etap ekranu startowego.',
          })}
        </Text>
      ) : recentResults.error ? (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {recentResults.error}
        </Text>
      ) : recentResults.results.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt hier noch keine Ergebnisse.',
            en: 'There are no results here yet.',
            pl: 'Nie ma tu jeszcze wyników.',
          })}
        </Text>
      ) : !areDeferredHomeResultsHubSummaryReady ? (
        <DeferredResultsHubSummaryPlaceholder />
      ) : !shouldRenderDetailedResults ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
            {latestResult
              ? copy({
                  de: `Letztes Ergebnis ${latestResult.correct_answers}/${latestResult.total_questions}`,
                  en: `Latest score ${latestResult.correct_answers}/${latestResult.total_questions}`,
                  pl: `Ostatni wynik ${latestResult.correct_answers}/${latestResult.total_questions}`,
                })
              : copy({
                  de: `Ergebnisse ${recentResults.results.length}`,
                  en: `Results ${recentResults.results.length}`,
                  pl: `Wyniki ${recentResults.results.length}`,
                })}
          </Text>
          {!areDeferredHomeResultsHubActionsReady ? (
            <DeferredResultsHubActionsPlaceholder />
          ) : (
            <>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Wir bereiten die Schnellaktionen fur die letzten Ergebnisse fur den nachsten Startschritt vor. Du kannst sie sofort öffnen, wenn du möchtest.',
                  en: 'Preparing the recent result quick actions for the next home step. You can open them immediately if you want.',
                  pl: 'Przygotowujemy szczegóły ostatnich wyników na kolejny etap ekranu startowego. Możesz otworzyć je od razu, jeśli chcesz.',
                })}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <PrimaryButton
                  hint={copy({
                    de: 'Zeigt die letzten Ergebnisse mit Trainings- und Verlaufsaktionen an.',
                    en: 'Shows the recent results with practice and history actions.',
                    pl: 'Pokazuje ostatnie wyniki z akcjami treningu i historii.',
                  })}
                  label={copy({
                    de: 'Letzte Ergebnisse zeigen',
                    en: 'Show recent results',
                    pl: 'Pokaż ostatnie wyniki',
                  })}
                  onPress={() => {
                    setHasRequestedDetailedResults(true);
                  }}
                />
                <OutlineLink
                  fullWidth={false}
                  href={RESULTS_ROUTE}
                  hint={copy({
                    de: 'Öffnet den vollständigen Ergebnisverlauf.',
                    en: 'Opens the full results history.',
                    pl: 'Otwiera pełną historię wyników.',
                  })}
                  label={copy({
                    de: 'Vollständigen Verlauf öffnen',
                    en: 'Open full history',
                    pl: 'Otwórz pełną historię',
                  })}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {recentResults.results.map((result) => (
            <View
              key={result.id}
              style={{
                backgroundColor: '#f8fafc',
                borderColor: '#e2e8f0',
                borderRadius: 20,
                borderWidth: 1,
                gap: 8,
                padding: 14,
              }}
            >
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                {formatKangurMobileScoreOperation(result.operation, locale)}
              </Text>
              <Text style={{ color: '#475569' }}>
                {copy({
                  de: `${result.correct_answers}/${result.total_questions} richtig`,
                  en: `${result.correct_answers}/${result.total_questions} correct`,
                  pl: `${result.correct_answers}/${result.total_questions} poprawnych`,
                })}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <OutlineLink
                  href={createKangurPracticeHref(result.operation)}
                  hint={copy({
                    de: `Startet erneut das Training für den Modus ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                    en: `Starts practice again for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
                    pl: `Uruchamia ponowny trening dla trybu ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                  })}
                  label={`${copy({
                    de: 'Erneut trainieren',
                    en: 'Train again',
                    pl: 'Trenuj ponownie',
                  })}: ${formatKangurMobileScoreOperation(result.operation, locale)}`}
                />
                <OutlineLink
                  href={createKangurResultsHref({ operation: result.operation })}
                  hint={copy({
                    de: `Öffnet den Ergebnisverlauf für den Modus ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                    en: `Opens result history for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
                    pl: `Otwiera historię wyników dla trybu ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                  })}
                  label={`${copy({
                    de: 'Modusverlauf',
                    en: 'Mode history',
                    pl: 'Historia trybu',
                  })}: ${formatKangurMobileScoreOperation(result.operation, locale)}`}
                />
              </View>
            </View>
          ))}
          <OutlineLink
            href={RESULTS_ROUTE}
            hint={copy({
              de: 'Öffnet den vollständigen Ergebnisverlauf.',
              en: 'Opens the full results history.',
              pl: 'Otwiera pełną historię wyników.',
            })}
            label={copy({
              de: 'Vollständigen Verlauf öffnen',
              en: 'Open full history',
              pl: 'Otwórz pełną historię',
            })}
          />
        </View>
      )}
    </SectionCard>
  );
}

function HomeSecondaryInsightsSectionGroup({
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
  recentResults,
}: HomeSecondaryInsightsSectionGroupProps): React.JSX.Element {
  const [areDeferredHomeInsightLessonsReady, areDeferredHomeInsightExtrasReady] =
    useHomeScreenDeferredPanelGroup(HOME_INSIGHTS_SECTION_PANEL_GROUP, false);
  const shouldRenderLiveHomeLessonInsights =
    isLiveHomeProgressReady && areDeferredHomeInsightLessonsReady;

  return (
    <>
      {shouldRenderLiveHomeLessonInsights ? (
        <HomeSecondaryLessonPlanSection />
      ) : (
        <DeferredHomeInsightsLessonPlanCard />
      )}

      {shouldRenderLiveHomeLessonInsights ? (
        <LiveHomeSecondaryRecentLessonsSection />
      ) : (
        <HomeSecondaryRecentLessonsSection
          recentCheckpoints={initialRecentLessonCheckpoints}
        />
      )}

      {!areDeferredHomeInsightExtrasReady ? (
        <DeferredHomeInsightsExtrasCard />
      ) : (
        <HomeSecondaryInsightsExtrasSectionGroup recentResults={recentResults} />
      )}
    </>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const isPreparingHomeView = useHomeScreenBootState('home');

  if (isPreparingHomeView) {
    return <HomeLoadingShell />;
  }

  return <HomeScreenReady />;
}

function HomeScreenReady(): React.JSX.Element {
  const { locale } = useKangurMobileI18n();
  const { progressStore, storage } = useKangurMobileRuntime();
  const [initialProgress] = useState(createDefaultKangurProgressState);
  const areDeferredHomeProgressReady = useHomeScreenDeferredPanels(
    'home:progress',
    false,
  );
  const homeLessonCheckpointIdentity = useMemo(
    () => resolveKangurMobileHomeLessonCheckpointIdentity(storage),
    [storage],
  );
  const initialRecentLessonCheckpoints = useMemo(
    () =>
      resolvePersistedKangurMobileHomeLessonCheckpoints({
        learnerIdentity: homeLessonCheckpointIdentity,
        limit: 2,
        locale,
        storage,
      }) ?? [],
    [homeLessonCheckpointIdentity, locale, storage],
  );
  const initialLatestLessonCheckpoint = initialRecentLessonCheckpoints[0] ?? null;

  useEffect(() => {
    if (!areDeferredHomeProgressReady) {
      return;
    }

    persistKangurMobileHomeLessonCheckpoints({
      learnerIdentity: homeLessonCheckpointIdentity,
      snapshot: buildPersistedKangurMobileHomeLessonCheckpointSnapshot({
        progress: progressStore.loadProgress(),
      }),
      storage,
    });
  }, [
    areDeferredHomeProgressReady,
    homeLessonCheckpointIdentity,
    progressStore,
    storage,
  ]);

  return (
    <KangurMobileHomeProgressSnapshotProvider
      progress={initialProgress}
      subscribeToProgressStore={areDeferredHomeProgressReady}
    >
      <HomeScreenContent
        initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
        initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
        isLiveHomeProgressReady={areDeferredHomeProgressReady}
      />
    </KangurMobileHomeProgressSnapshotProvider>
  );
}

type HomeRecentResultsViewModel = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
  results: KangurScore[];
};

type HomeTrainingFocusViewModel = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  recentResults: KangurScore[];
  refresh: () => Promise<void>;
  strongestLessonFocus: string | null;
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestLessonFocus: string | null;
  weakestOperation: KangurMobileOperationPerformance | null;
};

type HomeScoreViewModel = {
  homeDebugProof: ReturnType<typeof buildKangurHomeDebugProofViewModel>;
  homeHeroFocusHref: Href;
  homeHeroFocusLabel: string;
  homeHeroRecentResult: KangurScore | null;
  recentResults: HomeRecentResultsViewModel;
  trainingFocus: HomeTrainingFocusViewModel;
};

type HomeScoreStateProps = {
  areDeferredHomePanelsReady: boolean;
  children: (viewModel: HomeScoreViewModel) => React.ReactNode;
  debugProofOperation: string | null;
};

type HomeHeroLatestLessonCheckpointViewModel = {
  homeHeroRecentCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  homeHeroRecentCheckpointCount: number;
};

type HomeHeroLatestLessonCheckpointStateProps = {
  children: (viewModel: HomeHeroLatestLessonCheckpointViewModel) => React.ReactNode;
  isEnabled: boolean;
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  isLiveProgressReady: boolean;
};

const noopRefreshHomeScoreViewModel = async (): Promise<void> => {};

function LiveHomeHeroLatestLessonCheckpointState({
  children,
}: Pick<HomeHeroLatestLessonCheckpointStateProps, 'children'>): React.JSX.Element {
  const latestLessonCheckpoint = useKangurMobileHomeLessonCheckpoints({
    limit: 1,
  });

  return (
    <>
      {children({
        homeHeroRecentCheckpoint: latestLessonCheckpoint.recentCheckpoints[0] ?? null,
        homeHeroRecentCheckpointCount: latestLessonCheckpoint.recentCheckpoints.length,
      })}
    </>
  );
}

function HomeHeroLatestLessonCheckpointState({
  children,
  isEnabled,
  initialLatestLessonCheckpoint,
  isLiveProgressReady,
}: HomeHeroLatestLessonCheckpointStateProps): React.JSX.Element {
  if (!isEnabled) {
    return (
      <>
        {children({
          homeHeroRecentCheckpoint: null,
          homeHeroRecentCheckpointCount: 0,
        })}
      </>
    );
  }

  if (!isLiveProgressReady) {
    return (
      <>
        {children({
          homeHeroRecentCheckpoint: initialLatestLessonCheckpoint,
          homeHeroRecentCheckpointCount: initialLatestLessonCheckpoint ? 1 : 0,
        })}
      </>
    );
  }

  return <LiveHomeHeroLatestLessonCheckpointState>{children}</LiveHomeHeroLatestLessonCheckpointState>;
}

function LiveHomeDebugProofOperationState({
  children,
}: {
  children: (debugProofOperation: string | null) => React.ReactNode;
}): React.JSX.Element {
  const params = useLocalSearchParams<{
    debugProofOperation?: string | string[];
  }>();

  return <>{children(resolveKangurHomeDebugProofOperation(params.debugProofOperation))}</>;
}

function HomeDebugProofOperationState({
  children,
}: {
  children: (debugProofOperation: string | null) => React.ReactNode;
}): React.JSX.Element {
  if (!__DEV__) {
    return <>{children(null)}</>;
  }

  return <LiveHomeDebugProofOperationState>{children}</LiveHomeDebugProofOperationState>;
}

const createHomeDebugProofViewModel = (input: {
  isEnabled: boolean;
  isLoading: boolean;
  locale: 'pl' | 'en' | 'de';
  operation: string | null;
  recentResults: KangurScore[];
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestOperation: KangurMobileOperationPerformance | null;
}) =>
  input.operation
    ? buildKangurHomeDebugProofViewModel(input)
    : null;

function DeferredAuthenticatedHomeScoreState({
  areDeferredHomePanelsReady,
  children,
  debugProofOperation,
}: HomeScoreStateProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const recentResults = {
    error: null,
    isEnabled: false,
    isLoading: false,
    isRestoringAuth: false,
    refresh: noopRefreshHomeScoreViewModel,
    results: [],
  } satisfies HomeRecentResultsViewModel;
  const trainingFocus = {
    error: null,
    isEnabled: false,
    isLoading: false,
    isRestoringAuth: false,
    recentResults: [],
    refresh: noopRefreshHomeScoreViewModel,
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  } satisfies HomeTrainingFocusViewModel;
  const homeDebugProof = createHomeDebugProofViewModel({
    isEnabled: false,
    isLoading: !areDeferredHomePanelsReady,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: null,
    weakestOperation: null,
  });

  return (
    <>
      {children({
        homeDebugProof,
        homeHeroFocusHref: PRACTICE_ROUTE,
        homeHeroFocusLabel: copy({
          de: 'Gemischtes Training',
          en: 'Mixed practice',
          pl: 'Trening mieszany',
        }),
        homeHeroRecentResult: null,
        recentResults,
        trainingFocus,
      })}
    </>
  );
}

function LiveAuthenticatedHomeScoreState({
  areDeferredHomePanelsReady,
  areDeferredHomeScoreRefreshReady,
  children,
  debugProofOperation,
}: HomeScoreStateProps & {
  areDeferredHomeScoreRefreshReady: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const cachedRecentResults = useKangurMobileRecentResults({
    enabled: false,
  });
  const trainingFocus = useKangurMobileTrainingFocus({
    enabled: areDeferredHomeScoreRefreshReady,
    recentResultsLimit: 3,
  });
  const hasResolvedHomeScoreInsights =
    trainingFocus.isEnabled &&
    !trainingFocus.isLoading &&
    !trainingFocus.isRestoringAuth &&
    !trainingFocus.error;
  const recentResults = {
    error: trainingFocus.isEnabled ? trainingFocus.error : cachedRecentResults.error,
    isEnabled: trainingFocus.isEnabled,
    isLoading: trainingFocus.isEnabled
      ? trainingFocus.isLoading
      : cachedRecentResults.isLoading,
    isRestoringAuth: trainingFocus.isEnabled
      ? trainingFocus.isRestoringAuth
      : cachedRecentResults.isRestoringAuth,
    refresh: trainingFocus.isEnabled ? trainingFocus.refresh : cachedRecentResults.refresh,
    results: hasResolvedHomeScoreInsights
      ? trainingFocus.recentResults
      : cachedRecentResults.results,
  };
  const homeDebugProof = createHomeDebugProofViewModel({
    isEnabled:
      recentResults.isEnabled &&
      (!areDeferredHomePanelsReady || trainingFocus.isEnabled),
    isLoading:
      recentResults.isLoading ||
      !areDeferredHomePanelsReady ||
      trainingFocus.isLoading,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: trainingFocus.strongestOperation,
    weakestOperation: trainingFocus.weakestOperation,
  });

  return (
    <>
      {children({
        homeDebugProof,
        homeHeroFocusHref: trainingFocus.weakestOperation
          ? createKangurPracticeHref(trainingFocus.weakestOperation.operation)
          : PRACTICE_ROUTE,
        homeHeroFocusLabel: trainingFocus.weakestOperation
          ? formatKangurMobileScoreOperation(
              trainingFocus.weakestOperation.operation,
              locale,
            )
          : copy({
              de: 'Gemischtes Training',
              en: 'Mixed practice',
              pl: 'Trening mieszany',
            }),
        homeHeroRecentResult: recentResults.results[0] ?? null,
        recentResults,
        trainingFocus,
      })}
    </>
  );
}

function AnonymousHomeScoreState({
  areDeferredHomePanelsReady,
  children,
  debugProofOperation,
  isRestoringAuth,
}: HomeScoreStateProps & {
  isRestoringAuth: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const recentResults = {
    error: null,
    isEnabled: false,
    isLoading: isRestoringAuth,
    isRestoringAuth,
    refresh: noopRefreshHomeScoreViewModel,
    results: [],
  } satisfies HomeRecentResultsViewModel;
  const trainingFocus = {
    error: null,
    isEnabled: false,
    isLoading: isRestoringAuth,
    isRestoringAuth,
    recentResults: [],
    refresh: noopRefreshHomeScoreViewModel,
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  } satisfies HomeTrainingFocusViewModel;
  const homeDebugProof = createHomeDebugProofViewModel({
    isEnabled: false,
    isLoading:
      recentResults.isLoading ||
      !areDeferredHomePanelsReady ||
      trainingFocus.isLoading,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: null,
    weakestOperation: null,
  });

  return (
    <>
      {children({
        homeDebugProof,
        homeHeroFocusHref: PRACTICE_ROUTE,
        homeHeroFocusLabel: copy({
          de: 'Gemischtes Training',
          en: 'Mixed practice',
          pl: 'Trening mieszany',
        }),
        homeHeroRecentResult: null,
        recentResults,
        trainingFocus,
      })}
    </>
  );
}

function HomeLearnerCredentialsSignInSection({
  isDeferredReady,
  onSignIn,
}: {
  isDeferredReady: boolean;
  onSignIn: (loginName: string, password: string) => Promise<void>;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const [hasRequestedOpen, setHasRequestedOpen] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');

  if (!isDeferredReady && !hasRequestedOpen) {
    return (
      <DeferredHomeAccountSignInForm
        onOpen={() => {
          setHasRequestedOpen(true);
        }}
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <LabeledTextField
        autoCapitalize='none'
        hint={copy({
          de: 'Gib den Schüler-Login ein.',
          en: 'Enter the learner login.',
          pl: 'Wpisz login ucznia.',
        })}
        label={copy({
          de: 'Schuler-Login',
          en: 'Learner login',
          pl: 'Login ucznia',
        })}
        onChangeText={setLoginName}
        placeholder={copy({
          de: 'Schuler-Login',
          en: 'Learner login',
          pl: 'Login ucznia',
        })}
        textContentType='username'
        value={loginName}
      />
      <LabeledTextField
        autoCapitalize='none'
        hint={copy({
          de: 'Gib das Schülerpasswort ein.',
          en: 'Enter the learner password.',
          pl: 'Wpisz hasło ucznia.',
        })}
        label={copy({
          de: 'Passwort',
          en: 'Password',
          pl: 'Hasło',
        })}
        onChangeText={setPassword}
        placeholder={copy({
          de: 'Passwort',
          en: 'Password',
          pl: 'Hasło',
        })}
        secureTextEntry
        textContentType='password'
        value={password}
      />
      <PrimaryButton
        hint={copy({
          de: 'Meldet mit den eingegebenen Daten an.',
          en: 'Signs in with the entered credentials.',
          pl: 'Loguje przy użyciu wpisanych danych.',
        })}
        label={copy({
          de: 'Anmelden',
          en: 'Sign in',
          pl: 'Zaloguj',
        })}
        onPress={async () => {
          await onSignIn(loginName, password);
        }}
      />
    </View>
  );
}

function HomeScreenContent({
  initialLatestLessonCheckpoint,
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
}: {
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const { apiBaseUrl, apiBaseUrlSource } = useKangurMobileRuntime();
  const {
    authError,
    authMode,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    signIn,
    signInWithLearnerCredentials,
    signOut,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();
  const [
    areDeferredHomePanelsReady,
    areDeferredHomeDuelSecondaryReady,
    areDeferredHomeDuelInvitesReady,
    areDeferredHomeDuelAdvancedReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_DUEL_PANEL_SEQUENCE, false);
  const [areDeferredHomeInsightsReady, areDeferredHomeScoreRefreshReady] =
    useHomeScreenDeferredPanelSequence(
      HOME_INSIGHT_SCORE_REFRESH_SEQUENCE,
      !areDeferredHomePanelsReady,
    );
  const [areDeferredHomeHeroScoresReady, areDeferredHomeTrainingFocusDetailsReady] =
    useHomeScreenDeferredPanelGroup(
      HOME_SCORE_DETAILS_PANEL_GROUP,
      !areDeferredHomePanelsReady,
    );
  const [
    areDeferredHomeHeroIntroReady,
    areDeferredHomeHeroDetailsReady,
    areDeferredHomeAccountSummaryReady,
  ] = useHomeScreenDeferredPanelGroup(HOME_PRIMARY_SURFACE_PANEL_GROUP, false);
  const [areDeferredHomeAccountDetailsReady, areDeferredHomeAccountSignInReady] =
    useHomeScreenDeferredPanelGroup(
      HOME_ACCOUNT_DETAILS_PANEL_GROUP,
      !areDeferredHomeAccountSummaryReady,
    );
  const [
    areDeferredHomeNavigationSecondaryReady,
    areDeferredHomeNavigationExtendedReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_NAVIGATION_PANEL_SEQUENCE, false);
  const isRestoringLearnerSession =
    isLoadingAuth && session.status !== 'authenticated';
  const shouldShowLearnerCredentialsForm =
    supportsLearnerCredentials &&
    !isRestoringLearnerSession &&
    session.status !== 'authenticated';
  const authBoundary = areDeferredHomeAccountSummaryReady
    ? getKangurHomeAuthBoundaryViewModel({
        authError,
        developerAutoSignInEnabled,
        hasAttemptedDeveloperAutoSignIn,
        isLoadingAuth,
        locale,
        session,
        supportsLearnerCredentials,
      })
    : null;
  const homeHeroLearnerName =
    session.user?.activeLearner?.displayName?.trim() || session.user?.full_name?.trim() || null;
  const canOpenParentDashboard =
    session.status === 'authenticated' && Boolean(session.user?.canManageLearners);
  const activeDuelLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
  const shouldRenderCombinedHomeQuickAccessPlaceholder =
    !areDeferredHomeAccountSummaryReady && !areDeferredHomeNavigationSecondaryReady;
  const shouldRenderCombinedHomeStartupPlaceholder =
    shouldRenderCombinedHomeQuickAccessPlaceholder && !areDeferredHomePanelsReady;
  const shouldRenderCombinedHomeHeroPlaceholder =
    !areDeferredHomeHeroIntroReady && !areDeferredHomeHeroDetailsReady;
  const shouldRenderCombinedHomePrimaryStartupPlaceholder =
    shouldRenderCombinedHomeStartupPlaceholder && shouldRenderCombinedHomeHeroPlaceholder;

  const renderHomeScreenContent = ({
    homeDebugProof,
    homeHeroFocusHref,
    homeHeroFocusLabel,
    homeHeroRecentResult,
    recentResults,
    trainingFocus,
  }: HomeScoreViewModel): React.JSX.Element => (
    <HomeHeroLatestLessonCheckpointState
      isEnabled={areDeferredHomeHeroDetailsReady}
      initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
      isLiveProgressReady={isLiveHomeProgressReady}
    >
      {({ homeHeroRecentCheckpoint, homeHeroRecentCheckpointCount }) => (
        <SafeAreaView style={{ backgroundColor: '#fffaf2', flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{
              gap: 16,
              paddingHorizontal: 24,
              paddingVertical: 28,
            }}
          >
        <View style={{ gap: 10 }}>
          <Text
            accessibilityRole='header'
            style={{ color: '#0f172a', fontSize: 32, fontWeight: '800' }}
          >
            {copy({
              de: 'Kangur mobil',
              en: 'Kangur mobile',
              pl: 'Kangur mobilnie',
            })}
          </Text>
          {shouldRenderCombinedHomePrimaryStartupPlaceholder ? null : shouldRenderCombinedHomeHeroPlaceholder ? (
            <DeferredHomeHeroOverview
              homeHeroLearnerName={homeHeroLearnerName}
              isRestoringAuth={isLoadingAuth && session.status !== 'authenticated'}
            />
          ) : !areDeferredHomeHeroIntroReady ? (
            <DeferredHomeHeroIntro
              homeHeroLearnerName={homeHeroLearnerName}
              isRestoringAuth={isLoadingAuth && session.status !== 'authenticated'}
            />
          ) : (
            <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
              {isLoadingAuth && session.status !== 'authenticated'
                ? copy({
                    de: 'Wir stellen gerade die Anmeldung, letzte Ergebnisse und Trainingshinweise wieder her.',
                    en: 'We are restoring sign-in, recent results, and training cues.',
                    pl: 'Przywracamy teraz logowanie, ostatnie wyniki i wskazówki treningowe.',
                  })
                : session.status === 'authenticated' && homeHeroLearnerName
                  ? copy({
                      de: `Willkommen, ${homeHeroLearnerName}. Starte mit dem Trainingsfokus, kehre zur letzten Lektion zurück oder öffne direkt den Tagesplan.`,
                      en: `Welcome back, ${homeHeroLearnerName}. Start with the training focus, return to the latest lesson, or jump straight into the daily plan.`,
                      pl: `Witaj ponownie, ${homeHeroLearnerName}. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.`,
                    })
                  : copy({
                      de: 'Von hier aus kannst du Lektionen, Training, Ergebnisse und Duelle durchsuchen. Nach der Anmeldung siehst du hier auch Ergebnisse und den Tagesplan.',
                      en: 'From here you can browse lessons, practice, results, and duels. After sign-in, you will also see results and the daily plan here.',
                      pl: 'Stąd możesz przeglądać lekcje, trening, wyniki i pojedynki. Po zalogowaniu zobaczysz tu też wyniki oraz plan dnia.',
                    })}
            </Text>
          )}

          {shouldRenderCombinedHomeHeroPlaceholder ? null : !areDeferredHomeHeroDetailsReady ? (
            <DeferredHomeHeroDetails />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#c7d2fe',
                  backgroundColor: '#eef2ff',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: `Ergebnisse ${recentResults.results.length}`,
                    en: `Results ${recentResults.results.length}`,
                    pl: `Wyniki ${recentResults.results.length}`,
                  })}
                </Text>
              </View>
              {homeHeroRecentResult ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#a7f3d0',
                    backgroundColor: '#ecfdf5',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>
                    {copy({
                      de: `Letztes Ergebnis ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                      en: `Latest score ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                      pl: `Ostatni wynik ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                    })}
                  </Text>
                </View>
              ) : null}
              <View
                style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#fde68a',
                  backgroundColor: '#fffbeb',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
                  {homeHeroRecentCheckpoint
                    ? copy({
                        de: `Letzte Lektion ${homeHeroRecentCheckpoint.title}`,
                        en: `Latest lesson ${homeHeroRecentCheckpoint.title}`,
                        pl: `Ostatnia lekcja ${homeHeroRecentCheckpoint.title}`,
                      })
                    : copy({
                        de: `Checkpoints ${homeHeroRecentCheckpointCount}`,
                        en: `Checkpoints ${homeHeroRecentCheckpointCount}`,
                        pl: `Checkpointy ${homeHeroRecentCheckpointCount}`,
                      })}
                </Text>
              </View>
            </View>
          )}

          <View style={{ gap: 10 }}>
            <OutlineLink
              href={homeHeroFocusHref}
              label={copy({
                de: `Trainingsfokus: ${homeHeroFocusLabel}`,
                en: `Training focus: ${homeHeroFocusLabel}`,
                pl: `Fokus treningowy: ${homeHeroFocusLabel}`,
              })}
            />
            {areDeferredHomeHeroDetailsReady && homeHeroRecentCheckpoint ? (
              <OutlineLink
                href={homeHeroRecentCheckpoint.lessonHref}
                label={copy({
                  de: `Letzte Lektion: ${homeHeroRecentCheckpoint.title}`,
                  en: `Latest lesson: ${homeHeroRecentCheckpoint.title}`,
                  pl: `Ostatnia lekcja: ${homeHeroRecentCheckpoint.title}`,
                })}
              />
            ) : null}
            {areDeferredHomeHeroDetailsReady ? (
              <OutlineLink
                href={PLAN_ROUTE}
                label={copy({
                  de: 'Tagesplan jetzt',
                  en: 'Daily plan now',
                  pl: 'Plan dnia teraz',
                })}
              />
            ) : null}
          </View>
        </View>

        {__DEV__ && homeDebugProof ? (
          <SectionCard
            title={copy({
              de: 'Entwickler-Prüfung für Startdaten',
              en: 'Developer home checks',
              pl: 'Deweloperskie sprawdzenie danych startu',
            })}
          >
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Modus',
                en: 'Mode',
                pl: 'Tryb',
              })}
              : {homeDebugProof.operationLabel}
            </Text>
            <View style={{ gap: 10 }}>
              {homeDebugProof.checks.map((check) => (
                <View
                  key={check.label}
                  style={{
                    backgroundColor:
                      check.status === 'ready'
                        ? '#ecfdf5'
                        : check.status === 'info'
                          ? '#eff6ff'
                          : '#fff7ed',
                    borderColor:
                      check.status === 'ready'
                        ? '#a7f3d0'
                        : check.status === 'info'
                          ? '#bfdbfe'
                          : '#fed7aa',
                    borderRadius: 18,
                    borderWidth: 1,
                    gap: 4,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                    {check.label}:{' '}
                    {check.status === 'ready'
                      ? copy({
                          de: 'bereit',
                          en: 'ready',
                          pl: 'gotowe',
                        })
                      : check.status === 'info'
                        ? copy({
                            de: 'läuft',
                            en: 'in progress',
                            pl: 'w toku',
                          })
                        : copy({
                            de: 'fehlt',
                            en: 'missing',
                            pl: 'brak',
                          })}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {check.detail}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        {shouldRenderCombinedHomePrimaryStartupPlaceholder ? (
          <DeferredHomePrimaryStartupCard />
        ) : shouldRenderCombinedHomeStartupPlaceholder ? (
          <DeferredHomeStartupSectionsCard />
        ) : shouldRenderCombinedHomeQuickAccessPlaceholder ? (
          <DeferredHomeQuickAccessCard />
        ) : (
          <>
            <SectionCard
              title={copy({
                de: 'Konto und Verbindung',
                en: 'Account and connection',
                pl: 'Konto i połączenie',
              })}
            >
              {!areDeferredHomeAccountSummaryReady ? (
                <DeferredHomeAccountSummary />
              ) : (
                <>
                  <Text accessibilityLiveRegion='polite' style={{ color: '#0f172a' }}>
                    {copy({
                      de: 'Status',
                      en: 'Status',
                      pl: 'Status',
                    })}
                    : {authBoundary?.statusLabel}
                  </Text>
                  <Text style={{ color: '#475569' }}>
                    {copy({
                      de: 'Nutzer',
                      en: 'User',
                      pl: 'Użytkownik',
                    })}
                    : {authBoundary?.userLabel}
                  </Text>
                  {!areDeferredHomeAccountDetailsReady ? (
                    <DeferredHomeAccountDetails />
                  ) : (
                    <>
                      <Text style={{ color: '#475569' }}>
                        {copy({
                          de: 'Anmeldemodus',
                          en: 'Sign-in mode',
                          pl: 'Tryb logowania',
                        })}
                        : {authMode}
                      </Text>
                      <Text style={{ color: '#475569' }}>
                        API: {apiBaseUrl} ({apiBaseUrlSource})
                      </Text>
                    </>
                  )}
                </>
              )}
              {authError ? (
                <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
              ) : null}

              {shouldShowLearnerCredentialsForm ? (
                <HomeLearnerCredentialsSignInSection
                  isDeferredReady={areDeferredHomeAccountSignInReady}
                  onSignIn={signInWithLearnerCredentials}
                />
              ) : session.status === 'authenticated' ? (
                <PrimaryButton
                  hint={copy({
                    de: 'Meldet das aktuelle Konto ab.',
                    en: 'Signs out the current account.',
                    pl: 'Wylogowuje bieżące konto.',
                  })}
                  label={copy({
                    de: 'Abmelden',
                    en: 'Sign out',
                    pl: 'Wyloguj',
                  })}
                  onPress={signOut}
                />
              ) : (
                <PrimaryButton
                  hint={copy({
                    de: 'Startet die Demo.',
                    en: 'Starts the demo.',
                    pl: 'Uruchamia demo.',
                  })}
                  label={copy({
                    de: 'Demo starten',
                    en: 'Start demo',
                    pl: 'Uruchom demo',
                  })}
                  onPress={signIn}
                />
              )}
            </SectionCard>

            <SectionCard
              title={copy({
                de: 'Navigation',
                en: 'Navigation',
                pl: 'Nawigacja',
              })}
            >
              <View style={{ flexDirection: 'column', gap: 8 }}>
                <OutlineLink
                  href={LESSONS_ROUTE}
                  hint={copy({
                    de: 'Öffnet die Lektionen.',
                    en: 'Opens lessons.',
                    pl: 'Otwiera lekcje.',
                  })}
                  label={copy({
                    de: 'Lektionen',
                    en: 'Lessons',
                    pl: 'Lekcje',
                  })}
                />
                <OutlineLink
                  href={PRACTICE_ROUTE}
                  hint={copy({
                    de: 'Öffnet das Training.',
                    en: 'Opens practice.',
                    pl: 'Otwiera trening.',
                  })}
                  label={copy({
                    de: 'Training',
                    en: 'Practice',
                    pl: 'Trening',
                  })}
                />
                {!areDeferredHomeNavigationSecondaryReady ? (
                  <DeferredHomeNavigationSecondaryLinks />
                ) : (
                  <>
                    <OutlineLink
                      href={PLAN_ROUTE}
                      hint={copy({
                        de: 'Öffnet den Tagesplan des Schulers.',
                        en: 'Opens the learner daily plan.',
                        pl: 'Otwiera plan dnia ucznia.',
                      })}
                      label={copy({
                        de: 'Tagesplan',
                        en: 'Daily plan',
                        pl: 'Plan dnia',
                      })}
                    />
                    <OutlineLink
                      href={RESULTS_ROUTE}
                      hint={copy({
                        de: 'Öffnet Ergebnisse und den vollständigen Verlauf.',
                        en: 'Opens results and full history.',
                        pl: 'Otwiera wyniki i pełną historię.',
                      })}
                      label={copy({
                        de: 'Ergebnisse',
                        en: 'Results',
                        pl: 'Wyniki',
                      })}
                    />
                    {canOpenParentDashboard ? (
                      <OutlineLink
                        href={PARENT_ROUTE}
                        hint={copy({
                          de: 'Öffnet den Elternbereich.',
                          en: 'Opens the parent dashboard.',
                          pl: 'Otwiera panel rodzica.',
                        })}
                        label={copy({
                          de: 'Elternbereich',
                          en: 'Parent dashboard',
                          pl: 'Panel rodzica',
                        })}
                      />
                    ) : null}
                    {!areDeferredHomeNavigationExtendedReady ? (
                      <DeferredHomeNavigationExtendedLinks />
                    ) : (
                      <>
                        <OutlineLink
                          href={TESTS_ROUTE}
                          hint={copy({
                            de: 'Öffnet die Tests.',
                            en: 'Opens tests.',
                            pl: 'Otwiera testy.',
                          })}
                          label={copy({
                            de: 'Tests',
                            en: 'Tests',
                            pl: 'Testy',
                          })}
                        />
                        <OutlineLink
                          href={COMPETITION_ROUTE}
                          hint={copy({
                            de: 'Öffnet den Wettbewerb.',
                            en: 'Opens the competition.',
                            pl: 'Otwiera konkurs.',
                          })}
                          label={copy({
                            de: 'Wettbewerb',
                            en: 'Competition',
                            pl: 'Konkurs',
                          })}
                        />
                        <OutlineLink
                          href={PROFILE_ROUTE}
                          hint={copy({
                            de: 'Öffnet das Profil des Schulers.',
                            en: 'Opens the learner profile.',
                            pl: 'Otwiera profil ucznia.',
                          })}
                          label={copy({
                            de: 'Profil',
                            en: 'Profile',
                            pl: 'Profil',
                          })}
                        />
                        <OutlineLink
                          href={LEADERBOARD_ROUTE}
                          hint={copy({
                            de: 'Öffnet die Rangliste der Schuler.',
                            en: 'Opens the learner leaderboard.',
                            pl: 'Otwiera ranking uczniów.',
                          })}
                          label={copy({
                            de: 'Rangliste',
                            en: 'Leaderboard',
                            pl: 'Ranking',
                          })}
                        />
                        <OutlineLink
                          href={DUELS_ROUTE}
                          hint={copy({
                            de: 'Öffnet die Duell-Lobby.',
                            en: 'Opens the duels lobby.',
                            pl: 'Otwiera lobby pojedynków.',
                          })}
                          label={copy({
                            de: 'Duelle',
                            en: 'Duels',
                            pl: 'Pojedynki',
                          })}
                        />
                      </>
                    )}
                  </>
                )}
              </View>
            </SectionCard>
          </>
        )}

        {!areDeferredHomePanelsReady ? (
          shouldRenderCombinedHomeStartupPlaceholder ? null : (
          <DeferredHomeActivitySectionsCard />
          )
        ) : session.status === 'authenticated' ? (
          <AuthenticatedHomePrivateDuelSectionGroup
            areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
            areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
            areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
            areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          />
        ) : (
          <AnonymousHomePrivateDuelSectionGroup
            areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
            areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
            areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
            areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          />
        )}

        {!areDeferredHomePanelsReady ? null : !areDeferredHomeDuelAdvancedReady ? (
          <SectionCard
            title={copy({
              de: 'Live-Duelle',
              en: 'Live duels',
              pl: 'Na żywo w pojedynkach',
            })}
          >
            <DeferredDuelAdvancedSectionPlaceholder />
          </SectionCard>
        ) : (
          <HomeLiveDuelsSection isAuthenticated={session.status === 'authenticated'} />
        )}

        {!areDeferredHomePanelsReady ? null : session.status === 'authenticated' ? (
          <AuthenticatedHomeRematchesSection
            areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
            areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
            areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
            areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          />
        ) : (
          <AnonymousHomeRematchesSection
            areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
            areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
            areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
            areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          />
        )}

        {!areDeferredHomePanelsReady ? null : !areDeferredHomeDuelAdvancedReady ? (
          <SectionCard
            title={copy({
              de: 'Duell-Rangliste',
              en: 'Duel leaderboard',
              pl: 'Ranking pojedynków',
            })}
          >
            <DeferredDuelAdvancedSectionPlaceholder />
          </SectionCard>
        ) : (
          <HomeDuelLeaderboardSection
            activeDuelLearnerId={activeDuelLearnerId}
            isAuthenticated={session.status === 'authenticated'}
          />
        )}

        {!areDeferredHomePanelsReady ? null : (
          <SectionCard
            title={copy({
              de: 'Trainingsfokus',
              en: 'Training focus',
              pl: 'Fokus treningowy',
            })}
          >
            {trainingFocus.isRestoringAuth || trainingFocus.isLoading ? (
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Die Anmeldung und der ergebnisbasierte Trainingsfokus werden wiederhergestellt.',
                  en: 'Restoring sign-in and score-based training focus.',
                  pl: 'Przywracamy logowanie i fokus treningowy oparty na wynikach.',
                })}
              </Text>
            ) : !areDeferredHomeTrainingFocusDetailsReady ? (
              <DeferredTrainingFocusDetailsPlaceholder />
            ) : !trainingFocus.isEnabled &&
              !trainingFocus.weakestOperation &&
              !trainingFocus.strongestOperation ? (
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Wir bereiten den aktualisierten Trainingsfokus für den nächsten Startschritt vor.',
                  en: 'Preparing the refreshed training focus for the next home step.',
                  pl: 'Przygotowujemy odświeżony fokus treningowy na kolejny etap ekranu startowego.',
                })}
              </Text>
            ) : trainingFocus.error ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {trainingFocus.error}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {trainingFocus.weakestOperation ? (
                  <FocusCard
                    actionHref={createKangurPracticeHref(
                      trainingFocus.weakestOperation.operation,
                    )}
                    actionLabel={copy({
                      de: 'Schwächsten Modus trainieren',
                      en: 'Practice weakest mode',
                      pl: 'Trenuj najsłabszy tryb',
                    })}
                    averageAccuracyPercent={
                      trainingFocus.weakestOperation.averageAccuracyPercent
                    }
                    lessonHref={createKangurLessonHref(
                      trainingFocus.weakestLessonFocus,
                    )}
                    operation={trainingFocus.weakestOperation.operation}
                    sessions={trainingFocus.weakestOperation.sessions}
                    title={copy({
                      de: 'Zum Wiederholen',
                      en: 'Needs review',
                      pl: 'Do powtórki',
                    })}
                  />
                ) : null}

                {trainingFocus.strongestOperation ? (
                  <FocusCard
                    actionHref={createKangurPracticeHref(
                      trainingFocus.strongestOperation.operation,
                    )}
                    actionLabel={copy({
                      de: 'Tempo halten',
                      en: 'Keep the momentum',
                      pl: 'Utrzymaj tempo',
                    })}
                    averageAccuracyPercent={
                      trainingFocus.strongestOperation.averageAccuracyPercent
                    }
                    lessonHref={createKangurLessonHref(
                      trainingFocus.strongestLessonFocus,
                    )}
                    operation={trainingFocus.strongestOperation.operation}
                    sessions={trainingFocus.strongestOperation.sessions}
                    title={copy({
                      de: 'Stärkster Modus',
                      en: 'Strongest mode',
                      pl: 'Najmocniejszy tryb',
                    })}
                  />
                ) : null}

                {!trainingFocus.weakestOperation &&
                !trainingFocus.strongestOperation ? (
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine Ergebnisse für diesen Fokus. Starte mit einem Training oder öffne direkt eine Lektion.',
                      en: 'There are no results for this focus yet. Start with practice or open a lesson directly.',
                      pl: 'Nie ma jeszcze wyników dla tego fokusu. Zacznij od treningu albo otwórz lekcję bezpośrednio.',
                    })}
                  </Text>
                ) : null}
              </View>
            )}
          </SectionCard>
        )}

        {!areDeferredHomePanelsReady ? null : !areDeferredHomeInsightsReady ? (
          <DeferredHomeInsightsCard />
        ) : (
          <HomeSecondaryInsightsSectionGroup
            initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
            isLiveHomeProgressReady={isLiveHomeProgressReady}
            recentResults={{
              error: recentResults.error,
              isDeferred: !trainingFocus.isEnabled,
              isLoading: recentResults.isLoading,
              isRestoringAuth: recentResults.isRestoringAuth,
              results: recentResults.results,
            }}
          />
        )}
          </ScrollView>
        </SafeAreaView>
      )}
    </HomeHeroLatestLessonCheckpointState>
  );

  if (session.status === 'authenticated') {
    return (
      <HomeDebugProofOperationState>
        {(debugProofOperation) => (
          <>
            {!areDeferredHomeHeroScoresReady ? (
              <DeferredAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                debugProofOperation={debugProofOperation}
              >
                {renderHomeScreenContent}
              </DeferredAuthenticatedHomeScoreState>
            ) : (
              <LiveAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                areDeferredHomeScoreRefreshReady={areDeferredHomeScoreRefreshReady}
                debugProofOperation={debugProofOperation}
              >
                {renderHomeScreenContent}
              </LiveAuthenticatedHomeScoreState>
            )}
          </>
        )}
      </HomeDebugProofOperationState>
    );
  }

  return (
    <HomeDebugProofOperationState>
      {(debugProofOperation) => (
        <AnonymousHomeScoreState
          areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          debugProofOperation={debugProofOperation}
          isRestoringAuth={isLoadingAuth}
        >
          {renderHomeScreenContent}
        </AnonymousHomeScoreState>
      )}
    </HomeDebugProofOperationState>
  );
}
