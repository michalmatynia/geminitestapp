import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsSpotlight } from '../../useKangurMobileHomeDuelsSpotlight';
import { PrimaryButton, OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { LiveDuelCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  isAuthenticated: boolean;
};

export function HomeLiveDuelsSection({
  isAuthenticated,
}: Props): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelSpotlight = useKangurMobileHomeDuelsSpotlight({
    enabled: true,
  });

  let content: React.ReactNode = null;

  if (duelSpotlight.isLoading) {
    content = (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Offene öffentliche Duelle werden geladen.',
          en: 'Loading public duels from the lobby.',
          pl: 'Pobieramy publiczne pojedynki z lobby.',
        })}
      </Text>
    );
  } else if (duelSpotlight.error !== null && duelSpotlight.error !== '') {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {duelSpotlight.error}
        </Text>
        <PrimaryButton
          hint={copy({
            de: 'Aktualisiert die öffentlichen Duelle aus der Lobby.',
            en: 'Refreshes the public duels from the lobby.',
            pl: 'Odświeża publiczne pojedynki z lobby.',
          })}
          label={copy({
            de: 'Live-Duelle aktualisieren',
            en: 'Refresh live duels',
            pl: 'Odśwież pojedynki',
          })}
          onPress={duelSpotlight.refresh}
        />
      </View>
    );
  } else if (duelSpotlight.entries.length === 0) {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Gerade sind keine öffentlichen Duelle aktiv. Öffne die Lobby, um ein neues Match zu starten oder auf den nächsten Gegner zu warten.',
            en: 'There are no active public duels right now. Open the lobby to start a new match or wait for the next opponent.',
            pl: 'Teraz nie ma aktywnych publicznych pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
          })}
        </Text>
        <OutlineLink
          href={DUELS_ROUTE}
          hint={copy({
            de: 'Öffnet die Duell-Lobby.',
            en: 'Opens the duels lobby.',
            pl: 'Otwiera lobby pojedynków.',
          })}
          label={copy({
            de: 'Duell-Lobby öffnen',
            en: 'Open duels lobby',
            pl: 'Otwórz lobby pojedynków',
          })}
        />
      </View>
    );
  } else {
    content = (
      <View style={{ gap: 12 }}>
        {duelSpotlight.entries.map((entry) => (
          <LiveDuelCard
            key={entry.sessionId}
            copy={copy}
            entry={entry}
            isAuthenticated={isAuthenticated}
            locale={locale}
          />
        ))}
      </View>
    );
  }

  return (
    <SectionCard
      title={copy({
        de: 'Live-Duelle',
        en: 'Live duels',
        pl: 'Na żywo w pojedynkach',
      })}
    >
      {content}
    </SectionCard>
  );
}
