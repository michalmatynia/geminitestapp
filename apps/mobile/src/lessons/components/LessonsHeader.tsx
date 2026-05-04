import React from 'react';
import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobilePill as Pill, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { type LessonMastery } from '../lessons-types';

type LessonsHeaderProps = {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  lessonMastery: LessonMastery;
  resultsHref: string;
  planHref: string;
};

export const LessonsHeader = ({ copy, lessonMastery, resultsHref, planHref }: LessonsHeaderProps): React.JSX.Element => (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lernen und Wiederholen', en: 'Learn and review', pl: 'Nauka i powtórki' })}</Text>
    <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>{copy({ de: 'Lektionen', en: 'Lessons', pl: 'Lekcje' })}</Text>
    <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
      {copy({
        de: 'Hier verbindest du den Themenkatalog mit gespeicherten Checkpoints, passendem Training und schnellen Wegen zurück zu Verlauf sowie Tagesplan.',
        en: 'Here you connect the topic catalog with saved checkpoints, matching practice, and quick routes back to history and the daily plan.',
        pl: 'Tutaj połączysz katalog tematów z zapisanymi checkpointami, pasującym treningiem oraz szybkim powrotem do historii i planu dnia.',
      })}
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label={`${copy({ de: 'Verfolgt', en: 'Tracked', pl: 'Śledzone' })} ${lessonMastery.trackedLessons}`} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
      <Pill label={`${copy({ de: 'Beherrscht', en: 'Mastered', pl: 'Opanowane' })} ${lessonMastery.masteredLessons}`} tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }} />
      <Pill label={`${copy({ de: 'Do powtórki', en: 'Needs review', pl: 'Do powtórki' })} ${lessonMastery.lessonsNeedingPractice}`} tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }} />
    </View>
    <View style={{ gap: 10 }}>
      <LinkButton href={resultsHref} label={copy({ de: 'Vollständigen Verlauf öffnen', en: 'Open full history', pl: 'Otwórz pełną historię' })} stretch style={{ borderRadius: 16 }} tone='secondary' verticalPadding={12} />
      <LinkButton href={planHref} label={copy({ de: 'Tagesplan öffnen', en: 'Open daily plan', pl: 'Otwórz plan dnia' })} stretch style={{ borderRadius: 16 }} tone='secondary' verticalPadding={12} />
    </View>
  </Card>
);
