import {
  getLocalizedKangurCoreLevelTitle,
} from '@kangur/core';
import { type Href, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import {
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMetric as Metric,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { ProfileDuelsCard } from './profile-duels-card';
import {
  AssignmentRow,
  LessonCheckpointRow,
  MasteryInsightRow,
  SessionRow,
  getPriorityLabel,
  getSessionAccentTone,
  getSessionScoreTone,
} from './profile-primitives';
import { useKangurMobileProfileDuels } from './useKangurMobileProfileDuels';
import { useKangurMobileProfileAssignments } from './useKangurMobileProfileAssignments';
import { useKangurMobileProfileBadges } from './useKangurMobileProfileBadges';
import { useKangurMobileProfileLessonMastery } from './useKangurMobileProfileLessonMastery';
import {
  useKangurMobileProfileRecentResults,
} from './useKangurMobileProfileRecentResults';
import { useKangurMobileLearnerProfile } from './useKangurMobileLearnerProfile';

const RESULTS_ROUTE = createKangurResultsHref();
const DUELS_ROUTE = createKangurDuelsHref();
const LESSONS_ROUTE = '/lessons' as Href;

export function KangurProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 3 });
  const profileAssignments = useKangurMobileProfileAssignments();
  const profileLessonMastery = useKangurMobileProfileLessonMastery();
  const profileRecentResults = useKangurMobileProfileRecentResults();
  const {
    authError,
    canNavigateToRecommendation,
    displayName,
    getActionHref,
    isAuthenticated,
    isLoadingAuth,
    recommendationsNote,
    signIn,
    supportsLearnerCredentials,
    snapshot,
  } = useKangurMobileLearnerProfile();
  const duelProfile = useKangurMobileProfileDuels();
  const profileBadges = useKangurMobileProfileBadges({
    unlockedBadgeIds: snapshot.unlockedBadgeIds,
  });
  const recentProfileSessionCount = profileRecentResults.recentResultItems.length;
  const recentProfileBestAccuracy =
    recentProfileSessionCount > 0
      ? Math.max(
          ...profileRecentResults.recentResultItems.map((item) =>
            getKangurMobileScoreAccuracyPercent(item.result),
          ),
        )
      : null;
  const latestProfileResult = profileRecentResults.recentResultItems[0] ?? null;

  const xpToNextLevel = snapshot.nextLevel
    ? Math.max(0, snapshot.nextLevel.minXp - snapshot.totalXp)
    : 0;
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };
  const profileTutorContext: KangurAiTutorConversationContext =
    isAuthenticated && recommendationsNote
      ? {
          contentId: 'profile:overview',
          description: recommendationsNote,
          focusId: 'kangur-profile-recommendations',
          focusKind: 'screen',
          surface: 'profile',
          title: displayName,
        }
      : {
          contentId: 'profile:overview',
          description: authError ?? undefined,
          focusId: isAuthenticated ? 'kangur-profile-overview' : 'kangur-profile-hero',
          focusKind: isAuthenticated ? 'summary' : 'hero',
          masterySummary: isAuthenticated
            ? copy({
                de: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP`,
                en: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP`,
                pl: `Poziom ${snapshot.level.level} · ${snapshot.totalXp} XP`,
              })
            : undefined,
          surface: 'profile',
          title: displayName,
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

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Daten und Fortschritt',
                en: 'Data and progress',
                pl: 'Dane i postęp',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Schülerprofil',
                en: 'Learner profile',
                pl: 'Profil ucznia',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {isLoadingAuth && !isAuthenticated
                ? copy({
                    de: 'Die Anmeldung und die gespeicherten Statistiken werden wiederhergestellt.',
                    en: 'Restoring sign-in and saved stats.',
                    pl: 'Przywracamy logowanie i zapisane statystyki.',
                  })
                : copy({
                    de: `Statistiken für ${displayName}.`,
                    en: `Learner stats: ${displayName}.`,
                    pl: `Statystyki ucznia: ${displayName}.`,
                  })}
            </Text>

            {isLoadingAuth && !isAuthenticated ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Wir prüfen die gespeicherte Anmeldung. Danach stellen wir Ergebnisse und Fortschritt wieder her.',
                  en: 'Checking saved sign-in. After that we will restore results and progress.',
                  pl: 'Sprawdzamy zapisane logowanie. Po zakończeniu przywrócimy wyniki i postęp.',
                })}
              </Text>
            ) : !isAuthenticated ? (
              supportsLearnerCredentials ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Melde dich an, um im Profil Ergebnisse, Fortschritt und Duelle zu sehen.',
                      en: 'Sign in to see results, progress, and duels in the profile.',
                      pl: 'Zaloguj się, aby zobaczyć w profilu wyniki, postęp i pojedynki.',
                    })}
                  </Text>
                  <LinkButton
                    href='/'
                    label={copy({
                      de: 'Zum Login',
                      en: 'Go to sign in',
                      pl: 'Przejdź do logowania',
                    })}
                    style={{ paddingHorizontal: 16 }}
                    tone='brand'
                    verticalPadding={12}
                  />
                </View>
              ) : (
                <ActionButton
                  label={copy({
                    de: 'Demo starten',
                    en: 'Start demo',
                    pl: 'Uruchom demo',
                  })}
                  onPress={signIn}
                  tone='primary'
                />
              )
            ) : null}
            {authError ? (
              <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
                {authError}
              </Text>
            ) : null}
            <LinkButton
              href={createKangurPlanHref()}
              label={copy({
                de: 'Tagesplan öffnen',
                en: 'Open daily plan',
                pl: 'Otwórz plan dnia',
              })}
              style={{ paddingHorizontal: 16 }}
              verticalPadding={12}
            />
          </Card>

          <KangurMobileAiTutorCard context={profileTutorContext} />

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Level-Fortschritt',
                en: 'Level progress',
                pl: 'Postęp poziomu',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
              {getLocalizedKangurCoreLevelTitle(
                snapshot.level.level,
                snapshot.level.title,
                locale,
              )}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14 }}>
              {copy({
                de: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP insgesamt`,
                en: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP total`,
                pl: `Poziom ${snapshot.level.level} · ${snapshot.totalXp} XP łącznie`,
              })}
            </Text>
            <View
              style={{
                height: 12,
                borderRadius: 999,
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${snapshot.levelProgressPercent}%`,
                  height: '100%',
                  backgroundColor: '#4f46e5',
                }}
              />
            </View>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {snapshot.nextLevel
                ? copy({
                    de: `Bis Level ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
                    en: `To level ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
                    pl: `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
                  })
                : copy({
                    de: 'Maximales Level erreicht',
                    en: 'Maximum level reached',
                    pl: 'Maksymalny poziom osiągnięty',
                  })}
            </Text>
          </Card>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Metric
              label={copy({
                de: 'Durchschnittliche Trefferquote',
                en: 'Average accuracy',
                pl: 'Średnia skuteczność',
              })}
              value={`${snapshot.averageAccuracy}%`}
              description={copy({
                de: `Bestes Ergebnis: ${snapshot.bestAccuracy}%`,
                en: `Best result: ${snapshot.bestAccuracy}%`,
                pl: `Najlepszy wynik: ${snapshot.bestAccuracy}%`,
              })}
            />
            <Metric
              label={copy({
                de: 'Tagesserie',
                en: 'Day streak',
                pl: 'Seria dni',
              })}
              value={`${snapshot.currentStreakDays}`}
              description={copy({
                de: `Längste: ${snapshot.longestStreakDays} Tage`,
                en: `Longest: ${snapshot.longestStreakDays} days`,
                pl: `Najdłuższa: ${snapshot.longestStreakDays} dni`,
              })}
            />
            <Metric
              label={copy({
                de: 'Tagesziel',
                en: 'Daily goal',
                pl: 'Cel dzienny',
              })}
              value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
              description={copy({
                de: `Erfüllung: ${snapshot.dailyGoalPercent}%`,
                en: `Completion: ${snapshot.dailyGoalPercent}%`,
                pl: `Wypełnienie: ${snapshot.dailyGoalPercent}%`,
              })}
            />
            <Metric
              label={copy({
                de: 'Abzeichen',
                en: 'Badges',
                pl: 'Odznaki',
              })}
              value={`${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`}
              description={copy({
                de: 'Freigeschaltete Erfolge',
                en: 'Unlocked achievements',
                pl: 'Odblokowane osiągnięcia',
              })}
            />
          </View>

          <ProfileDuelsCard
            duelProfile={duelProfile}
            duelsHref={DUELS_ROUTE}
            openDuelSession={openDuelSession}
          />

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Letzte Lektions-Checkpoints',
                  en: 'Recent lesson checkpoints',
                  pl: 'Ostatnie checkpointy lekcji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Das Profil zeigt die zuletzt lokal gespeicherten Lektionsstände, damit du genau an der letzten Stelle wieder einsteigen kannst.',
                  en: 'The profile shows the most recently saved lesson states so you can resume exactly where the latest lesson was stored.',
                  pl: 'Profil pokazuje ostatnio zapisane stany lekcji, aby można było wrócić dokładnie do miejsca ostatniego zapisu.',
                })}
              </Text>
            </View>

            {lessonCheckpoints.recentCheckpoints.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
                  en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
                  pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {lessonCheckpoints.recentCheckpoints.map((item) => (
                  <LessonCheckpointRow key={item.componentId} item={item} />
                ))}

                <LinkButton
                  href={LESSONS_ROUTE}
                  label={copy({
                    de: 'Lektionen öffnen',
                    en: 'Open lessons',
                    pl: 'Otwórz lekcje',
                  })}
                />
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Lektionsbeherrschung',
                  en: 'Lesson mastery',
                  pl: 'Opanowanie lekcji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Im Profil siehst du die stärksten und schwächsten Bereiche auf Basis gespeicherter Lektionen.',
                  en: 'In the profile you can see the strongest and weakest areas based on saved lessons.',
                  pl: 'W profilu zobaczysz najmocniejsze i najsłabsze obszary na podstawie zapisanych lekcji.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Verfolgt ${profileLessonMastery.trackedLessons}`,
                  en: `Tracked ${profileLessonMastery.trackedLessons}`,
                  pl: `Śledzone ${profileLessonMastery.trackedLessons}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Beherrscht ${profileLessonMastery.masteredLessons}`,
                  en: `Mastered ${profileLessonMastery.masteredLessons}`,
                  pl: `Opanowane ${profileLessonMastery.masteredLessons}`,
                })}
                tone={{
                  backgroundColor: '#ecfdf5',
                  borderColor: '#a7f3d0',
                  textColor: '#047857',
                }}
              />
              <Pill
                label={copy({
                  de: `Zum Wiederholen ${profileLessonMastery.lessonsNeedingPractice}`,
                  en: `Needs review ${profileLessonMastery.lessonsNeedingPractice}`,
                  pl: `Do powtórki ${profileLessonMastery.lessonsNeedingPractice}`,
                })}
                tone={{
                  backgroundColor: '#fff7ed',
                  borderColor: '#fdba74',
                  textColor: '#c2410c',
                }}
              />
            </View>

            {profileLessonMastery.trackedLessons === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine Lektions-Checkpoints. Schließe eine beliebige Lektion ab, um Stärken und Wiederholungsbereiche zu sehen.',
                  en: 'There are no lesson checkpoints yet. Complete any lesson to see strengths and review areas.',
                  pl: 'Nie ma jeszcze checkpointów lekcji. Ukończ dowolną lekcję, aby zobaczyć mocne strony i obszary do powtórki.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    {copy({
                      de: 'Zum Wiederholen',
                      en: 'Needs review',
                      pl: 'Do powtórki',
                    })}
                  </Text>
                  {profileLessonMastery.weakest.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Alle verfolgten Lektionen sind auf einem sicheren Niveau.',
                        en: 'All tracked lessons are at a safe level.',
                        pl: 'Wszystkie śledzone lekcje są na bezpiecznym poziomie.',
                      })}
                    </Text>
                  ) : (
                    profileLessonMastery.weakest.map((insight) => (
                      <MasteryInsightRow key={insight.componentId} insight={insight} />
                    ))
                  )}
                </View>

                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    {copy({
                      de: 'Stärkste Lektionen',
                      en: 'Strongest lessons',
                      pl: 'Najmocniejsze lekcje',
                    })}
                  </Text>
                  {profileLessonMastery.strongest.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Schließe zuerst ein paar Lektionen ab, um die stärksten Bereiche zu sehen.',
                        en: 'Finish a few lessons first to see the strongest areas.',
                        pl: 'Najpierw ukończ kilka lekcji, aby zobaczyć najmocniejsze obszary.',
                      })}
                    </Text>
                  ) : (
                    profileLessonMastery.strongest.map((insight) => (
                      <MasteryInsightRow key={insight.componentId} insight={insight} />
                    ))
                  )}
                </View>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Tagesplan aus dem Profil',
                  en: 'Daily plan from profile',
                  pl: 'Plan dnia z profilu',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Ordne die nächsten Schritte aus letzten Ergebnissen und Aktivitäten direkt aus dem Profil heraus an.',
                  en: 'Line up the next steps from recent results and activity directly from the profile.',
                  pl: 'Ułóż kolejne kroki z ostatnich wyników i aktywności bezpośrednio z poziomu profilu.',
                })}
              </Text>
            </View>

            {snapshot.recommendations.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14 }}>
                {copy({
                  de: 'Keine Empfehlungen zum Anzeigen.',
                  en: 'No recommendations to show.',
                  pl: 'Brak rekomendacji do wyświetlenia.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {snapshot.recommendations.map((recommendation) => {
                  const canNavigate = canNavigateToRecommendation(recommendation.action.page);
                  const actionHref = getActionHref(recommendation.action);

                  return (
                    <InsetPanel key={recommendation.id} gap={8}>
                      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                        {getPriorityLabel(recommendation.priority, locale)}
                      </Text>
                      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                        {recommendation.title}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {recommendation.description}
                      </Text>

                      {canNavigate && actionHref ? (
                        <LinkButton
                          href={actionHref}
                          label={translateKangurMobileActionLabel(
                            recommendation.action.label,
                            locale,
                          )}
                          tone='brand'
                        />
                      ) : (
                        <MutedActionChip
                          label={`${translateKangurMobileActionLabel(
                            recommendation.action.label,
                            locale,
                          )} · ${copy({
                            de: 'bald',
                            en: 'soon',
                            pl: 'wkrotce',
                          })}`}
                        />
                      )}
                    </InsetPanel>
                  );
                })}
              </View>
            )}

            <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
              {recommendationsNote}
            </Text>
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Zurück zu den letzten Ergebnissen',
                  en: 'Return to recent results',
                  pl: 'Powrót do ostatnich wyników',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du aus dem Profil direkt wieder ins Training, die passende Lektion oder den vollständigen Verlauf springen kannst.',
                  en: 'The latest results stay close here so you can jump from the profile straight back into practice, the matching lesson, or the full history.',
                  pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było z profilu od razu wrócić do treningu, pasującej lekcji albo pełnej historii.',
                })}
              </Text>
            </View>

            {profileRecentResults.isLoading || profileRecentResults.isRestoringAuth ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die letzten Versuche des Lernenden werden geladen.',
                  en: 'Checking the learner recent attempts.',
                  pl: 'Sprawdzamy ostatnie podejścia ucznia.',
                })}
              </Text>
            ) : !profileRecentResults.isEnabled ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Melde dich an, um hier Ergebnisse zu sehen.',
                  en: 'Sign in to see results here.',
                  pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.',
                })}
              </Text>
            ) : profileRecentResults.error ? (
              <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                {profileRecentResults.error}
              </Text>
            ) : profileRecentResults.recentResultItems.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt hier noch keine Ergebnisse. Die ersten Versuche erscheinen hier automatisch.',
                  en: 'There are no results here yet. The first attempts will appear here automatically.',
                  pl: 'Nie ma tu jeszcze wyników. Pierwsze podejścia pojawią się tutaj automatycznie.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {profileRecentResults.recentResultItems.map((item) => (
                  <SessionRow key={item.result.id} item={item} />
                ))}

                <LinkButton
                  href={RESULTS_ROUTE}
                  label={copy({
                    de: 'Vollständigen Verlauf öffnen',
                    en: 'Open full history',
                    pl: 'Otwórz pełną historię',
                  })}
                />
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Abzeichen',
                  en: 'Badges',
                  pl: 'Odznaki',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Abzeichen-Zentrale',
                  en: 'Badge hub',
                  pl: 'Centrum odznak',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Behalte die letzten Freischaltungen und das vollständige Abzeichenraster an einem Ort im Blick.',
                  en: 'Keep the latest unlocks and the full badge grid in one place.',
                  pl: 'Śledź w jednym miejscu ostatnie odblokowania i pełną siatkę odznak.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Freigeschaltet ${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`,
                  en: `Unlocked ${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`,
                  pl: `Odblokowane ${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Offen ${profileBadges.remainingBadges}`,
                  en: `Remaining ${profileBadges.remainingBadges}`,
                  pl: `Do zdobycia ${profileBadges.remainingBadges}`,
                })}
                tone={{
                  backgroundColor: '#fff7ed',
                  borderColor: '#fdba74',
                  textColor: '#c2410c',
                }}
              />
            </View>

            {profileBadges.recentBadges.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
                  en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
                  pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                  {copy({
                    de: 'Zuletzt freigeschaltet',
                    en: 'Recently unlocked',
                    pl: 'Ostatnio odblokowane',
                  })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {profileBadges.recentBadges.map((badge) => (
                    <Pill
                      key={badge.id}
                      label={`${badge.emoji} ${badge.name}`}
                      tone={{
                        backgroundColor: '#fff7ed',
                        borderColor: '#fdba74',
                        textColor: '#c2410c',
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
              {copy({
                de: 'Alle Abzeichen',
                en: 'All badges',
                pl: 'Wszystkie odznaki',
              })}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profileBadges.allBadges.map((badge) => {
                return (
                  <Pill
                    key={badge.id}
                    label={`${badge.emoji} ${badge.name}`}
                    tone={
                      badge.unlocked
                        ? {
                            backgroundColor: '#eef2ff',
                            borderColor: '#c7d2fe',
                            textColor: '#4338ca',
                          }
                        : {
                            backgroundColor: '#f8fafc',
                            borderColor: '#e2e8f0',
                            textColor: '#64748b',
                          }
                    }
                  />
                );
              })}
            </View>
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Im Profil',
                  en: 'In profile',
                  pl: 'W profilu',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Profilplan',
                  en: 'Profile plan',
                  pl: 'Plan w profilu',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Nutze das Profil als schnellen Weg in die nächsten Aufgaben aus deinem Fortschritt.',
                  en: 'Use the profile as a quick path into the next tasks from your progress.',
                  pl: 'Potraktuj profil jako szybkie wejście w kolejne zadania z postępu.',
                })}
              </Text>
            </View>

            {profileAssignments.assignmentItems.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                  en: 'There are no tasks yet. Open lessons or complete more practice to build the next plan.',
                  pl: 'Nie ma jeszcze zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {profileAssignments.assignmentItems.map((item) => (
                  <AssignmentRow
                    key={item.assignment.id}
                    assignment={item.assignment}
                    href={item.href}
                  />
                ))}
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Ergebnisse im Profil',
                  en: 'Results in profile',
                  pl: 'Wyniki w profilu',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Ergebniszentrale',
                  en: 'Results hub',
                  pl: 'Centrum wyników',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {profileRecentResults.isLoading || profileRecentResults.isRestoringAuth
                  ? copy({
                      de: 'Die gespeicherten Versuche für das Profil werden geladen.',
                      en: 'Loading saved attempts for the profile.',
                      pl: 'Pobieramy zapisane podejścia dla profilu.',
                    })
                  : !profileRecentResults.isEnabled
                    ? copy({
                        de: 'Melde dich an, um hier Ergebnisse und den vollständigen Verlauf zu sehen.',
                        en: 'Sign in to see results and the full history here.',
                        pl: 'Zaloguj się, aby zobaczyć tutaj wyniki i pełną historię.',
                      })
                    : profileRecentResults.error
                      ? profileRecentResults.error
                      : copy({
                          de: 'Von hier aus kannst du den Verlauf aktualisieren, die vollständige Historie öffnen und direkt in den nächsten Lernschritt springen.',
                          en: 'From here you can refresh results, open the full history, and jump straight into the next study step.',
                          pl: 'Stąd możesz odświeżyć wyniki, otworzyć pełną historię i od razu przejść do kolejnego kroku nauki.',
                        })}
              </Text>
            </View>

            {profileRecentResults.isEnabled &&
            !profileRecentResults.isLoading &&
            !profileRecentResults.isRestoringAuth &&
            !profileRecentResults.error &&
            recentProfileSessionCount > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={copy({
                    de: `Ergebnisse ${recentProfileSessionCount}`,
                    en: `Results ${recentProfileSessionCount}`,
                    pl: `Wyniki ${recentProfileSessionCount}`,
                  })}
                  tone={{
                    backgroundColor: '#eef2ff',
                    borderColor: '#c7d2fe',
                    textColor: '#4338ca',
                  }}
                />
                {recentProfileBestAccuracy !== null ? (
                  <Pill
                    label={copy({
                      de: `Bestes Ergebnis ${recentProfileBestAccuracy}%`,
                      en: `Best accuracy ${recentProfileBestAccuracy}%`,
                      pl: `Najlepsza skuteczność ${recentProfileBestAccuracy}%`,
                    })}
                    tone={getSessionScoreTone(recentProfileBestAccuracy)}
                  />
                ) : null}
                {latestProfileResult ? (
                  <Pill
                    label={copy({
                      de: `Letzter Modus ${formatKangurMobileScoreOperation(
                        latestProfileResult.result.operation,
                        locale,
                      )}`,
                      en: `Latest mode ${formatKangurMobileScoreOperation(
                        latestProfileResult.result.operation,
                        locale,
                      )}`,
                      pl: `Ostatni tryb ${formatKangurMobileScoreOperation(
                        latestProfileResult.result.operation,
                        locale,
                      )}`,
                    })}
                    tone={getSessionAccentTone(latestProfileResult.result.operation)}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <ActionButton
                label={copy({
                  de: 'Aktualisieren',
                  en: 'Refresh',
                  pl: 'Odśwież',
                })}
                onPress={() => profileRecentResults.refresh()}
                stretch
                style={{ borderRadius: 16 }}
                tone='primary'
                verticalPadding={12}
              />

              <LinkButton
                href={RESULTS_ROUTE}
                label={copy({
                  de: 'Vollständigen Verlauf öffnen',
                  en: 'Open full history',
                  pl: 'Otwórz pełną historię',
                })}
                stretch
                style={{ borderRadius: 16 }}
                verticalPadding={12}
              />

              <LinkButton
                href={createKangurPlanHref()}
                label={copy({
                  de: 'Tagesplan öffnen',
                  en: 'Open daily plan',
                  pl: 'Otwórz plan dnia',
                })}
                stretch
                style={{ borderRadius: 16 }}
                verticalPadding={12}
              />
            </View>
          </Card>
        </View>
    </KangurMobileScrollScreen>
  );
}
