import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
} from '../../shared/KangurMobileUi';
import { SessionRow } from '../profile-primitives';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { useKangurMobileProfileRecentResults } from '../useKangurMobileProfileRecentResults';
import type { Href } from 'expo-router';

type ProfileRecentResultsCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  profileRecentResults: ReturnType<typeof useKangurMobileProfileRecentResults>;
  resultsRoute: Href;
};

export function ProfileRecentResultsCard({
  copy,
  profileRecentResults,
  resultsRoute,
}: ProfileRecentResultsCardProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Letzte Ergebnisse',
            en: 'Recent results',
            pl: 'Ostatnie wyniki',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Die Historie zeigt deine zuletzt abgeschlossenen Übungen und deren Genauigkeit.',
            en: 'History shows your most recently completed exercises and their accuracy.',
            pl: 'Historia pokazuje Twoje ostatnio ukończone ćwiczenia i ich skuteczność.',
          })}
        </Text>
      </View>

      {profileRecentResults.recentResultItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Noch keine Ergebnisse vorhanden. Starte eine Übung, um deinen Fortschritt hier zu sehen.',
            en: 'No results yet. Start an exercise to see your progress here.',
            pl: 'Brak wyników. Rozpocznij ćwiczenie, aby zobaczyć tu swój postęp.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {profileRecentResults.recentResultItems.map((item) => (
            <SessionRow key={item.id} item={item} />
          ))}

          <LinkButton
            href={resultsRoute}
            label={copy({
              de: 'Alle Ergebnisse anzeigen',
              en: 'Show all results',
              pl: 'Pokaż wszystkie wyniki',
            })}
          />
        </View>
      )}
    </Card>
  );
}
