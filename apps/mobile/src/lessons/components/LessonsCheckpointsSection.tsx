import React from 'react';
import { View, Text } from 'react-native';
import { Card, KangurMobileLinkButton as LinkButton } from '../shared/KangurMobileUi';
import { LessonCheckpointRow } from './lesson-row-primitives';

interface LessonsCheckpointsSectionProps {
  lessonCheckpoints: { recentCheckpoints: any[] };
  copy: (v: Record<string, string>) => string;
}

export function LessonsCheckpointsSection({
  lessonCheckpoints,
  copy,
}: LessonsCheckpointsSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Letzte Lektions-Checkpoints',
            en: 'Recent lesson checkpoints',
            pl: 'Ostatnie checkpointy lekcji',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
          {copy({
            de: 'Weiter mit Lektionen',
            en: 'Continue with lessons',
            pl: 'Kontynuuj lekcje',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Die zuletzt lokal gespeicherten Lektionen bleiben hier griffbereit.',
            en: 'The most recently saved lessons stay visible here.',
            pl: 'Ostatnio zapisane lekcje są tutaj pod ręką.',
          })}
        </Text>
      </View>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints.',
            en: 'There are no saved checkpoints yet.',
            pl: 'Nie ma jeszcze zapisanych checkpointów.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonCheckpoints.recentCheckpoints.map((item: any) => (
            <LessonCheckpointRow key={item.componentId} item={item} />
          ))}
          <LinkButton
            href='/lessons'
            label={copy({
              de: 'Lektionen öffnen',
              en: 'Open lessons',
              pl: 'Otwórz lekcje',
            })}
            stretch
            tone='secondary'
          />
        </View>
      )}
    </Card>
  );
}
