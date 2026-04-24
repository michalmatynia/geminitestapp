import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel } from '../shared/KangurMobileUi';
import { KangurMobileLinkButton as LinkButton } from './duels-primitives';
import { LessonCheckpointRow } from './practice-primitives';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeLessonCheckpointsState = ReturnType<typeof useKangurMobileLessonCheckpoints>;

export function PracticeLessonCheckpointsPanel({
  copy,
  lessonCheckpoints,
}: {
  copy: PracticeCopy;
  lessonCheckpoints: PracticeLessonCheckpointsState;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lektions-Checkpoints', en: 'Lesson checkpoints', pl: 'Checkpointy lekcji' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Weiter mit Lektionen', en: 'Continue with lessons', pl: 'Kontynuuj lekcje' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Springe direkt zu gespeicherten Lektionen.', en: 'Jump back to saved lessons.', pl: 'Wróć do zapisanych lekcji.' })}</Text>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Keine Checkpoints.', en: 'No checkpoints.', pl: 'Brak checkpointów.' })}</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonCheckpoints.recentCheckpoints.map((item) => <LessonCheckpointRow key={item.componentId} item={item} />)}
          <LinkButton href='/lessons' label={copy({ de: 'Lektionen öffnen', en: 'Open lessons', pl: 'Otwórz lekcje' })} tone='secondary' />
        </View>
      )}
    </InsetPanel>
  );
}
