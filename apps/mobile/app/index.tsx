import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { generateQuestions } from '@kangur/core';
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
import { formatKangurMobileScoreOperation } from '../src/scores/mobileScoreSummary';
import { createKangurResultsHref } from '../src/scores/resultsHref';

const SHARED_PACKAGES = [
  '@kangur/contracts',
  '@kangur/core',
  '@kangur/api-client',
  '@kangur/platform',
] as const;

const NEXT_CHECKPOINTS = [
  'Validate the learner-session flow on a real iOS or Android runtime.',
  'Expand the mobile practice loop with the next non-canvas modes.',
  'Keep canvas-based games out of scope until the drawing spike is validated.',
] as const;

const sampleQuestion = generateQuestions('addition', 'easy', 1)[0];
const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = '/results' as Href;

const formatRecentResultOperation = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatRecentResultDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: '#ffffff',
        padding: 20,
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      <Text
        style={{
          marginBottom: 12,
          fontSize: 18,
          fontWeight: '700',
          color: '#0f172a',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function FocusCard({
  accentColor,
  actionHref,
  actionLabel,
  children,
  lessonHref,
  lessonLabel,
  secondaryHref,
  secondaryLabel,
  tertiaryHref,
  tertiaryLabel,
  title,
}: {
  accentColor: string;
  actionHref: Href;
  actionLabel: string;
  children: React.ReactNode;
  lessonHref?: Href;
  lessonLabel?: string;
  secondaryHref?: Href;
  secondaryLabel?: string;
  tertiaryHref?: Href;
  tertiaryLabel?: string;
  title: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      {children}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={actionHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              borderRadius: 999,
              backgroundColor: accentColor,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>{actionLabel}</Text>
          </Pressable>
        </Link>

        {lessonHref && lessonLabel ? (
          <Link href={lessonHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {lessonLabel}
              </Text>
            </Pressable>
          </Link>
        ) : null}

        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {secondaryLabel}
              </Text>
            </Pressable>
          </Link>
        ) : null}

        {tertiaryHref && tertiaryLabel ? (
          <Link href={tertiaryHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {tertiaryLabel}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    debugProofOperation?: string | string[];
  }>();
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
  const debugProofOperation = __DEV__
    ? resolveKangurHomeDebugProofOperation(params.debugProofOperation)
    : null;
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const authBoundary = getKangurHomeAuthBoundaryViewModel({
    authError,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    supportsLearnerCredentials,
  });
  const authActionLabel =
    session.status === 'authenticated'
      ? supportsLearnerCredentials
        ? 'Sign out learner session'
        : 'Sign out demo session'
      : 'Sign in demo session';
  const homeDebugProof = buildKangurHomeDebugProofViewModel({
    isEnabled: recentResults.isEnabled && trainingFocus.isEnabled,
    isLoading: recentResults.isLoading || trainingFocus.isLoading,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: trainingFocus.strongestOperation,
    weakestOperation: trainingFocus.weakestOperation,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 28,
        }}
      >
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              marginBottom: 10,
              fontSize: 32,
              fontWeight: '800',
              color: '#0f172a',
            }}
          >
            Kangur Mobile
          </Text>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 24,
              color: '#475569',
            }}
          >
            This shell proves the monorepo direction: Expo Router is wired,
            shared packages resolve, and the mobile runtime already knows where
            to talk to the Kangur API.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          {developerAutoSignInEnabled ? (
            <SectionCard title='Developer auth diagnostics'>
              <Text style={{ marginBottom: 8, color: '#0f172a' }}>
                Auto sign-in: {authBoundary.developerAutoSignInLabel}
              </Text>
              {authError ? (
                <Text style={{ marginBottom: 8, color: '#b91c1c', lineHeight: 20 }}>
                  {authError}
                </Text>
              ) : null}
              <Text style={{ marginBottom: 8, color: '#475569' }}>
                Session: {session.status}
              </Text>
              <Text style={{ color: '#475569' }}>
                Source: {session.source}
              </Text>
            </SectionCard>
          ) : null}

          {__DEV__ && homeDebugProof ? (
            <SectionCard title='Developer home sync proof'>
              <Text style={{ marginBottom: 10, color: '#0f172a', fontWeight: '700' }}>
                Operation: {homeDebugProof.operationLabel}
              </Text>
              <View style={{ gap: 10 }}>
                {homeDebugProof.checks.map((check) => (
                  <View
                    key={check.label}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor:
                        check.status === 'ready'
                          ? '#86efac'
                          : check.status === 'info'
                            ? '#93c5fd'
                            : '#fca5a5',
                      backgroundColor:
                        check.status === 'ready'
                          ? '#f0fdf4'
                          : check.status === 'info'
                            ? '#eff6ff'
                            : '#fef2f2',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        marginBottom: 4,
                        color:
                          check.status === 'ready'
                            ? '#166534'
                            : check.status === 'info'
                              ? '#1d4ed8'
                              : '#b91c1c',
                        fontWeight: '800',
                      }}
                    >
                      {check.label}: {check.status}
                    </Text>
                    <Text
                      style={{
                        color:
                          check.status === 'ready'
                            ? '#166534'
                            : check.status === 'info'
                              ? '#1e3a8a'
                              : '#991b1b',
                        lineHeight: 20,
                      }}
                    >
                      {check.detail}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          ) : null}

          <SectionCard title='API runtime'>
            <Text style={{ marginBottom: 8, color: '#0f172a' }}>
              Base URL: {apiBaseUrl}
            </Text>
            <Text style={{ color: '#475569' }}>
              Source: {apiBaseUrlSource}
            </Text>
          </SectionCard>

          <SectionCard title='Auth boundary'>
            <Text style={{ marginBottom: 8, color: '#0f172a' }}>
              Status: {authBoundary.statusLabel}
            </Text>
            <Text style={{ marginBottom: 8, color: '#475569' }}>
              Source: {session.source}
            </Text>
            <Text style={{ marginBottom: 8, color: '#475569' }}>
              Mode: {authMode}
            </Text>
            <Text style={{ marginBottom: 12, color: '#475569' }}>
              User: {authBoundary.userLabel}
            </Text>
            {authBoundary.isRestoringLearnerSession ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  Przywracamy zapisany learner session zanim pokazemy formularz
                  logowania lub zsynchronizowane dane ucznia.
                </Text>
              </View>
            ) : authBoundary.showLearnerCredentialsForm ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  Tryb learner-session korzysta z backendowego logowania ucznia przez
                  `/api/kangur/auth/learner-signin`.
                </Text>
                <TextInput
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={setLoginName}
                  placeholder='Learner login'
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    backgroundColor: '#f8fafc',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: '#0f172a',
                  }}
                  value={loginName}
                />
                <TextInput
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder='Password'
                  secureTextEntry
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    backgroundColor: '#f8fafc',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: '#0f172a',
                  }}
                  value={password}
                />
                <Pressable
                  accessibilityRole='button'
                  onPress={() => {
                    void signInWithLearnerCredentials(loginName, password);
                  }}
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Sign in learner session
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole='button'
                onPress={() => {
                  void (session.status === 'authenticated' ? signOut() : signIn());
                }}
                style={{
                  borderRadius: 999,
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {authActionLabel}
                </Text>
              </Pressable>
            )}
            {authError ? (
              <Text style={{ marginTop: 10, color: '#b91c1c', lineHeight: 20 }}>
                {authError}
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard title='Shared package proof'>
            <Text style={{ marginBottom: 10, color: '#0f172a' }}>
              Sample generated question: {sampleQuestion?.question ?? 'Unavailable'}
            </Text>
            <Text style={{ color: '#475569' }}>
              This screen is already consuming logic from the shared Kangur core
              package.
            </Text>
            <View style={{ marginTop: 14 }}>
              {SHARED_PACKAGES.map((pkg) => (
                <Text key={pkg} style={{ marginBottom: 6, color: '#0f172a' }}>
                  - {pkg}
                </Text>
              ))}
            </View>
          </SectionCard>

          <SectionCard title='Mobile routes'>
            <Text style={{ marginBottom: 12, color: '#475569' }}>
              The first real feature slice is live behind a dedicated Expo route.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Link href='/leaderboard' asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#1d4ed8',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Open leaderboard
                  </Text>
                </Pressable>
              </Link>

              <Link href='/profile' asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Open profile
                  </Text>
                </Pressable>
              </Link>

              <Link href='/lessons' asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#ea580c',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Open lessons
                  </Text>
                </Pressable>
              </Link>

              <Link href='/practice?operation=mixed' asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#0f766e',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Open practice
                  </Text>
                </Pressable>
              </Link>

              <Link href={RESULTS_ROUTE} asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#7c3aed',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Open results
                  </Text>
                </Pressable>
              </Link>

              <Link href={PLAN_ROUTE} asChild>
                <Pressable
                  accessibilityRole='button'
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#be185d',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Open daily plan
                  </Text>
                </Pressable>
              </Link>
            </View>
          </SectionCard>

          <SectionCard title='Recent results'>
            {recentResults.isLoading ? (
              <Text style={{ color: '#475569' }}>
                Restoring learner session and recent results...
              </Text>
            ) : !recentResults.isEnabled ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                Sign in with a learner session to see recent API-backed practice
                results here.
              </Text>
            ) : recentResults.error ? (
              <Text style={{ color: '#b91c1c', lineHeight: 22 }}>
                {recentResults.error}
              </Text>
            ) : recentResults.results.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                No synced results yet. Finish one practice run to populate this
                summary.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {recentResults.results.map((result) => (
                  <Link
                    key={result.id}
                    href={createKangurResultsHref({
                      operation: result.operation,
                    })}
                    asChild
                  >
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#f8fafc',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <Text
                        style={{
                          marginBottom: 4,
                          color: '#0f172a',
                          fontWeight: '700',
                        }}
                      >
                        {formatRecentResultOperation(result.operation)}
                      </Text>
                      <Text style={{ color: '#475569', lineHeight: 20 }}>
                        {result.correct_answers}/{result.total_questions} correct in{' '}
                        {formatRecentResultDate(result.created_date)}
                      </Text>
                    </Pressable>
                  </Link>
                ))}

                <Link href={RESULTS_ROUTE} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      backgroundColor: '#f1f5f9',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      View full history
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </SectionCard>

          <SectionCard title='Training focus'>
            {trainingFocus.isLoading ? (
              <Text style={{ color: '#475569' }}>
                Restoring learner session and preparing your next practice target...
              </Text>
            ) : !trainingFocus.isEnabled ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                Sign in with a learner session to unlock score-based practice suggestions.
              </Text>
            ) : trainingFocus.error ? (
              <Text style={{ color: '#b91c1c', lineHeight: 22 }}>
                {trainingFocus.error}
              </Text>
            ) : !trainingFocus.strongestOperation ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                Finish a few synced sessions to unlock operation-level guidance.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {trainingFocus.weakestOperation ? (
                  <FocusCard
                    accentColor='#b45309'
                    actionHref={createKangurPracticeHref(
                      trainingFocus.weakestOperation.operation,
                    )}
                    actionLabel='Practice weakest mode'
                    lessonHref={trainingFocus.weakestLessonFocus
                      ? createKangurLessonHref(trainingFocus.weakestLessonFocus)
                      : undefined}
                    lessonLabel={
                      trainingFocus.weakestLessonFocus
                        ? 'Open matching lesson'
                        : undefined
                    }
                    secondaryHref={createKangurResultsHref({
                      operation: trainingFocus.weakestOperation.operation,
                    })}
                    secondaryLabel='View mode history'
                    title='Next best practice'
                  >
                    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                      {formatKangurMobileScoreOperation(
                        trainingFocus.weakestOperation.operation,
                      )}
                    </Text>
                    <Text style={{ color: '#475569', lineHeight: 20 }}>
                      Average accuracy {trainingFocus.weakestOperation.averageAccuracyPercent}% across{' '}
                      {trainingFocus.weakestOperation.sessions} synced session
                      {trainingFocus.weakestOperation.sessions === 1 ? '' : 's'}.
                    </Text>
                  </FocusCard>
                ) : null}

                <FocusCard
                  accentColor='#047857'
                  actionHref={createKangurPracticeHref(
                    trainingFocus.strongestOperation.operation,
                  )}
                  actionLabel='Keep momentum'
                  lessonHref={trainingFocus.strongestLessonFocus
                    ? createKangurLessonHref(trainingFocus.strongestLessonFocus)
                    : undefined}
                  lessonLabel={
                    trainingFocus.strongestLessonFocus
                      ? 'Open matching lesson'
                      : undefined
                  }
                  secondaryHref={createKangurResultsHref({
                    operation: trainingFocus.strongestOperation.operation,
                  })}
                  secondaryLabel='Review best mode'
                  title='Strongest mode'
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {formatKangurMobileScoreOperation(
                      trainingFocus.strongestOperation.operation,
                    )}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    Average accuracy {trainingFocus.strongestOperation.averageAccuracyPercent}% with a best
                    session of {trainingFocus.strongestOperation.bestAccuracyPercent}%.
                  </Text>
                </FocusCard>
              </View>
            )}
          </SectionCard>

          <SectionCard title='Next checkpoints'>
            {NEXT_CHECKPOINTS.map((item) => (
              <Text
                key={item}
                style={{ marginBottom: 8, color: '#0f172a', lineHeight: 22 }}
              >
                - {item}
              </Text>
            ))}
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
