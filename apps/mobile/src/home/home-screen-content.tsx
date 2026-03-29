import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthenticatedHomePrivateDuelSectionGroup,
  AuthenticatedHomeRematchesSection,
  AnonymousHomePrivateDuelSectionGroup,
  AnonymousHomeRematchesSection,
  DeferredDuelAdvancedSectionPlaceholder,
  HomeDuelLeaderboardSection,
  HomeLiveDuelsSection,
} from './HomeDuelSections';
import { getKangurHomeAuthBoundaryViewModel } from './homeAuthBoundary';
import {
  FocusCard,
  LabeledTextField,
  OutlineLink,
  PrimaryButton,
  SectionCard,
} from './homeScreenPrimitives';
import {
  useHomeScreenDeferredPanelGroup,
  useHomeScreenDeferredPanelSequence,
} from './useHomeScreenDeferredPanels';
import {
  type KangurMobileHomeLessonCheckpointItem,
} from './useKangurMobileHomeLessonCheckpoints';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';
import {
  COMPETITION_ROUTE,
  DUELS_ROUTE,
  HOME_ACCOUNT_DETAILS_PANEL_GROUP,
  HOME_DUEL_PANEL_SEQUENCE,
  HOME_INSIGHT_SCORE_REFRESH_SEQUENCE,
  HOME_NAVIGATION_PANEL_SEQUENCE,
  HOME_PRIMARY_SURFACE_PANEL_GROUP,
  HOME_SCORE_DETAILS_PANEL_GROUP,
  LEADERBOARD_ROUTE,
  LESSONS_ROUTE,
  PARENT_ROUTE,
  PLAN_ROUTE,
  PRACTICE_ROUTE,
  PROFILE_ROUTE,
  RESULTS_ROUTE,
  TESTS_ROUTE,
} from './home-screen-constants';
import {
  DeferredHomeAccountDetails,
  DeferredHomeAccountSignInForm,
  DeferredHomeAccountSummary,
  DeferredHomeActivitySectionsCard,
  DeferredHomeHeroDetails,
  DeferredHomeHeroIntro,
  DeferredHomeHeroOverview,
  DeferredHomeInsightsCard,
  DeferredHomeNavigationExtendedLinks,
  DeferredHomeNavigationSecondaryLinks,
  DeferredHomePrimaryStartupCard,
  DeferredHomeQuickAccessCard,
  DeferredHomeStartupSectionsCard,
  DeferredTrainingFocusDetailsPlaceholder,
} from './home-screen-deferred';
import { HomeSecondaryInsightsSectionGroup } from './home-screen-insights';
import {
  AnonymousHomeScoreState,
  DeferredAuthenticatedHomeScoreState,
  HomeDebugProofOperationState,
  HomeHeroLatestLessonCheckpointState,
  type HomeScoreViewModel,
  LiveAuthenticatedHomeScoreState,
} from './home-screen-score-state';

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

export function HomeScreenContent({
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
