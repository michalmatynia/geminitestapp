import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { useKangurMobileParentDashboard } from './useKangurMobileParentDashboard';

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

type ParentDashboardTabId =
  | 'progress'
  | 'results'
  | 'assignments'
  | 'monitoring'
  | 'aiTutor';

const BASE_TONE: Tone = {
  backgroundColor: '#f8fafc',
  borderColor: '#cbd5e1',
  textColor: '#475569',
};

const SUCCESS_TONE: Tone = {
  backgroundColor: '#ecfdf5',
  borderColor: '#a7f3d0',
  textColor: '#047857',
};

const WARNING_TONE: Tone = {
  backgroundColor: '#fffbeb',
  borderColor: '#fde68a',
  textColor: '#b45309',
};

const INDIGO_TONE: Tone = {
  backgroundColor: '#eef2ff',
  borderColor: '#c7d2fe',
  textColor: '#4338ca',
};

const HOME_ROUTE = '/' as const;
const PROFILE_ROUTE = '/profile' as const;
const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = createKangurResultsHref();

function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      {children}
    </View>
  );
}

function Pill({
  label,
  tone = BASE_TONE,
}: {
  label: string;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function Metric({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        flexBasis: '48%',
        gap: 6,
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18 }}>{description}</Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';

  return (
    <Pressable
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: disabled ? '#e2e8f0' : isPrimary ? '#0f172a' : '#ffffff',
        borderColor: isPrimary ? 'transparent' : '#cbd5e1',
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 46,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          color: isPrimary ? '#ffffff' : '#0f172a',
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OutlineLink({
  href,
  label,
}: {
  href: Href;
  label: string;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole='button'
        style={{
          alignItems: 'center',
          alignSelf: 'stretch',
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 16,
          borderWidth: 1,
          justifyContent: 'center',
          minHeight: 46,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? '#0f172a' : '#ffffff',
        borderColor: active ? '#0f172a' : '#cbd5e1',
        borderRadius: 999,
        borderWidth: 1,
        minHeight: 40,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: active ? '#ffffff' : '#0f172a',
          fontSize: 13,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const formatAssignmentPriorityLabel = (
  priority: 'high' | 'low' | 'medium',
  locale: 'de' | 'en' | 'pl',
): string => {
  if (priority === 'high') {
    return {
      de: 'Hohe Priorität',
      en: 'High priority',
      pl: 'Wysoki priorytet',
    }[locale];
  }

  if (priority === 'medium') {
    return {
      de: 'Mittlere Priorität',
      en: 'Medium priority',
      pl: 'Średni priorytet',
    }[locale];
  }

  return {
    de: 'Niedrige Priorität',
    en: 'Low priority',
    pl: 'Niski priorytet',
  }[locale];
};

const getAssignmentTone = (
  priority: 'high' | 'low' | 'medium',
): Tone => {
  if (priority === 'high') {
    return WARNING_TONE;
  }

  if (priority === 'medium') {
    return INDIGO_TONE;
  }

  return SUCCESS_TONE;
};

export function KangurParentDashboardScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const dashboard = useKangurMobileParentDashboard();
  const [activeTab, setActiveTab] = useState<ParentDashboardTabId>('progress');
  const tutorContext =
    dashboard.canAccessDashboard
      ? {
          contentId: `parent-dashboard:${dashboard.selectedLearnerId ?? 'none'}`,
          description: dashboard.activeLearner
            ? copy({
                de: `Du beobachtest gerade ${dashboard.activeLearner.displayName}.`,
                en: `You are currently reviewing ${dashboard.activeLearner.displayName}.`,
                pl: `Aktualnie obserwujesz ${dashboard.activeLearner.displayName}.`,
              })
            : copy({
                de: 'Wähle zuerst einen Lernenden aus, bevor du Fortschritt, Ergebnisse und Aufgaben vergleichst.',
                en: 'Pick a learner first before you compare progress, results, and assignments.',
                pl: 'Najpierw wybierz ucznia, zanim porównasz postęp, wyniki i zadania.',
              }),
          focusId: dashboard.activeLearner
            ? 'kangur-parent-dashboard-learner-management'
            : 'kangur-parent-dashboard-hero',
          focusKind: dashboard.activeLearner ? ('screen' as const) : ('hero' as const),
          surface: 'parent_dashboard' as const,
          title: dashboard.activeLearner?.displayName ?? dashboard.parentDisplayName,
        }
      : {
          contentId: 'parent-dashboard:guest',
          focusId: 'kangur-parent-dashboard-guest-hero',
          focusKind: 'hero' as const,
          surface: 'parent_dashboard' as const,
          title: dashboard.parentDisplayName,
        };
  const activeAssignmentCount =
    dashboard.assignmentMonitoring.notStartedCount +
    dashboard.assignmentMonitoring.inProgressCount;
  const activeTabDescription =
    activeTab === 'progress'
      ? copy({
          de: 'Prüfe Level, Serie und Tagesziel des ausgewählten Lernenden.',
          en: 'Review the selected learner level, streak, and daily goal.',
          pl: 'Sprawdź poziom, serię i cel dnia wybranego ucznia.',
        })
      : activeTab === 'results'
        ? copy({
            de: 'Przejrzyj najnowsze Ergebnisse und öffne bei Bedarf den vollständigen Verlauf.',
            en: 'Review the latest results and open the full history when needed.',
            pl: 'Przejrzyj najnowsze wyniki i otwórz pełną historię, gdy będzie potrzebna.',
          })
        : activeTab === 'assignments'
          ? copy({
              de: 'Otwórz bieżące priorytety i przejdź od razu do lekcji albo treningu.',
              en: 'Open current priorities and jump straight into lessons or practice.',
              pl: 'Otwórz bieżące priorytety i przejdź od razu do lekcji albo treningu.',
            })
          : activeTab === 'monitoring'
            ? copy({
                de: 'Vergleiche den Status aktueller Aufgaben und überprüfe, gdzie Lernende Unterstützung brauchen.',
                en: 'Compare current assignment status and see where learners need support.',
                pl: 'Porównaj status bieżących zadań i sprawdź, gdzie uczeń potrzebuje wsparcia.',
              })
            : copy({
                de: 'Öffne den aktuellen Tutor-Kontext des ausgewählten Lernenden.',
                en: 'Open the current tutor context for the selected learner.',
                pl: 'Otwórz bieżący kontekst AI Tutora dla wybranego ucznia.',
              });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View style={{ gap: 14 }}>
          <Link href={HOME_ROUTE} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'stretch',
                width: '100%',
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {copy({
                  de: 'Zurück',
                  en: 'Back',
                  pl: 'Wróć',
                })}
              </Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Überblick und Planung',
                en: 'Oversight and planning',
                pl: 'Nadzór i planowanie',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Elternbereich',
                en: 'Parent dashboard',
                pl: 'Panel rodzica',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {dashboard.isLoadingAuth && !dashboard.isAuthenticated
                ? copy({
                    de: 'Wir stellen die Eltern-Anmeldung und den zuletzt gewählten Lernenden wieder her.',
                    en: 'Restoring the parent sign-in and the last selected learner.',
                    pl: 'Przywracamy logowanie rodzica i ostatnio wybranego ucznia.',
                  })
                : !dashboard.isAuthenticated
                  ? copy({
                      de: 'Melde dich mit einem Elternkonto an, um Lernende zu wechseln, Fortschritt zu prüfen und Aufgaben zu ordnen.',
                      en: 'Sign in to a parent account to switch learners, review progress, and organise assignments.',
                      pl: 'Zaloguj się na konto rodzica, aby przełączać uczniów, sprawdzać postęp i porządkować zadania.',
                    })
                  : !dashboard.canAccessDashboard
                    ? copy({
                        de: 'Dieser Bereich ist für Elternkonten gedacht, die Lernprofile verwalten können.',
                        en: 'This space is reserved for parent accounts that can manage learner profiles.',
                        pl: 'To miejsce jest przeznaczone dla kont rodzica, które mogą zarządzać profilami uczniów.',
                      })
                    : dashboard.activeLearner
                      ? copy({
                          de: `Du beobachtest gerade ${dashboard.activeLearner.displayName}. Von hier aus kannst du Lernende wechseln und Fortschritt, Ergebnisse sowie aktive Aufgaben prüfen.`,
                          en: `You are currently reviewing ${dashboard.activeLearner.displayName}. From here you can switch learners and check progress, results, and active assignments.`,
                          pl: `Aktualnie obserwujesz ${dashboard.activeLearner.displayName}. Stąd możesz szybko przełączyć ucznia i sprawdzić jego postęp, wyniki oraz aktywne zadania.`,
                        })
                      : copy({
                          de: 'Wähle einen Lernenden aus, um Fortschritt, Ergebnisse und aktive Aufgaben zu sehen.',
                          en: 'Pick a learner to see their progress, results, and active assignments.',
                          pl: 'Wybierz ucznia, aby zobaczyć jego postęp, wyniki i aktywne zadania.',
                        })}
            </Text>

            {dashboard.canAccessDashboard ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={copy({
                    de: `Lernende ${dashboard.learners.length}`,
                    en: `Learners ${dashboard.learners.length}`,
                    pl: `Uczniowie ${dashboard.learners.length}`,
                  })}
                  tone={INDIGO_TONE}
                />
                <Pill
                  label={
                    dashboard.activeLearner
                      ? copy({
                          de: `Aktiv ${dashboard.activeLearner.displayName}`,
                          en: `Active ${dashboard.activeLearner.displayName}`,
                          pl: `Aktywny ${dashboard.activeLearner.displayName}`,
                        })
                      : copy({
                          de: 'Lernenden wählen',
                          en: 'Choose learner',
                          pl: 'Wybierz ucznia',
                        })
                  }
                  tone={SUCCESS_TONE}
                />
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              {!dashboard.isAuthenticated ? (
                <OutlineLink
                  href={HOME_ROUTE}
                  label={copy({
                    de: 'Zum Login',
                    en: 'Go to sign in',
                    pl: 'Przejdź do logowania',
                  })}
                />
              ) : !dashboard.canAccessDashboard ? (
                <OutlineLink
                  href={PROFILE_ROUTE}
                  label={copy({
                    de: 'Lernprofil öffnen',
                    en: 'Open learner profile',
                    pl: 'Otwórz profil ucznia',
                  })}
                />
              ) : (
                <ActionButton
                  label={copy({
                    de: 'Elternbereich aktualisieren',
                    en: 'Refresh parent dashboard',
                    pl: 'Odśwież panel rodzica',
                  })}
                  onPress={() => {
                    void dashboard.refreshDashboard();
                  }}
                  tone='secondary'
                />
              )}
            </View>
          </Card>

          {!dashboard.canAccessDashboard ? (
            <KangurMobileAiTutorCard context={tutorContext} />
          ) : null}

          {dashboard.canAccessDashboard ? (
            <>
              <Card>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Lernendenverwaltung',
                    en: 'Learner management',
                    pl: 'Zarządzanie uczniami',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
                  {copy({
                    de: 'Lernenden wählen',
                    en: 'Choose learner',
                    pl: 'Wybierz ucznia',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Bevor du Fortschritt vergleichst, stelle sicher, dass der richtige Lernende aktiv ist.',
                    en: 'Before you compare progress, make sure the correct learner is active.',
                    pl: 'Zanim porównasz wyniki i postęp, upewnij się, że aktywny jest właściwy uczeń.',
                  })}
                </Text>

                {dashboard.learners.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Dieses Elternkonto hat noch keine Lernprofile.',
                      en: 'This parent account does not have any learner profiles yet.',
                      pl: 'To konto rodzica nie ma jeszcze żadnych profili uczniów.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {dashboard.learners.map((learner) => {
                      const isActive = learner.id === dashboard.selectedLearnerId;
                      const isPending = learner.id === dashboard.switchingLearnerId;

                      return (
                        <Pressable
                          accessibilityRole='button'
                          disabled={isActive || isPending}
                          key={learner.id}
                          onPress={() => {
                            void dashboard.selectLearner(learner.id);
                          }}
                          style={{
                            backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                            borderColor: isActive ? '#60a5fa' : '#cbd5e1',
                            borderRadius: 18,
                            borderWidth: 1,
                            gap: 8,
                            opacity: isPending ? 0.7 : 1,
                            padding: 14,
                          }}
                        >
                          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                            {learner.displayName}
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Pill
                              label={
                                learner.status === 'active'
                                  ? copy({
                                      de: 'Aktiv',
                                      en: 'Active',
                                      pl: 'Aktywny',
                                    })
                                  : copy({
                                      de: 'Deaktiviert',
                                      en: 'Disabled',
                                      pl: 'Wyłączony',
                                    })
                              }
                              tone={isActive ? INDIGO_TONE : BASE_TONE}
                            />
                            <Pill
                              label={
                                isActive
                                  ? copy({
                                      de: 'Jetzt ausgewählt',
                                      en: 'Selected now',
                                      pl: 'Wybrany teraz',
                                    })
                                  : isPending
                                    ? copy({
                                        de: 'Wird gewechselt',
                                        en: 'Switching',
                                        pl: 'Przełączamy',
                                      })
                                    : copy({
                                        de: 'Tippen zum Wechseln',
                                        en: 'Tap to switch',
                                        pl: 'Dotknij, aby przełączyć',
                                      })
                              }
                              tone={isActive ? SUCCESS_TONE : BASE_TONE}
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {dashboard.selectionError ? (
                  <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
                    {dashboard.selectionError}
                  </Text>
                ) : null}
              </Card>

              <Card>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Lernfortschritt',
                    en: 'Learner progress',
                    pl: 'Postęp ucznia',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
                  {dashboard.activeLearner
                    ? copy({
                        de: `Fortschrittsüberblick: ${dashboard.activeLearner.displayName}`,
                        en: `Progress overview: ${dashboard.activeLearner.displayName}`,
                        pl: `Przegląd postępu: ${dashboard.activeLearner.displayName}`,
                      })
                    : copy({
                        de: 'Lernenden wählen',
                        en: 'Choose a learner',
                        pl: 'Wybierz ucznia',
                      })}
                </Text>

                {dashboard.isLoadingProgress ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Der Fortschritt des gewählten Lernenden wird geladen.',
                      en: 'Loading the selected learner progress from the server.',
                      pl: 'Pobieramy serwerowy postęp wybranego ucznia.',
                    })}
                  </Text>
                ) : dashboard.progressError ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {dashboard.progressError}
                    </Text>
                    <ActionButton
                      label={copy({
                        de: 'Fortschritt aktualisieren',
                        en: 'Refresh progress',
                        pl: 'Odśwież postęp',
                      })}
                      onPress={() => {
                        void dashboard.refreshDashboard();
                      }}
                      tone='secondary'
                    />
                  </View>
                ) : dashboard.snapshot ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <Metric
                        description={copy({
                          de: `${dashboard.snapshot.totalXp} XP insgesamt`,
                          en: `${dashboard.snapshot.totalXp} XP total`,
                          pl: `${dashboard.snapshot.totalXp} XP łącznie`,
                        })}
                        label={copy({
                          de: 'Level',
                          en: 'Level',
                          pl: 'Poziom',
                        })}
                        value={`${dashboard.snapshot.level.level}`}
                      />
                      <Metric
                        description={copy({
                          de: `Bestwert ${dashboard.snapshot.bestAccuracy}%`,
                          en: `Best ${dashboard.snapshot.bestAccuracy}%`,
                          pl: `Najlepiej ${dashboard.snapshot.bestAccuracy}%`,
                        })}
                        label={copy({
                          de: 'Trefferquote',
                          en: 'Accuracy',
                          pl: 'Skuteczność',
                        })}
                        value={`${dashboard.snapshot.averageAccuracy}%`}
                      />
                      <Metric
                        description={copy({
                          de: `Längste Serie ${dashboard.snapshot.longestStreakDays} Tage`,
                          en: `Longest ${dashboard.snapshot.longestStreakDays} days`,
                          pl: `Najdłużej ${dashboard.snapshot.longestStreakDays} dni`,
                        })}
                        label={copy({
                          de: 'Serie',
                          en: 'Streak',
                          pl: 'Seria',
                        })}
                        value={`${dashboard.snapshot.currentStreakDays}`}
                      />
                      <Metric
                        description={copy({
                          de: `Heute ${dashboard.snapshot.todayGames}/${dashboard.snapshot.dailyGoalGames}`,
                          en: `Today ${dashboard.snapshot.todayGames}/${dashboard.snapshot.dailyGoalGames}`,
                          pl: `Dzisiaj ${dashboard.snapshot.todayGames}/${dashboard.snapshot.dailyGoalGames}`,
                        })}
                        label={copy({
                          de: 'Tagesziel',
                          en: 'Daily goal',
                          pl: 'Cel dnia',
                        })}
                        value={`${dashboard.snapshot.dailyGoalPercent}%`}
                      />
                    </View>
                    <View style={{ gap: 10 }}>
                      <OutlineLink
                        href={PROFILE_ROUTE}
                        label={copy({
                          de: 'Lernprofil öffnen',
                          en: 'Open learner profile',
                          pl: 'Otwórz profil ucznia',
                        })}
                      />
                      <OutlineLink
                        href={PLAN_ROUTE}
                        label={copy({
                          de: 'Tagesplan des Lernenden öffnen',
                          en: 'Open learner daily plan',
                          pl: 'Otwórz plan dnia ucznia',
                        })}
                      />
                    </View>
                  </>
                ) : (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Wähle einen Lernenden aus, um den Fortschritt zu sehen.',
                      en: 'Choose a learner to see their progress.',
                      pl: 'Wybierz ucznia, aby zobaczyć jego postęp.',
                    })}
                  </Text>
                )}
              </Card>

              <Card>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Ergebnisse des Lernenden',
                    en: 'Learner results',
                    pl: 'Wyniki ucznia',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
                  {copy({
                    de: 'Neueste Ergebnisse',
                    en: 'Latest results',
                    pl: 'Ostatnie podejścia',
                  })}
                </Text>

                {dashboard.isLoadingResults ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die neuesten Ergebnisse des gewählten Lernenden werden geladen.',
                      en: 'Loading the latest results for the selected learner.',
                      pl: 'Pobieramy najnowsze wyniki wybranego ucznia.',
                    })}
                  </Text>
                ) : dashboard.resultsError ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {dashboard.resultsError}
                    </Text>
                    <ActionButton
                      label={copy({
                        de: 'Ergebnisse aktualisieren',
                        en: 'Refresh results',
                        pl: 'Odśwież wyniki',
                      })}
                      onPress={() => {
                        void dashboard.refreshDashboard();
                      }}
                      tone='secondary'
                    />
                  </View>
                ) : dashboard.recentResultItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Für diesen Lernenden gibt es noch keine gespeicherten Ergebnisse.',
                      en: 'This learner does not have saved results yet.',
                      pl: 'Ten uczeń nie ma jeszcze zapisanych wyników.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {dashboard.recentResultItems.map((item) => (
                      <View
                        key={item.result.id}
                        style={{
                          backgroundColor: '#f8fafc',
                          borderColor: '#e2e8f0',
                          borderRadius: 18,
                          borderWidth: 1,
                          gap: 8,
                          padding: 14,
                        }}
                      >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          <Pill
                            label={formatKangurMobileScoreOperation(item.result.operation, locale)}
                            tone={INDIGO_TONE}
                          />
                          <Pill
                            label={`${getKangurMobileScoreAccuracyPercent(item.result)}%`}
                            tone={SUCCESS_TONE}
                          />
                        </View>
                        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
                          {copy({
                            de: `${item.result.correct_answers}/${item.result.total_questions} richtige Antworten`,
                            en: `${item.result.correct_answers}/${item.result.total_questions} correct answers`,
                            pl: `${item.result.correct_answers}/${item.result.total_questions} poprawnych odpowiedzi`,
                          })}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                          {formatKangurMobileScoreDateTime(item.result.created_date, locale)}
                        </Text>
                      </View>
                    ))}
                    <OutlineLink
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
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Aufgaben des Lernenden',
                    en: 'Learner assignments',
                    pl: 'Zadania ucznia',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
                  {copy({
                    de: 'Aktive Prioritäten',
                    en: 'Active priorities',
                    pl: 'Aktywne priorytety',
                  })}
                </Text>

                {dashboard.isLoadingAssignments ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die aktiven Aufgaben des gewählten Lernenden werden geladen.',
                      en: 'Loading active assignments for the selected learner.',
                      pl: 'Pobieramy aktywne zadania przypisane wybranemu uczniowi.',
                    })}
                  </Text>
                ) : dashboard.assignmentsError ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {dashboard.assignmentsError}
                    </Text>
                    <ActionButton
                      label={copy({
                        de: 'Aufgaben aktualisieren',
                        en: 'Refresh assignments',
                        pl: 'Odśwież zadania',
                      })}
                      onPress={() => {
                        void dashboard.refreshDashboard();
                      }}
                      tone='secondary'
                    />
                  </View>
                ) : dashboard.assignmentItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Für diesen Lernenden gibt es im Moment keine aktiven Aufgaben.',
                      en: 'There are no active assignments for this learner right now.',
                      pl: 'Dla tego ucznia nie ma teraz aktywnych zadań.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {dashboard.assignmentItems.map((item) => (
                      <View
                        key={item.assignment.id}
                        style={{
                          backgroundColor: '#f8fafc',
                          borderColor: '#e2e8f0',
                          borderRadius: 18,
                          borderWidth: 1,
                          gap: 10,
                          padding: 14,
                        }}
                      >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          <Pill
                            label={formatAssignmentPriorityLabel(item.assignment.priority, locale)}
                            tone={getAssignmentTone(item.assignment.priority)}
                          />
                          <Pill label={item.assignment.progress.summary} tone={BASE_TONE} />
                        </View>
                        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
                          {item.assignment.title}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                          {item.assignment.description}
                        </Text>
                        {item.href ? (
                          <OutlineLink
                            href={item.href}
                            label={
                              item.assignment.target.type === 'lesson'
                                ? copy({
                                    de: 'Lektion öffnen',
                                    en: 'Open lesson',
                                    pl: 'Otwórz lekcję',
                                  })
                                : copy({
                                    de: 'Training öffnen',
                                    en: 'Open practice',
                                    pl: 'Otwórz trening',
                                  })
                            }
                          />
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
