import React from 'react';
import { Text, View } from 'react-native';

import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { createKangurPlanHref } from '../lessons/lessonHref';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  PRACTICE_COUNT_TONE,
  PRACTICE_KIND_TONE,
  formatPracticeQuestionCountLabel,
} from './practice-utils';

type PracticeCopy = (value: Record<string, string>) => string;

export interface PracticePreparationCardProps {
  copy: PracticeCopy;
  locale: KangurMobileLocale;
  practiceKindChipLabel: string;
  practiceModeHistoryHref: string;
  practiceSyncPreview: { body: string; label: string; tone: Tone };
  preparationLessonAction: React.ReactNode;
  questionsLength: number;
}

export function PracticePreparationCard({
  copy, locale, practiceKindChipLabel, practiceModeHistoryHref, practiceSyncPreview, preparationLessonAction, questionsLength,
}: PracticePreparationCardProps): React.JSX.Element {
  const renderInfo = (): React.JSX.Element => (
    <>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>{copy({ de: 'Trainingsplan', en: 'Session plan', pl: 'Plan sesji' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Zum Start siehst du hier den Umfang der Serie, den Speicherweg und die schnellsten Wege zurück zu Lektionen, Verlauf und Tagesplan.',
          en: 'At the start, this shows the run size, the save path, and the quickest routes back to lessons, history, and the daily plan.',
          pl: 'Na starcie widzisz tutaj rozmiar serii, sposób zapisu oraz najszybsze przejścia do lekcji, historii i planu dnia.',
        })}
      </Text>
    </>
  );

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Vor dem Start', en: 'Before you start', pl: 'Przed startem' })}</Text>
      {renderInfo()}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={formatPracticeQuestionCountLabel(questionsLength, locale)} tone={PRACTICE_COUNT_TONE} />
        <Pill label={practiceKindChipLabel} tone={PRACTICE_KIND_TONE} />
        <Pill label={practiceSyncPreview.label} tone={practiceSyncPreview.tone} />
      </View>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{practiceSyncPreview.body}</Text>
      <View style={{ gap: 10 }}>
        {preparationLessonAction}
        <LinkButton borderRadius={16} centered href={practiceModeHistoryHref} label={translateKangurMobileActionLabel('View mode history', locale)} stretch tone='secondary' verticalPadding={12} />
        <LinkButton borderRadius={16} centered href={createKangurPlanHref()} label={translateKangurMobileActionLabel('Open daily plan', locale)} stretch tone='secondary' verticalPadding={12} />
      </View>
    </Card>
  );
}
