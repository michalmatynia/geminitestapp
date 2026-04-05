import { useState } from 'react';
import { Text, View } from 'react-native';

import type { KangurScore } from '@kangur/contracts/kangur';
import {
  type KangurMobileHomeLessonCheckpointItem,
  useKangurMobileHomeLessonCheckpoints,
} from './useKangurMobileHomeLessonCheckpoints';
import { useKangurMobileHomeAssignments } from './useKangurMobileHomeAssignments';
import { useKangurMobileHomeBadges } from './useKangurMobileHomeBadges';
import { useKangurMobileHomeLessonMastery } from './useKangurMobileHomeLessonMastery';
import {
  useHomeScreenDeferredPanelGroup,
  useHomeScreenDeferredPanelSequence,
  useHomeScreenDeferredPanels,
} from './useHomeScreenDeferredPanels';
import {
  AssignmentCard,
  BadgeChip,
  LessonCheckpointCard,
  LessonMasteryCard,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  SummaryChip,
} from './homeScreenPrimitives';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  formatKangurMobileScoreOperation,
} from '../scores/mobileScoreSummary';
import {
  HOME_BADGES_PANEL_SEQUENCE,
  HOME_INSIGHTS_EXTRAS_PANEL_GROUP,
  HOME_INSIGHTS_SECTION_PANEL_GROUP,
  HOME_PLAN_PANEL_SEQUENCE,
  HOME_RESULTS_HUB_PANEL_SEQUENCE,
  LESSONS_ROUTE,
  PLAN_ROUTE,
  PROFILE_ROUTE,
  RESULTS_ROUTE,
} from './home-screen-constants';
import {
  DeferredHomeInsightsLessonPlanCard,
  DeferredHomeInsightsLessonPlanDetails,
  DeferredHomeInsightsRecentLessonsDetails,
  DeferredHomeInsightsExtrasCard,
  DeferredResultsHubActionsPlaceholder,
  DeferredResultsHubSummaryPlaceholder,
} from './home-screen-deferred';
import {
  DeferredHomeInsightsBadgesAndPlanCard,
  DeferredHomeInsightsBadgesCard,
  DeferredHomeInsightsBadgesDetailsCard,
  DeferredHomeInsightsPlanAssignmentsCard,
  DeferredHomeInsightsPlanCard,
  DeferredHomeInsightsPlanDetailsCard,
  DeferredHomeInsightsResultsHubCard,
} from './home-screen-secondary-deferred';

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
            <LessonCheckpointCard key={item.componentId} item={item} />
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

function HomeSecondaryInsightsBadgesSectionGroup(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const homeBadges = useKangurMobileHomeBadges();

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
            <AssignmentCard key={item.assignment.id} item={item} />
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

export function HomeSecondaryInsightsSectionGroup({
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
