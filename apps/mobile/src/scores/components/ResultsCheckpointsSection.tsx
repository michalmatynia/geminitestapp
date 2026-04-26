import { View, Text } from 'react-native';
import { Card, LinkButton } from '../shared/KangurMobileUi';
import { LessonCheckpointRow } from './results-primitives';

interface ResultsCheckpointsSectionProps {
  checkpoints: { componentId: string }[];
  copy: (v: Record<string, string>) => string;
  lessonsHref: any;
}

export function ResultsCheckpointsSection({
  checkpoints,
  copy,
  lessonsHref,
}: ResultsCheckpointsSectionProps): React.JSX.Element {
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
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Checkpoints-Historie',
            en: 'Checkpoint history',
            pl: 'Historia checkpointów',
          })}
        </Text>
      </View>

      {checkpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints.',
            en: 'There are no saved checkpoints yet.',
            pl: 'Nie ma jeszcze zapisanych checkpointów.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {checkpoints.map((item) => (
            <LessonCheckpointRow key={item.componentId} item={item} />
          ))}
          <LinkButton
            href={lessonsHref}
            label={copy({
              de: 'Lektionen öffnen',
              en: 'Open lessons',
              pl: 'Otwórz lekcje',
            })}
            style={{ paddingHorizontal: 12 }}
            verticalPadding={9}
          />
        </View>
      )}
    </Card>
  );
}
