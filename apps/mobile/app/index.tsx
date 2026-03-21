import { Link, type Href, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useKangurMobileAuth } from '../src/auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from '../src/duels/duelsHref';
import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
} from '../src/home/homeDebugProof';
import { getKangurHomeAuthBoundaryViewModel } from '../src/home/homeAuthBoundary';
import { useKangurMobileHomeDuelsSpotlight } from '../src/home/useKangurMobileHomeDuelsSpotlight';
import { useKangurMobileRecentResults } from '../src/home/useKangurMobileRecentResults';
import { useKangurMobileHomeDuelsInvites } from '../src/home/useKangurMobileHomeDuelsInvites';
import { useKangurMobileTrainingFocus } from '../src/home/useKangurMobileTrainingFocus';
import { useKangurMobileI18n } from '../src/i18n/kangurMobileI18n';
import { createKangurLessonHref } from '../src/lessons/lessonHref';
import { createKangurPlanHref } from '../src/plan/planHref';
import { createKangurPracticeHref } from '../src/practice/practiceHref';
import { useKangurMobileRuntime } from '../src/providers/KangurRuntimeContext';
import {
  createKangurResultsHref,
} from '../src/scores/resultsHref';
import {
  formatKangurMobileScoreOperation,
} from '../src/scores/mobileScoreSummary';

const RESULTS_ROUTE = '/results' as Href;
const PROFILE_ROUTE = '/profile' as Href;
const LEADERBOARD_ROUTE = '/leaderboard' as Href;
const LESSONS_ROUTE = '/lessons' as Href;
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const PLAN_ROUTE = createKangurPlanHref();
const DUELS_ROUTE = createKangurDuelsHref();

const getHomeDuelModeLabel = (
  value: 'challenge' | 'quick_match',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'quick_match') {
    return {
      de: 'Schnelles Spiel',
      en: 'Quick match',
      pl: 'Szybki mecz',
    }[locale];
  }

  return {
    de: 'Herausforderung',
    en: 'Challenge',
    pl: 'Wyzwanie',
  }[locale];
};

const getHomeDuelDifficultyLabel = (
  value: 'easy' | 'medium' | 'hard',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'hard') {
    return {
      de: 'schwer',
      en: 'hard',
      pl: 'trudny',
    }[locale];
  }

  if (value === 'medium') {
    return {
      de: 'mittel',
      en: 'medium',
      pl: 'średni',
    }[locale];
  }

  return {
    de: 'leicht',
    en: 'easy',
    pl: 'łatwy',
  }[locale];
};

