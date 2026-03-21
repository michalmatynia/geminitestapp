import { Link, type Href, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useKangurMobileAuth } from '../src/auth/KangurMobileAuthContext';
import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
} from '../src/home/homeDebugProof';
import { getKangurHomeAuthBoundaryViewModel } from '../src/home/homeAuthBoundary';
import { useKangurMobileRecentResults } from '../src/home/useKangurMobileRecentResults';
import { useKangurMobileTrainingFocus } from '../src/home/useKangurMobileTrainingFocus';
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
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {title}
      </Text>
      {children}
    </View>
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
  label,
  onPress,
}: {
  label: string;
  onPress: () => void | Promise<void>;
}): React.JSX.Element {
  return (
    <Pressable
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
        {formatKangurMobileScoreOperation(operation)}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        Skutecznosc {averageAccuracyPercent}% przez {sessions} sesji.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <OutlineLink href={actionHref} label={actionLabel} />
        {lessonHref ? (
          <OutlineLink href={lessonHref} label='Otworz lekcje' />
        ) : null}
        <OutlineLink
          href={createKangurResultsHref({ operation })}
          label='Historia trybu'
        />
      </View>
    </View>
  );
}

export default function HomeScreen(): React.JSX.Element {
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
  const trainingFocus = useKangurMobileTrainingFocus();
  const authBoundary = getKangurHomeAuthBoundaryViewModel({
    authError,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    supportsLearnerCredentials,
  });
  const debugProofOperation = __DEV__
    ? resolveKangurHomeDebugProofOperation(params.debugProofOperation)
    : null;
  const homeDebugProof = buildKangurHomeDebugProofViewModel({
    isEnabled: recentResults.isEnabled && trainingFocus.isEnabled,
    isLoading: recentResults.isLoading || trainingFocus.isLoading,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: trainingFocus.strongestOperation,
    weakestOperation: trainingFocus.weakestOperation,
  });

  return (
    <SafeAreaView style={{ backgroundColor: '#fffaf2', flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          gap: 16,
          paddingHorizontal: 24,
          paddingVertical: 28,
        }}
      >
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#0f172a', fontSize: 32, fontWeight: '800' }}>
            Kangur mobilnie
          </Text>
          <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
            Mobilna wersja wspolnego flow Kangura. W tym workspace sa juz
            podpiete lekcje, profil, wyniki, plan dnia i ranking.
          </Text>
        </View>

        {__DEV__ && homeDebugProof ? (
          <SectionCard title='Deweloperski podglad synchronizacji strony glownej'>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              Tryb: {homeDebugProof.operationLabel}
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
                      ? 'gotowe'
                      : check.status === 'info'
                        ? 'w toku'
                        : 'brak'}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {check.detail}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title='Sesja i polaczenie'>
          <Text style={{ color: '#0f172a' }}>Status: {authBoundary.statusLabel}</Text>
          <Text style={{ color: '#475569' }}>Uzytkownik: {authBoundary.userLabel}</Text>
          <Text style={{ color: '#475569' }}>Tryb logowania: {authMode}</Text>
          <Text style={{ color: '#475569' }}>
            API: {apiBaseUrl} ({apiBaseUrlSource})
          </Text>
          {authError ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
          ) : null}

          {authBoundary.showLearnerCredentialsForm ? (
            <View style={{ gap: 10 }}>
              <TextInput
                autoCapitalize='none'
                onChangeText={setLoginName}
                placeholder='Login ucznia'
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: 16,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
                value={loginName}
              />
              <TextInput
                autoCapitalize='none'
                onChangeText={setPassword}
                placeholder='Haslo'
                secureTextEntry
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: 16,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
                value={password}
              />
              <PrimaryButton
                label='Zaloguj sesje ucznia'
                onPress={async () => {
                  await signInWithLearnerCredentials(loginName, password);
                }}
              />
            </View>
          ) : session.status === 'authenticated' ? (
            <PrimaryButton label='Wyloguj' onPress={signOut} />
          ) : (
            <PrimaryButton label='Zaloguj sesje demo' onPress={signIn} />
          )}
        </SectionCard>

        <SectionCard title='Nawigacja'>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <OutlineLink href={LESSONS_ROUTE} label='Lekcje' />
            <OutlineLink href={PRACTICE_ROUTE} label='Trening' />
            <OutlineLink href={PLAN_ROUTE} label='Plan dnia' />
            <OutlineLink href={RESULTS_ROUTE} label='Wyniki' />
            <OutlineLink href={PROFILE_ROUTE} label='Profil' />
            <OutlineLink href={LEADERBOARD_ROUTE} label='Ranking' />
          </View>
        </SectionCard>

        <SectionCard title='Fokus treningowy'>
          {trainingFocus.isRestoringAuth || trainingFocus.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              Przywracamy sesje ucznia i fokus treningowy oparty na wynikach.
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
                  actionLabel='Trenuj najslabszy tryb'
                  averageAccuracyPercent={
                    trainingFocus.weakestOperation.averageAccuracyPercent
                  }
                  lessonHref={createKangurLessonHref(
                    trainingFocus.weakestLessonFocus,
                  )}
                  operation={trainingFocus.weakestOperation.operation}
                  sessions={trainingFocus.weakestOperation.sessions}
                  title='Do powtorki'
                />
              ) : null}

              {trainingFocus.strongestOperation ? (
                <FocusCard
                  actionHref={createKangurPracticeHref(
                    trainingFocus.strongestOperation.operation,
                  )}
                  actionLabel='Utrzymaj tempo'
                  averageAccuracyPercent={
                    trainingFocus.strongestOperation.averageAccuracyPercent
                  }
                  lessonHref={createKangurLessonHref(
                    trainingFocus.strongestLessonFocus,
                  )}
                  operation={trainingFocus.strongestOperation.operation}
                  sessions={trainingFocus.strongestOperation.sessions}
                  title='Najmocniejszy tryb'
                />
              ) : null}

              {!trainingFocus.weakestOperation &&
              !trainingFocus.strongestOperation ? (
                <Text style={{ color: '#475569', lineHeight: 20 }}>
                  Brak jeszcze zsynchronizowanej historii wynikow. Zacznij od
                  treningu albo otworz lekcje bezposrednio.
                </Text>
              ) : null}
            </View>
          )}
        </SectionCard>

        <SectionCard title='Ostatnie wyniki'>
          {recentResults.isRestoringAuth || recentResults.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              Pobieramy wyniki ucznia.
            </Text>
          ) : recentResults.error ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {recentResults.error}
            </Text>
          ) : recentResults.results.length === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              Brak jeszcze zsynchronizowanych sesji mobilnych.
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
                    {formatKangurMobileScoreOperation(result.operation)}
                  </Text>
                  <Text style={{ color: '#475569' }}>
                    {result.correct_answers}/{result.total_questions} poprawnych
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <OutlineLink
                      href={createKangurPracticeHref(result.operation)}
                      label='Trenuj ponownie'
                    />
                    <OutlineLink
                      href={createKangurResultsHref({ operation: result.operation })}
                      label='Historia trybu'
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
