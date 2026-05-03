import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
} from '../../shared/KangurMobileUi';
import { LessonCheckpointRow } from '../profile-primitives';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { useKangurMobileLessonCheckpoints } from '../../lessons/useKangurMobileLessonCheckpoints';
import type { Href } from 'expo-router';

type ProfileRecentCheckpointsCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  lessonCheckpoints: ReturnType<typeof useKangurMobileLessonCheckpoints>;
  lessonsRoute: Href;
};

export function ProfileRecentCheckpointsCard({
  copy,
  lessonCheckpoints,
  lessonsRoute,
}: ProfileRecentCheckpointsCardProps): React.JSX.Element {
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
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Das Profil zeigt die zuletzt lokal gespeicherten Lektionsstände, damit du genau an der letzten Stelle wieder einsteigen kannst.',
            en: 'The profile shows the most recently saved lesson states so you can resume exactly where the latest lesson was stored.',
            pl: 'Profil pokazuje ostatnio zapisane stany lekcji, aby można było wrócić dokładnie do miejsca ostatniego zapisu.',
          })}
        </Text>
      </View>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
            en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
            pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {lessonCheckpoints.recentCheckpoints.map((item) => (
            <LessonCheckpointRow key={item.componentId} item={item} />
          ))}

          <LinkButton
            href={lessonsRoute}
            label={copy({
              de: 'Lektionen öffnen',
              en: 'Open lessons',
              pl: 'Otwórz lekcje',
            })}
          />
        </View>
      )}
    </Card>
  );
}