const getHomeDuelStatusLabel = (
  value: 'created' | 'waiting' | 'ready' | 'in_progress' | 'completed' | 'aborted',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'in_progress') {
    return {
      de: 'Lauft',
      en: 'Live',
      pl: 'W trakcie',
    }[locale];
  }

  if (value === 'ready') {
    return {
      de: 'Bereit',
      en: 'Ready',
      pl: 'Gotowy',
    }[locale];
  }

  if (value === 'waiting') {
    return {
      de: 'Wartet',
      en: 'Waiting',
      pl: 'Oczekuje',
    }[locale];
  }

  if (value === 'completed') {
    return {
      de: 'Beendet',
      en: 'Completed',
      pl: 'Zakończony',
    }[locale];
  }

  if (value === 'aborted') {
    return {
      de: 'Abgebrochen',
      en: 'Aborted',
      pl: 'Przerwany',
    }[locale];
  }

  return {
    de: 'Erstellt',
    en: 'Created',
    pl: 'Utworzony',
  }[locale];
};

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
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
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function OutlineLink({
  href,
  hint,
  label,
}: {
  href: Href;
  hint?: string;
  label: string;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityHint={hint}
        accessibilityLabel={label}
        accessibilityRole='button'
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: '#0f172a', fontWeight: '700' }}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function PrimaryButton({
  hint,
  label,
  onPress,
}: {
  hint?: string;
  label: string;
  onPress: () => void | Promise<void>;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole='button'
      onPress={() => {
        void onPress();
      }}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#2563eb',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function LabeledTextField({
  autoCapitalize = 'sentences',
  hint,
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  textContentType,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: 'username' | 'password';
  value: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
        {label}
      </Text>
      <TextInput
        accessibilityHint={hint}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

function FocusCard({
  actionHref,
  actionLabel,
  averageAccuracyPercent,
  lessonHref,
  operation,
  sessions,
  title,
}: {
  actionHref: Href;
  actionLabel: string;
  averageAccuracyPercent: number;
  lessonHref: Href | null;
  operation: string;
  sessions: number;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const operationLabel = formatKangurMobileScoreOperation(operation, locale);

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {title}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {operationLabel}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Trefferquote ${averageAccuracyPercent}% in ${sessions} Sitzungen.`,
          en: `Accuracy ${averageAccuracyPercent}% across ${sessions} sessions.`,
          pl: `Skuteczność ${averageAccuracyPercent}% przez ${sessions} sesji.`,
        })}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <OutlineLink
          href={actionHref}
          hint={copy({
            de: `Öffnet das Training für den Modus ${operationLabel}.`,
            en: `Opens practice for the ${operationLabel} mode.`,
            pl: `Otwiera trening dla trybu ${operationLabel}.`,
          })}
          label={`${actionLabel}: ${operationLabel}`}
        />
        {lessonHref ? (
          <OutlineLink
            href={lessonHref}
            hint={copy({
              de: `Öffnet die Lektion für den Modus ${operationLabel}.`,
              en: `Opens the lesson for the ${operationLabel} mode.`,
              pl: `Otwiera lekcję dla trybu ${operationLabel}.`,
            })}
            label={`${copy({
              de: 'Lektion öffnen',
              en: 'Open lesson',
              pl: 'Otwórz lekcję',
            })}: ${operationLabel}`}
          />
        ) : null}
        <OutlineLink
          href={createKangurResultsHref({ operation })}
          hint={copy({
            de: `Öffnet den Ergebnisverlauf für den Modus ${operationLabel}.`,
            en: `Opens score history for the ${operationLabel} mode.`,
            pl: `Otwiera historię wyników dla trybu ${operationLabel}.`,
          })}
          label={`${copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}: ${operationLabel}`}
        />
      </View>
    </View>
  );
}

function formatHomeRelativeAge(
  isoString: string,
  locale: 'pl' | 'en' | 'de',
): string {
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) {
    return {
      de: 'gerade eben',
      en: 'just now',
      pl: 'przed chwilą',
    }[locale];
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) {
    return {
      de: 'gerade eben',
      en: 'just now',
      pl: 'przed chwilą',
    }[locale];
  }
  if (seconds < 60) {
    return {
      de: `vor ${seconds}s`,
      en: `${seconds}s ago`,
      pl: `${seconds}s temu`,
    }[locale];
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return {
      de: `vor ${minutes} Min.`,
      en: `${minutes} min ago`,
      pl: `${minutes} min temu`,
    }[locale];
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return {
      de: `vor ${hours} Std.`,
      en: `${hours} hr ago`,
      pl: `${hours} godz. temu`,
    }[locale];
  }

  const days = Math.floor(hours / 24);
  return {
    de: `vor ${days} Tg.`,
    en: `${days} days ago`,
    pl: `${days} dni temu`,
  }[locale];
}

export default function HomeScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{
    debugProofOperation?: string | string[];
  }>();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
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
  const recentResults = useKangurMobileRecentResults();
  const duelInvites = useKangurMobileHomeDuelsInvites();
  const duelSpotlight = useKangurMobileHomeDuelsSpotlight();
  const trainingFocus = useKangurMobileTrainingFocus();
  const authBoundary = getKangurHomeAuthBoundaryViewModel({
    authError,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    locale,
    session,
    supportsLearnerCredentials,
  });
  const debugProofOperation = __DEV__
    ? resolveKangurHomeDebugProofOperation(params.debugProofOperation)
    : null;
  const homeDebugProof = buildKangurHomeDebugProofViewModel({
    isEnabled: recentResults.isEnabled && trainingFocus.isEnabled,
    isLoading: recentResults.isLoading || trainingFocus.isLoading,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: trainingFocus.strongestOperation,
    weakestOperation: trainingFocus.weakestOperation,
  });

  return (
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
          <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
            {copy({
              de: 'Die mobile Version des gemeinsamen Kangur-Lernpfads. Diese App verbindet bereits Lektionen, Profil, Ergebnisse, Tagesplan, Rangliste und Duelle.',
              en: 'The mobile version of the shared Kangur learning path. This app already connects lessons, profile, results, daily plan, leaderboard, and duels.',
              pl: 'Mobilna wersja wspólnej ścieżki nauki Kangura. W tej aplikacji są już podpięte lekcje, profil, wyniki, plan dnia, ranking i pojedynki.',
            })}
          </Text>
        </View>

        {__DEV__ && homeDebugProof ? (
          <SectionCard
            title={copy({
              de: 'Entwicklungsansicht der Startseiten-Synchronizacji',
              en: 'Developer home sync preview',
              pl: 'Deweloperski podgląd synchronizacji strony głównej',
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

        <SectionCard
          title={copy({
            de: 'Sitzung und Verbindung',
            en: 'Session and connection',
            pl: 'Sesja i połączenie',
          })}
        >
          <Text accessibilityLiveRegion='polite' style={{ color: '#0f172a' }}>
            {copy({
              de: 'Status',
              en: 'Status',
              pl: 'Status',
            })}
            : {authBoundary.statusLabel}
          </Text>
          <Text style={{ color: '#475569' }}>
            {copy({
              de: 'Nutzer',
              en: 'User',
              pl: 'Użytkownik',
            })}
            : {authBoundary.userLabel}
          </Text>
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
          {authError ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
          ) : null}

          {authBoundary.showLearnerCredentialsForm ? (
            <View style={{ gap: 10 }}>
              <LabeledTextField
                autoCapitalize='none'
                hint={copy({
                  de: 'Gib den Schuler-Login für die mobile Sitzung ein.',
                  en: 'Enter the learner login for the mobile session.',
                  pl: 'Wpisz login ucznia do sesji mobilnej.',
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
                  de: 'Gib das Passwort des Schulers für die mobile Sitzung ein.',
                  en: 'Enter the learner password for the mobile session.',
                  pl: 'Wpisz hasło ucznia do sesji mobilnej.',
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
                  de: 'Meldet die Schulersitzung mit den eingegebenen Daten an.',
                  en: 'Signs in the learner session with the entered credentials.',
                  pl: 'Loguje do sesji ucznia przy użyciu wpisanych danych.',
                })}
                label={copy({
                  de: 'Schulersitzung anmelden',
                  en: 'Sign in learner session',
                  pl: 'Zaloguj sesję ucznia',
                })}
                onPress={async () => {
                  await signInWithLearnerCredentials(loginName, password);
                }}
              />
            </View>
          ) : session.status === 'authenticated' ? (
            <PrimaryButton
              hint={copy({
                de: 'Meldet die aktuelle Schulersitzung in der mobilen App ab.',
                en: 'Signs out the current learner session from the mobile app.',
                pl: 'Wylogowuje aktualną sesję ucznia z aplikacji mobilnej.',
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
                de: 'Meldet eine Demo-Sitzung in der mobilen App an.',
                en: 'Signs in a demo session in the mobile app.',
                pl: 'Loguje przykładową sesję demo w aplikacji mobilnej.',
              })}
              label={copy({
                de: 'Demo-Sitzung anmelden',
                en: 'Sign in demo session',
                pl: 'Zaloguj sesję demo',
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <OutlineLink
              href={LESSONS_ROUTE}
              hint={copy({
                de: 'Öffnet den Lektionen-Bildschirm.',
                en: 'Opens the lessons screen.',
                pl: 'Otwiera ekran lekcji.',
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
                de: 'Öffnet den Trainings-Bildschirm.',
                en: 'Opens the practice screen.',
                pl: 'Otwiera ekran treningu.',
              })}
              label={copy({
                de: 'Training',
                en: 'Practice',
                pl: 'Trening',
              })}
            />
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
                de: 'Öffnet den Ergebnis- und Sitzungsverlauf.',
                en: 'Opens the results and session history screen.',
                pl: 'Otwiera ekran wyników i historii sesji.',
              })}
              label={copy({
                de: 'Ergebnisse',
                en: 'Results',
                pl: 'Wyniki',
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
          </View>
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Duelleinladungen',
            en: 'Duel invites',
            pl: 'Zaproszenia do pojedynków',
          })}
        >
          {!duelInvites.isAuthenticated ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Nach der Anmeldung siehst du hier private Duelleinladungen von anderen Schulern.',
                  en: 'After signing in, you will see private duel invites from other learners here.',
                  pl: 'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : duelInvites.isRestoringAuth || duelInvites.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Private Duelleinladungen werden geladen.',
                en: 'Loading private duel invites.',
                pl: 'Pobieramy prywatne zaproszenia do pojedynków.',
              })}
            </Text>
          ) : duelInvites.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelInvites.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die privaten Duelleinladungen.',
                  en: 'Refreshes the private duel invites.',
                  pl: 'Odświeża prywatne zaproszenia do pojedynków.',
                })}
                label={copy({
                  de: 'Einladungen aktualisieren',
                  en: 'Refresh invites',
                  pl: 'Odśwież zaproszenia',
                })}
                onPress={duelInvites.refresh}
              />
            </View>
          ) : duelInvites.invites.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Keine offenen Einladungen. Du kannst die Lobby öffnen und eine neue Herausforderung senden.',
                  en: 'There are no pending invites yet. You can open the lobby and send a new challenge.',
                  pl: 'Brak oczekujących zaproszeń. Możesz otworzyć lobby i wysłać nowe wyzwanie.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {duelInvites.invites.map((invite) => (
                <View
                  key={invite.sessionId}
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
                    {invite.host.displayName}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {getHomeDuelModeLabel(invite.mode, locale)} •{' '}
                    {formatKangurMobileScoreOperation(invite.operation, locale)} •{' '}
                    {copy({
                      de: 'Stufe',
                      en: 'level',
                      pl: 'poziom',
                    })}{' '}
                    {getHomeDuelDifficultyLabel(invite.difficulty, locale)}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `${invite.questionCount} Fragen • ${invite.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                      en: `${invite.questionCount} questions • ${invite.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                      pl: `${invite.questionCount} pytań • ${invite.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                    })}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <OutlineLink
                      href={createKangurDuelsHref({ joinSessionId: invite.sessionId })}
                      hint={copy({
                        de: `Nimmt die Einladung von ${invite.host.displayName} an.`,
                        en: `Accepts the invite from ${invite.host.displayName}.`,
                        pl: `Przyjmuje zaproszenie od ${invite.host.displayName}.`,
                      })}
                      label={`${copy({
                        de: 'Beitreten',
                        en: 'Join',
                        pl: 'Dołącz',
                      })}: ${invite.host.displayName}`}
                    />
                    <OutlineLink
                      href={DUELS_ROUTE}
                      hint={copy({
                        de: 'Öffnet die Duell-Lobby.',
                        en: 'Opens the duels lobby.',
                        pl: 'Otwiera lobby pojedynków.',
                      })}
                      label={copy({
                        de: 'Lobby öffnen',
                        en: 'Open lobby',
                        pl: 'Otwórz lobby',
                      })}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Live-Duelle',
            en: 'Live duels',
            pl: 'Na żywo w pojedynkach',
          })}
        >
          {duelSpotlight.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Offene öffentliche Duelle werden geladen.',
                en: 'Loading public duels from the lobby.',
                pl: 'Pobieramy publiczne pojedynki z lobby.',
              })}
            </Text>
          ) : duelSpotlight.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelSpotlight.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die öffentlichen Duelle auf der Startseite.',
                  en: 'Refreshes the public duels on the home screen.',
                  pl: 'Odświeża publiczne pojedynki na stronie głównej.',
                })}
                label={copy({
                  de: 'Live-Duelle aktualisieren',
                  en: 'Refresh live duels',
                  pl: 'Odśwież pojedynki',
                })}
                onPress={duelSpotlight.refresh}
              />
            </View>
          ) : duelSpotlight.entries.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Gerade sind keine öffentlichen Duelle aktiv. Öffne die Lobby, um ein neues Match zu starten oder auf den nächsten Gegner zu warten.',
                  en: 'There are no active public duels right now. Open the lobby to start a new match or wait for the next opponent.',
                  pl: 'Teraz nie ma aktywnych publicznych pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {duelSpotlight.entries.map((entry) => {
                const isLiveEntry = entry.status === 'in_progress';
                const primaryHref = isLiveEntry
                  ? createKangurDuelsHref({
                      sessionId: entry.sessionId,
                      spectate: true,
                    })
                  : session.status === 'authenticated'
                    ? createKangurDuelsHref({
                        joinSessionId: entry.sessionId,
                      })
                    : DUELS_ROUTE;
                const primaryHint = isLiveEntry
                  ? copy({
                      de: `Öffnet die Live-Zuschauansicht für ${entry.host.displayName}.`,
                      en: `Opens the live spectator view for ${entry.host.displayName}.`,
                      pl: `Otwiera podgląd na żywo dla meczu ${entry.host.displayName}.`,
                    })
                  : session.status === 'authenticated'
                    ? copy({
                        de: `Tritt dem öffentlichen Duell von ${entry.host.displayName} bei.`,
                        en: `Joins the public duel hosted by ${entry.host.displayName}.`,
                        pl: `Dołącza do publicznego pojedynku gospodarza ${entry.host.displayName}.`,
                      })
                    : copy({
                        de: 'Öffnet die Duell-Lobby.',
                        en: 'Opens the duels lobby.',
                        pl: 'Otwiera lobby pojedynków.',
                      });
                const primaryLabel = isLiveEntry
                  ? copy({
                      de: 'Live ansehen',
                      en: 'Watch live',
                      pl: 'Obserwuj na żywo',
                    })
                  : session.status === 'authenticated'
                    ? copy({
                        de: 'Match beitreten',
                        en: 'Join match',
                        pl: 'Dołącz do meczu',
                      })
                    : copy({
                        de: 'Lobby öffnen',
                        en: 'Open lobby',
                        pl: 'Otwórz lobby',
                      });

                return (
                  <View
                    key={entry.sessionId}
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
                      {entry.host.displayName}
                    </Text>
                    <Text style={{ color: '#475569', lineHeight: 20 }}>
                      {getHomeDuelModeLabel(entry.mode, locale)} •{' '}
                      {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
                      {copy({
                        de: 'Stufe',
                        en: 'level',
                        pl: 'poziom',
                      })}{' '}
                      {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
                    </Text>
                    <Text style={{ color: '#64748b' }}>
                      {copy({
                        de: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                        en: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                        pl: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                      })}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <OutlineLink
                        href={primaryHref}
                        hint={primaryHint}
                        label={primaryLabel}
                      />
                      <OutlineLink
                        href={DUELS_ROUTE}
                        hint={copy({
                          de: 'Öffnet die Duell-Lobby.',
                          en: 'Opens the duels lobby.',
                          pl: 'Otwiera lobby pojedynków.',
                        })}
                        label={copy({
                          de: 'Alle Duelle',
                          en: 'All duels',
                          pl: 'Wszystkie pojedynki',
                        })}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

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
                de: 'Die Schulersitzung und der ergebnisbasierte Trainingsfokus werden wiederhergestellt.',
                en: 'Restoring the learner session and score-based training focus.',
                pl: 'Przywracamy sesję ucznia i fokus treningowy oparty na wynikach.',
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
                    de: 'Es gibt noch keinen synchronisierten Ergebnisverlauf. Starte mit einem Training oder öffne direkt eine Lektion.',
                    en: 'There is no synchronized score history yet. Start with practice or open a lesson directly.',
                    pl: 'Brak jeszcze zsynchronizowanej historii wyników. Zacznij od treningu albo otwórz lekcję bezpośrednio.',
                  })}
                </Text>
              ) : null}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Letzte Ergebnisse',
            en: 'Recent results',
            pl: 'Ostatnie wyniki',
          })}
        >
          {recentResults.isRestoringAuth || recentResults.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Die Ergebnisse des Schulers werden geladen.',
                en: 'Loading learner results.',
                pl: 'Pobieramy wyniki ucznia.',
              })}
            </Text>
          ) : recentResults.error ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {recentResults.error}
            </Text>
          ) : recentResults.results.length === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine synchronisierten mobilen Sitzungen.',
                en: 'There are no synchronized mobile sessions yet.',
                pl: 'Brak jeszcze zsynchronizowanych sesji mobilnych.',
              })}
            </Text>
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
                        en: `Opens score history for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
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
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
