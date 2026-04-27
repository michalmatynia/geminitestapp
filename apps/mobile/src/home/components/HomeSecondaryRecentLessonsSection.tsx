import { Text, View } from 'react-native';

import type { KangurMobileHomeLessonCheckpointItem } from '../useKangurMobileHomeLessonCheckpoints';
import {
  OutlineLink,
  SectionCard,
} from '../homeScreenPrimitives';
import { LessonCheckpointCard } from './LessonCheckpointCard';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { LESSONS_ROUTE } from '../home-screen-constants';
import { useHomeScreenDeferredPanels } from '../useHomeScreenDeferredPanels';
import {
  DeferredHomeInsightsRecentLessonsDetails,
} from '../home-screen-deferred';

export function HomeSecondaryRecentLessonsSection({
  recentCheckpoints,
}: {
  recentCheckpoints: KangurMobileHomeLessonCheckpointItem[];
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const areDeferredHomeInsightRecentLessonsDetailsReady = useHomeScreenDeferredPanels(
    'home:insights:lessons:recent:details',
    false,
  );
  const primaryCheckpoint = recentCheckpoints.length > 0 ? recentCheckpoints[0] : null;

  return (
    <SectionCard
      title={copy({
        de: 'Zurück zu den letzten Lektionen',
        en: 'Return to recent lessons',
        pl: 'Powrót do ostatnich lekcji',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Jeder lokal gespeicherte Checkpoint oder Lektionsabschluss erscheint hier sofort, damit du vom Start aus direkt an der zuletzt gespeicherten Stelle weitermachen kannst.',
          en: 'Every locally saved checkpoint or lesson completion appears here right away so you can resume from home at the most recently saved lesson.',
          pl: 'Każdy lokalnie zapisany checkpoint albo ukończenie lekcji pojawia się tutaj od razu, aby można było ze startu wrócić do ostatnio zapisanej lekcji.',
        })}
      </Text>
      {recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit die letzten Lektionen hier erscheinen.',
            en: 'There are no saved checkpoints yet. Open a lesson and save the first checkpoint so recent lessons appear here.',
            pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby ostatnie lekcje pojawiły się tutaj.',
          })}
        </Text>
      ) : !areDeferredHomeInsightRecentLessonsDetailsReady && primaryCheckpoint ? (
        <View style={{ gap: 12 }}>
          <LessonCheckpointCard item={primaryCheckpoint} />
          <DeferredHomeInsightsRecentLessonsDetails />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {recentCheckpoints.map((item) => (
            <LessonCheckpointCard key={item.componentId} item={item} />
          ))}
          <OutlineLink
            href={LESSONS_ROUTE}
            hint={copy({
              de: 'Öffnet den vollständigen Lektionskatalog.',
              en: 'Opens the full lessons catalog.',
              pl: 'Otwiera pełny katalog lekcji.',
            })}
            label={copy({
              de: 'Alle Lektionen öffnen',
              en: 'Open all lessons',
              pl: 'Otwórz wszystkie lekcje',
            })}
          />
        </View>
      )}
    </SectionCard>
  );
}
