import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { ActionButton, LinkButton } from '../duels/duels-primitives/BaseComponents';
import { formatPracticeResultLabel, formatPracticeSummaryMeta } from './practice-utils';
import { PracticeSyncProofPanel } from './PracticeSyncProofPanel';
import { PracticeDuelsPanel } from './PracticeDuelsPanel';
import { PracticeLessonMasteryPanel } from './PracticeLessonMasteryPanel';
import { PracticeBadgesPanel } from './PracticeBadgesPanel';
import { PracticeResultsPanel } from './PracticeResultsPanel';
import { PracticeAssignmentsPanel } from './PracticeAssignmentsPanel';
import { PracticeLessonCheckpointsPanel } from './PracticeLessonCheckpointsPanel';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { createKangurPlanHref } from '../lessons/lessonHref';
import { getLocalizedKangurMetadataBadgeName } from '../scores/mobileScoreSummary';
export { type PracticeCompletionCardProps } from './completion-card-types';

function CompletionHeader(props: {
  copy: PracticeCompletionCardProps['copy'];
  correctAnswers: number;
  questionsLength: number;
  completion: PracticeCompletionCardProps['completion'];
  locale: PracticeCompletionCardProps['locale'];
}): React.JSX.Element {
  return (
    <>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {props.copy({ de: 'Zusammenfassung', en: 'Summary', pl: 'Podsumowanie' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
        {formatPracticeResultLabel(props.correctAnswers, props.questionsLength, props.locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {formatPracticeSummaryMeta(props.completion, props.locale)}
      </Text>
    </>
  );
}

function SyncPanel(props: {
  scoreSyncState: PracticeCompletionCardProps['scoreSyncState'];
  scoreSyncAppearance: PracticeCompletionCardProps['scoreSyncAppearance'];
  shouldShowSyncProof: boolean;
  copy: PracticeCompletionCardProps['copy'];
  locale: PracticeCompletionCardProps['locale'];
  practiceSyncProof: PracticeCompletionCardProps['practiceSyncProof'];
}): React.JSX.Element {
  return (
    <>
      {props.scoreSyncState !== null && (
        <View style={{ ...(props.scoreSyncAppearance as Record<string, any>), borderRadius: 18, borderWidth: 1, padding: 12 }}>
          <Text style={{ color: props.scoreSyncAppearance?.textColor ?? '#0f172a', fontSize: 13, lineHeight: 18, fontWeight: '600' }}>
            {props.scoreSyncState.message}
          </Text>
        </View>
      )}
      {props.shouldShowSyncProof && (
        <PracticeSyncProofPanel copy={props.copy} locale={props.locale} practiceSyncProof={props.practiceSyncProof} />
      )}
    </>
  );
}

function NewBadgesPanel(props: {
  completion: PracticeCompletionCardProps['completion'];
  copy: PracticeCompletionCardProps['copy'];
  locale: PracticeCompletionCardProps['locale'];
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {props.completion.newBadges.map((badgeId: string) => (
        <View key={badgeId} style={{ borderRadius: 999, borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 7 }}>
          <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
            {props.copy({ de: 'Neues Abzeichen', en: 'New badge', pl: 'Nowa odznaka' })}: {getLocalizedKangurMetadataBadgeName(badgeId, props.locale, badgeId) as string}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CompletionActions(props: {
  locale: PracticeCompletionCardProps['locale'];
  restart: PracticeCompletionCardProps['restart'];
  practiceModeHistoryHref: PracticeCompletionCardProps['practiceModeHistoryHref'];
  completionLessonAction: PracticeCompletionCardProps['completionLessonAction'];
  profileHref: PracticeCompletionCardProps['profileHref'];
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <ActionButton label={translateKangurMobileActionLabel('Train again', props.locale)} onPress={props.restart} tone='primary' />
      <LinkButton href={props.practiceModeHistoryHref} label={translateKangurMobileActionLabel('View mode history', props.locale)} tone='secondary' />
      {props.completionLessonAction}
      <LinkButton href={createKangurPlanHref()} label={translateKangurMobileActionLabel('Open daily plan', props.locale)} tone='secondary' />
      <LinkButton href={props.profileHref} label={translateKangurMobileActionLabel('Back to profile', props.locale)} tone='brand' />
    </View>
  );
}

export function PracticeCompletionCard(props: PracticeCompletionCardProps): React.JSX.Element {
  return (
    <Card>
      <CompletionHeader {...props} />
      <SyncPanel {...props} />
      <NewBadgesPanel {...props} />
      <PracticeDuelsPanel {...props} />
      <PracticeLessonMasteryPanel {...props} />
      <PracticeBadgesPanel {...props} />
      <PracticeResultsPanel {...props} />
      <PracticeAssignmentsPanel {...props} />
      <PracticeLessonCheckpointsPanel {...props} />
      <CompletionActions {...props} />
    </Card>
  );
}
