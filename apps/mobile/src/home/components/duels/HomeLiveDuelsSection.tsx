import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsSpotlight } from '../../useKangurMobileHomeDuelsSpotlight';
import { PrimaryButton, OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { LiveDuelCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';

const DUELS_ROUTE = createKangurDuelsHref();

type LiveDuelsSectionProps = {
  isAuthenticated: boolean;
};

type LiveDuelsCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

function LiveDuelsLoading({ copy }: { copy: LiveDuelsCopy }): React.JSX.Element {
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Offene öffentliche Duelle werden geladen.',
        en: 'Loading public duels from the lobby.',
        pl: 'Pobieramy publiczne pojedynki z lobby.',
      })}
    </Text>
  );
}

function LiveDuelsError({ copy, error, refresh }: { copy: LiveDuelsCopy; error: string; refresh: () => void }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
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
        onPress={refresh}
      />
    </View>
  );
}

function LiveDuelsEmpty({ copy }: { copy: LiveDuelsCopy }): React.JSX.Element {
  return (
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
        hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })}
        label={copy({ de: 'Duell-Lobby öffnen', en: 'Open duels lobby', pl: 'Otwórz lobby pojedynków' })}
      />
    </View>
  );
}

function LiveDuelsList({
  entries,
  isAuthenticated,
  copy,
  locale,
}: {
  entries: ReturnType<typeof useKangurMobileHomeDuelsSpotlight>['entries'];
  isAuthenticated: boolean;
  copy: LiveDuelsCopy;
  locale: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {entries.map((entry) => (
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

export function HomeLiveDuelsSection({
  isAuthenticated,
}: LiveDuelsSectionProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelSpotlight = useKangurMobileHomeDuelsSpotlight({ enabled: true });

  let content: React.ReactNode;
  if (duelSpotlight.isLoading) {
    content = <LiveDuelsLoading copy={copy} />;
  } else if (duelSpotlight.error !== null && duelSpotlight.error !== '') {
    const handleRefresh = (): void => {
      void duelSpotlight.refresh();
    };
    content = <LiveDuelsError copy={copy} error={duelSpotlight.error} refresh={handleRefresh} />;
  } else if (duelSpotlight.entries.length === 0) {
    content = <LiveDuelsEmpty copy={copy} />;
  } else {
    content = (
      <LiveDuelsList
        entries={duelSpotlight.entries}
        isAuthenticated={isAuthenticated}
        copy={copy}
        locale={locale}
      />
    );
  }

  return (
    <SectionCard title={copy({ de: 'Live-Duelle', en: 'Live duels', pl: 'Na żywo w pojedynkach' })}>
      {content}
    </SectionCard>
  );
}
