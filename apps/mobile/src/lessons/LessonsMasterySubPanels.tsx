import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobilePill as Pill } from '../shared/KangurMobileUi';
import { LinkButton } from './duels-primitives';
import { LessonMasteryRow } from './practice-primitives';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { type UseKangurMobileLessonsLessonMasteryResult } from './useKangurMobileLessonsLessonMastery';

type LessonsCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

export function MasteryStatsPanel({ copy, lessonMastery }: { copy: LessonsCopy; lessonMastery: UseKangurMobileLessonsLessonMasteryResult }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'column', gap: 8, marginTop: 12 }}>
      <Pill label={copy({ de: `Verfolgt ${lessonMastery.trackedLessons}`, en: `Tracked ${lessonMastery.trackedLessons}`, pl: `Śledzone ${lessonMastery.trackedLessons}` })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
      <Pill label={copy({ de: `Beherrscht ${lessonMastery.masteredLessons}`, en: `Mastered ${lessonMastery.masteredLessons}`, pl: `Opanowane ${lessonMastery.masteredLessons}` })} tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }} />
      <Pill label={copy({ de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`, en: `Needs review ${lessonMastery.lessonsNeedingPractice}`, pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}` })} tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }} />
    </View>
  );
}

export function MasteryFocusPanel({ copy, weakest, strongest }: { copy: LessonsCopy; weakest: any | null; strongest: any | null }): React.JSX.Element {
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      {weakest !== null && <LinkButton href={weakest.lessonHref} label={copy({ de: `Fokus: ${weakest.title}`, en: `Focus: ${weakest.title}`, pl: `Skup się: ${weakest.title}` })} stretch tone='primary' />}
      {strongest !== null && <LinkButton href={strongest.lessonHref} label={copy({ de: `Stärke halten: ${strongest.title}`, en: `Maintain strength: ${strongest.title}`, pl: `Podtrzymaj: ${strongest.title}` })} stretch tone='secondary' />}
    </View>
  );
}

export function MasteryInsightsPanel({ copy, lessonMastery }: { copy: LessonsCopy; lessonMastery: UseKangurMobileLessonsLessonMasteryResult }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      {lessonMastery.weakest.length > 0 && <LessonMasteryRow insight={lessonMastery.weakest[0]} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />}
      {lessonMastery.strongest.length > 0 && <LessonMasteryRow insight={lessonMastery.strongest[0]} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />}
    </View>
  );
}
