import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { LessonCheckpointRow } from './LessonCheckpointRow';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';

type LessonsCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type LessonCheckpointsState = ReturnType<typeof useKangurMobileLessonCheckpoints>;

export function LessonsCheckpointsPanel({
  copy,
  lessonCheckpoints,
}: {
  copy: LessonsCopy;
  lessonCheckpoints: LessonCheckpointsState;
}): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Letzte Lektions-Checkpoints', en: 'Recent lesson checkpoints', pl: 'Ostatnie checkpointy lekcji' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Weiter mit Lektionen', en: 'Continue with lessons', pl: 'Kontynuuj lekcje' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Die zuletzt lokal gespeicherten Lektionen bleiben hier griffbereit.',
          en: 'The most recently saved lessons stay visible here.',
          pl: 'Ostatnio zapisane lekcje są tutaj pod ręką.',
        })}
      </Text>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints.',
            en: 'There are no saved checkpoints yet.',
            pl: 'Nie ma jeszcze zapisanych checkpointów.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10, marginTop: 12 }}>
          {lessonCheckpoints.recentCheckpoints.map((item) => (
            <LessonCheckpointRow key={item.componentId} item={item} />
          ))}
        </View>
      )}
    </Card>
  );
}
