import type { KangurAssignmentPlan } from '@kangur/core';
import type { KangurScore } from '@kangur/contracts';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import { useKangurMobileDailyPlan } from './useKangurMobileDailyPlan';

function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: '#ffffff',
        padding: 18,
        gap: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function LinkButton({
  href,
  label,
  tone = 'secondary',
}: {
  href: Href;
  label: string;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole='button'
        style={{
          borderRadius: 999,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: isPrimary ? 'transparent' : '#cbd5e1',
          backgroundColor: isPrimary ? '#0f172a' : '#ffffff',
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: isPrimary ? '#ffffff' : '#0f172a',
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function FocusCard({
  accentColor,
  description,
  historyHref,
  lessonHref,
  operation,
  practiceHref,
  title,
}: {
  accentColor: string;
  description: string;
  historyHref: Href;
  lessonHref: Href | null;
  operation: {
    averageAccuracyPercent: number;
    operation: string;
    sessions: number;
  };
  practiceHref: Href;
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
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {formatKangurMobileScoreOperation(operation.operation)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={`Avg ${operation.averageAccuracyPercent}%`}
          tone={{
            backgroundColor: accentColor === '#b91c1c' ? '#fef2f2' : '#ecfdf5',
            borderColor: accentColor === '#b91c1c' ? '#fecaca' : '#a7f3d0',
            textColor: accentColor,
          }}
        />
        <Pill
          label={`Sessions ${operation.sessions}`}
          tone={{
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton href={practiceHref} label='Practice now' tone='primary' />
        {lessonHref ? <LinkButton href={lessonHref} label='Open lesson' /> : null}
        <LinkButton href={historyHref} label='Mode history' />
      </View>
    </View>
  );
}

const getPriorityTone = (
  priority: KangurAssignmentPlan['priority'],
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
  if (priority === 'high') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (priority === 'medium') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
};

const getPriorityLabel = (priority: KangurAssignmentPlan['priority']): string => {
  if (priority === 'high') {
    return 'Priorytet wysoki';
  }
  if (priority === 'medium') {
    return 'Priorytet sredni';
  }

  return 'Priorytet niski';
};

function AssignmentRow({
  assignment,
  href,
}: {
  assignment: KangurAssignmentPlan;
  href: Href | null;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Pill label={getPriorityLabel(assignment.priority)} tone={getPriorityTone(assignment.priority)} />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        Cel: {assignment.target}
      </Text>
      {href ? (
        <LinkButton href={href} label={assignment.action.label} tone='primary' />
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: '#e2e8f0',
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '700' }}>
            {assignment.action.label} · soon
          </Text>
        </View>
      )}
    </View>
  );
}

function RecentResultRow({
  historyHref,
  lessonHref,
  practiceHref,
  result,
}: {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
}): React.JSX.Element {
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(result);

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {formatKangurMobileScoreOperation(result.operation)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {formatKangurMobileScoreDateTime(result.created_date)}
          </Text>
        </View>
        <Pill
          label={`${result.correct_answers}/${result.total_questions}`}
          tone={{
            backgroundColor:
              accuracyPercent >= 80 ? '#ecfdf5' : accuracyPercent >= 60 ? '#fffbeb' : '#fef2f2',
            borderColor:
              accuracyPercent >= 80 ? '#a7f3d0' : accuracyPercent >= 60 ? '#fde68a' : '#fecaca',
            textColor:
              accuracyPercent >= 80 ? '#047857' : accuracyPercent >= 60 ? '#b45309' : '#b91c1c',
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton href={practiceHref} label='Train again' tone='primary' />
        {lessonHref ? <LinkButton href={lessonHref} label='Open lesson' /> : null}
        <LinkButton href={historyHref} label='Mode history' />
      </View>
    </View>
  );
}

export function KangurDailyPlanScreen(): React.JSX.Element {
  const {
    assignmentItems,
    authError,
    displayName,
    isAuthenticated,
    isLoadingAuth,
    isLoading,
    recentResultItems,
    refresh,
    scoreError,
    signIn,
    strongestFocus,
    supportsLearnerCredentials,
    weakestFocus,
  } = useKangurMobileDailyPlan();

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
          <Link href='/' asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>Back</Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              Daily plan
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              Jedno miejsce na dzis
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {isLoadingAuth && !isAuthenticated
                ? 'Przywracamy sesje ucznia oraz ostatni plan oparty na wynikach i postepie.'
                : `Skupiony plan nauki dla ${displayName}, zlozony z treningu, lekcji i najwazniejszych wynikow.`}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <LinkButton href='/practice?operation=mixed' label='Start mixed practice' tone='primary' />
              <Pressable
                accessibilityRole='button'
                onPress={() => {
                  void refresh();
                }}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  backgroundColor: '#ffffff',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#0f172a', fontWeight: '700' }}>Refresh plan</Text>
              </Pressable>
            </View>

            {isLoadingAuth && !isAuthenticated ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Przywracamy sesje ucznia. Gdy bedzie gotowa, plan pobierze
                zsynchronizowane wyniki i wskazowki treningowe.
              </Text>
            ) : !isAuthenticated ? (
              supportsLearnerCredentials ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    Zaloguj ucznia na ekranie glownym, aby pobrac wyniki, fokus
                    treningowy i zsynchronizowana historie.
                  </Text>
                  <LinkButton href='/' label='Open auth screen' />
                </View>
              ) : (
                <Pressable
                  accessibilityRole='button'
                  onPress={() => {
                    void signIn();
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 999,
                    backgroundColor: '#1d4ed8',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Sign in demo session</Text>
                </Pressable>
              )
            ) : null}

            {authError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
            ) : null}
          </Card>

          <Card>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
              Training focus
            </Text>
            {isLoading ? (
              <Text style={{ color: '#475569' }}>Loading score-based focus...</Text>
            ) : scoreError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
            ) : !isAuthenticated ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                Sign in to unlock weakest and strongest mode guidance.
              </Text>
            ) : !weakestFocus && !strongestFocus ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                Finish one synced practice run to build your first training focus.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {weakestFocus ? (
                  <FocusCard
                    accentColor='#b91c1c'
                    description='This is the weakest synced mode right now. Start with a short targeted session, then revisit the matching lesson if needed.'
                    historyHref={weakestFocus.historyHref}
                    lessonHref={weakestFocus.lessonHref}
                    operation={weakestFocus.operation}
                    practiceHref={weakestFocus.practiceHref}
                    title='Weakest mode'
                  />
                ) : null}
                {strongestFocus ? (
                  <FocusCard
                    accentColor='#047857'
                    description='This mode is currently the most stable. Use it for a confidence boost or quick momentum session.'
                    historyHref={strongestFocus.historyHref}
                    lessonHref={strongestFocus.lessonHref}
                    operation={strongestFocus.operation}
                    practiceHref={strongestFocus.practiceHref}
                    title='Strongest mode'
                  />
                ) : null}
              </View>
            )}
          </Card>

          <Card>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
              Assignments
            </Text>
            {assignmentItems.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                No local assignments yet. Open lessons or practice once to generate
                the first next-step plan.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {assignmentItems.map(({ assignment, href }) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    href={href}
                  />
                ))}
              </View>
            )}
          </Card>

          <Card>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                Recent results
              </Text>
              <LinkButton href={createKangurResultsHref()} label='Open history' />
            </View>
            {isLoading ? (
              <Text style={{ color: '#475569' }}>Loading recent results...</Text>
            ) : !isAuthenticated ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                Sign in with a learner session to see synced results here.
              </Text>
            ) : scoreError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
            ) : recentResultItems.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                No synced results yet. Finish one practice run to populate this
                section.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {recentResultItems.map(({ result, historyHref, lessonHref, practiceHref }) => (
                  <RecentResultRow
                    key={result.id}
                    result={result}
                    historyHref={historyHref}
                    lessonHref={lessonHref}
                    practiceHref={practiceHref}
                  />
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
