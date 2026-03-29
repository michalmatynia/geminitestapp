import {
  getLocalizedKangurMetadataBadgeName,
  type KangurPracticeCompletionResult,
} from '@kangur/core';
import { Text, View } from 'react-native';

import type { KangurMobileLocale, useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import type { PracticeScoreSyncState } from './practiceScoreSyncState';
import {
  PRACTICE_COUNT_TONE,
  PRACTICE_KIND_TONE,
  formatPracticeQuestionCountLabel,
  formatPracticeResultLabel,
  formatPracticeSummaryMeta,
} from './practice-utils';
import type { useKangurMobilePracticeAssignments } from './useKangurMobilePracticeAssignments';
import type { useKangurMobilePracticeBadges } from './useKangurMobilePracticeBadges';
import type { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';
import type { useKangurMobilePracticeLessonMastery } from './useKangurMobilePracticeLessonMastery';
import type { useKangurMobilePracticeRecentResults } from './useKangurMobilePracticeRecentResults';
import type { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';
import {
  PracticeAssignmentsPanel,
  PracticeBadgesPanel,
  PracticeDuelsPanel,
  PracticeLessonCheckpointsPanel,
  PracticeLessonMasteryPanel,
  PracticeResultsPanel,
  PracticeSyncProofPanel,
} from './practice-completion-panels';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeLessonCheckpointsState = ReturnType<typeof useKangurMobileLessonCheckpoints>;
type PracticeLessonMasteryState = ReturnType<typeof useKangurMobilePracticeLessonMastery>;
type PracticeBadgesState = ReturnType<typeof useKangurMobilePracticeBadges>;
type PracticeAssignmentsState = ReturnType<typeof useKangurMobilePracticeAssignments>;
type PracticeRecentResultsState = ReturnType<typeof useKangurMobilePracticeRecentResults>;
type PracticeDuelsState = ReturnType<typeof useKangurMobilePracticeDuels>;
type PracticeSyncProofState = ReturnType<typeof useKangurPracticeSyncProof>;

export function PracticePreparationCard({
  copy,
  locale,
  practiceKindChipLabel,
  practiceModeHistoryHref,
  practiceSyncPreview,
  preparationLessonAction,
  questionsLength,
}: {
  copy: PracticeCopy;
  locale: KangurMobileLocale;
  practiceKindChipLabel: string;
  practiceModeHistoryHref: string;
  practiceSyncPreview: {
    body: string;
    label: string;
    tone: Tone;
  };
  preparationLessonAction: React.ReactNode;
  questionsLength: number;
}): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Vor dem Start',
          en: 'Before you start',
          pl: 'Przed startem',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
        {copy({
          de: 'Trainingsplan',
          en: 'Session plan',
          pl: 'Plan sesji',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Zum Start siehst du hier den Umfang der Serie, den Speicherweg und die schnellsten Wege zurück zu Lektionen, Verlauf und Tagesplan.',
          en: 'At the start, this shows the run size, the save path, and the quickest routes back to lessons, history, and the daily plan.',
          pl: 'Na starcie widzisz tutaj rozmiar serii, sposób zapisu oraz najszybsze przejścia do lekcji, historii i planu dnia.',
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={formatPracticeQuestionCountLabel(questionsLength, locale)}
          tone={PRACTICE_COUNT_TONE}
        />
        <Pill label={practiceKindChipLabel} tone={PRACTICE_KIND_TONE} />
        <Pill label={practiceSyncPreview.label} tone={practiceSyncPreview.tone} />
      </View>

      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
        {practiceSyncPreview.body}
      </Text>

      <View style={{ gap: 10 }}>
        {preparationLessonAction}
        <LinkButton
          borderRadius={16}
          centered
          href={practiceModeHistoryHref}
          label={translateKangurMobileActionLabel('View mode history', locale)}
          stretch
          tone='secondary'
          verticalPadding={12}
        />
        <LinkButton
          borderRadius={16}
          centered
          href={createKangurPlanHref()}
          label={translateKangurMobileActionLabel('Open daily plan', locale)}
          stretch
          tone='secondary'
          verticalPadding={12}
        />
      </View>
    </Card>
  );
}

export function PracticeCompletionCard({
  completion,
  completionLessonAction,
  copy,
  correctAnswers,
  lessonCheckpoints,
  lessonFocusSummary,
  lessonMastery,
  locale,
  localeTag,
  openDuelSession,
  practiceAssignments,
  practiceBadges,
  practiceDuels,
  practiceModeHistoryHref,
  practiceRecentResults,
  practiceSyncProof,
  profileHref,
  questionsLength,
  restart,
  resultsHistoryHref,
  scoreSyncAppearance,
  scoreSyncState,
  shouldShowSyncProof,
  strongestLesson,
  weakestLesson,
}: {
  completion: KangurPracticeCompletionResult;
  completionLessonAction: React.ReactNode;
  copy: PracticeCopy;
  correctAnswers: number;
  lessonCheckpoints: PracticeLessonCheckpointsState;
  lessonFocusSummary: string | null;
  lessonMastery: PracticeLessonMasteryState;
  locale: KangurMobileLocale;
  localeTag: string;
  openDuelSession: (sessionId: string) => void;
  practiceAssignments: PracticeAssignmentsState;
  practiceBadges: PracticeBadgesState;
  practiceDuels: PracticeDuelsState;
  practiceModeHistoryHref: string;
  practiceRecentResults: PracticeRecentResultsState;
  practiceSyncProof: PracticeSyncProofState;
  profileHref: string;
  questionsLength: number;
  restart: () => void;
  resultsHistoryHref: string;
  scoreSyncAppearance: Tone | null;
  scoreSyncState: PracticeScoreSyncState | null;
  shouldShowSyncProof: boolean;
  strongestLesson: PracticeLessonMasteryState['strongest'][number] | null;
  weakestLesson: PracticeLessonMasteryState['weakest'][number] | null;
}): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Zusammenfassung',
          en: 'Summary',
          pl: 'Podsumowanie',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
        {formatPracticeResultLabel(correctAnswers, questionsLength, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {formatPracticeSummaryMeta(completion, locale)}
      </Text>
      {scoreSyncState ? (
        <View
          style={{
            ...scoreSyncAppearance,
            borderRadius: 18,
            borderWidth: 1,
            padding: 12,
          }}
        >
          <Text
            style={{
              color: scoreSyncAppearance?.textColor ?? '#0f172a',
              fontSize: 13,
              lineHeight: 18,
              fontWeight: '600',
            }}
          >
            {scoreSyncState.message}
          </Text>
        </View>
      ) : null}
      {shouldShowSyncProof ? (
        <PracticeSyncProofPanel
          copy={copy}
          locale={locale}
          practiceSyncProof={practiceSyncProof}
        />
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {completion.newBadges.map((badgeId) => (
          <View
            key={badgeId}
            style={{
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
                de: 'Neues Abzeichen',
                en: 'New badge',
                pl: 'Nowa odznaka',
              })}
              : {getLocalizedKangurMetadataBadgeName(badgeId, locale, badgeId)}
            </Text>
          </View>
        ))}
      </View>

      <PracticeDuelsPanel
        copy={copy}
        locale={locale}
        localeTag={localeTag}
        openDuelSession={openDuelSession}
        practiceDuels={practiceDuels}
      />

      <PracticeLessonMasteryPanel
        copy={copy}
        lessonFocusSummary={lessonFocusSummary}
        lessonMastery={lessonMastery}
        strongestLesson={strongestLesson}
        weakestLesson={weakestLesson}
      />

      <PracticeBadgesPanel
        copy={copy}
        practiceBadges={practiceBadges}
        profileHref={profileHref}
      />

      <PracticeResultsPanel
        copy={copy}
        practiceRecentResults={practiceRecentResults}
        resultsHistoryHref={resultsHistoryHref}
      />

      <PracticeAssignmentsPanel
        copy={copy}
        practiceAssignments={practiceAssignments}
      />

      <PracticeLessonCheckpointsPanel
        copy={copy}
        lessonCheckpoints={lessonCheckpoints}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <ActionButton
          label={translateKangurMobileActionLabel('Train again', locale)}
          onPress={restart}
          tone='primary'
        />
        <LinkButton
          href={practiceModeHistoryHref}
          label={translateKangurMobileActionLabel('View mode history', locale)}
          tone='secondary'
        />
        {completionLessonAction}
        <LinkButton
          href={createKangurPlanHref()}
          label={translateKangurMobileActionLabel('Open daily plan', locale)}
          tone='secondary'
        />
        <LinkButton
          href={profileHref}
          label={translateKangurMobileActionLabel('Back to profile', locale)}
          tone='brand'
        />
      </View>
    </Card>
  );
}
