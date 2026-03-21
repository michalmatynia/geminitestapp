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
const DUELS_ROUTE = createKangurDuelsHref();

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
        Skuteczność {averageAccuracyPercent}% przez {sessions} sesji.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <OutlineLink
          href={actionHref}
          hint={`Otwiera trening dla trybu ${formatKangurMobileScoreOperation(operation)}.`}
          label={`${actionLabel}: ${formatKangurMobileScoreOperation(operation)}`}
        />
        {lessonHref ? (
          <OutlineLink
            href={lessonHref}
            hint={`Otwiera lekcję dla trybu ${formatKangurMobileScoreOperation(operation)}.`}
            label={`Otwórz lekcję: ${formatKangurMobileScoreOperation(operation)}`}
          />
        ) : null}
        <OutlineLink
          href={createKangurResultsHref({ operation })}
          hint={`Otwiera historię wyników dla trybu ${formatKangurMobileScoreOperation(operation)}.`}
          label={`Historia trybu: ${formatKangurMobileScoreOperation(operation)}`}
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
            Kangur mobilnie
          </Text>
          <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
            Mobilna wersja wspólnej ścieżki nauki Kangura. W tej aplikacji są już
            podpięte lekcje, profil, wyniki, plan dnia, ranking i pojedynki.
          </Text>
        </View>

        {__DEV__ && homeDebugProof ? (
          <SectionCard title='Deweloperski podgląd synchronizacji strony głównej'>
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

        <SectionCard title='Sesja i połączenie'>
          <Text accessibilityLiveRegion='polite' style={{ color: '#0f172a' }}>
            Status: {authBoundary.statusLabel}
          </Text>
          <Text style={{ color: '#475569' }}>Użytkownik: {authBoundary.userLabel}</Text>
          <Text style={{ color: '#475569' }}>Tryb logowania: {authMode}</Text>
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
                hint='Wpisz login ucznia do sesji mobilnej.'
                label='Login ucznia'
                onChangeText={setLoginName}
                placeholder='Login ucznia'
                textContentType='username'
                value={loginName}
              />
              <LabeledTextField
                autoCapitalize='none'
                hint='Wpisz hasło ucznia do sesji mobilnej.'
                label='Hasło'
                onChangeText={setPassword}
                placeholder='Hasło'
                secureTextEntry
                textContentType='password'
                value={password}
              />
              <PrimaryButton
                hint='Loguje do sesji ucznia przy użyciu wpisanych danych.'
                label='Zaloguj sesję ucznia'
                onPress={async () => {
                  await signInWithLearnerCredentials(loginName, password);
                }}
              />
            </View>
          ) : session.status === 'authenticated' ? (
            <PrimaryButton
              hint='Wylogowuje aktualną sesję ucznia z aplikacji mobilnej.'
              label='Wyloguj'
              onPress={signOut}
            />
          ) : (
            <PrimaryButton
              hint='Loguje przykładową sesję demo w aplikacji mobilnej.'
              label='Zaloguj sesję demo'
              onPress={signIn}
            />
          )}
        </SectionCard>

        <SectionCard title='Nawigacja'>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <OutlineLink
              href={LESSONS_ROUTE}
              hint='Otwiera ekran lekcji.'
              label='Lekcje'
            />
            <OutlineLink
              href={PRACTICE_ROUTE}
              hint='Otwiera ekran treningu.'
              label='Trening'
            />
            <OutlineLink
              href={PLAN_ROUTE}
              hint='Otwiera plan dnia ucznia.'
              label='Plan dnia'
            />
            <OutlineLink
              href={RESULTS_ROUTE}
              hint='Otwiera ekran wyników i historii sesji.'
              label='Wyniki'
            />
            <OutlineLink
              href={PROFILE_ROUTE}
              hint='Otwiera profil ucznia.'
              label='Profil'
            />
            <OutlineLink
              href={LEADERBOARD_ROUTE}
              hint='Otwiera ranking uczniów.'
              label='Ranking'
            />
            <OutlineLink
              href={DUELS_ROUTE}
              hint='Otwiera lobby pojedynków.'
              label='Pojedynki'
            />
          </View>
        </SectionCard>

        <SectionCard title='Fokus treningowy'>
          {trainingFocus.isRestoringAuth || trainingFocus.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              Przywracamy sesję ucznia i fokus treningowy oparty na wynikach.
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
                  actionLabel='Trenuj najsłabszy tryb'
                  averageAccuracyPercent={
                    trainingFocus.weakestOperation.averageAccuracyPercent
                  }
                  lessonHref={createKangurLessonHref(
                    trainingFocus.weakestLessonFocus,
                  )}
                  operation={trainingFocus.weakestOperation.operation}
                  sessions={trainingFocus.weakestOperation.sessions}
                  title='Do powtórki'
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
                  Brak jeszcze zsynchronizowanej historii wyników. Zacznij od
                  treningu albo otwórz lekcję bezpośrednio.
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
                      hint={`Uruchamia ponowny trening dla trybu ${formatKangurMobileScoreOperation(result.operation)}.`}
                      label={`Trenuj ponownie: ${formatKangurMobileScoreOperation(result.operation)}`}
                    />
                    <OutlineLink
                      href={createKangurResultsHref({ operation: result.operation })}
                      hint={`Otwiera historię wyników dla trybu ${formatKangurMobileScoreOperation(result.operation)}.`}
                      label={`Historia trybu: ${formatKangurMobileScoreOperation(result.operation)}`}
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
