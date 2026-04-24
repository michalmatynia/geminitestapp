import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { MessageCard } from './duels-primitives';
import { formatRelativeAge } from './duels-utils';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelLobbySecondarySectionProps = {
  copy: DuelCopy;
  locale: DuelLocale;
  lobby: DuelLobbyState;
};

function PresenceEntryRow({
  entry,
  locale,
  copy,
}: {
  entry: DuelLobbyState['presenceEntries'][number];
  locale: DuelLocale;
  copy: DuelCopy;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 6,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {entry.displayName}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>
        {copy({
          de: 'Letzte Aktivität',
          en: 'Last activity',
          pl: 'Ostatnia aktywność',
        })}{' '}
        {formatRelativeAge(entry.lastSeenAt, locale)}
      </Text>
    </View>
  );
}

function PresenceStatus({
  lobby,
  copy,
}: {
  lobby: DuelLobbyState;
  copy: DuelCopy;
}): React.JSX.Element | null {
  if (!lobby.isAuthenticated) {
    return (
      <MessageCard
        title={copy({
          de: 'Zum aktiven Lobby-Feed anmelden',
          en: 'Sign in to see active learners',
          pl: 'Zaloguj się, aby zobaczyć aktywnych uczniów',
        })}
        description={copy({
          de: 'Nach der Anmeldung wirst du auch in der Lobby sichtbar und kannst schneller zu aktiven Rivalen zurückkehren.',
          en: 'After sign-in, you will also become visible in the lobby and can return to active rivals faster.',
          pl: 'Po zalogowaniu będziesz też widoczny w lobby i szybciej wrócisz do aktywnych rywali.',
        })}
      />
    );
  }

  if (lobby.presenceError !== null) {
    return (
      <MessageCard
        title={copy({
          de: 'Präsenz konnte nicht geladen werden',
          en: 'Could not load presence',
          pl: 'Nie udało się pobrać obecności',
        })}
        description={lobby.presenceError}
        tone='error'
      />
    );
  }

  if (lobby.isPresenceLoading) {
    return (
      <MessageCard
        title={copy({
          de: 'Präsenz wird aktualisiert',
          en: 'Updating presence',
          pl: 'Aktualizujemy obecność',
        })}
        description={copy({
          de: 'Die Liste der in der Lobby sichtbaren Lernenden wird synchronisiert.',
          en: 'Synchronizing the list of learners visible in the lobby.',
          pl: 'Synchronizujemy listę uczniów widocznych w lobby.',
        })}
      />
    );
  }

  return null;
}

export function DuelLobbyPresenceSection({
  copy,
  locale,
  lobby,
}: DuelLobbySecondarySectionProps): React.JSX.Element {
  const renderContent = (): React.JSX.Element => {
    const status = PresenceStatus({ lobby, copy });
    if (status !== null) {
      return status;
    }

    if (lobby.presenceEntries.length === 0) {
      return (
        <MessageCard
          title={copy({
            de: 'Keine aktiven Lernenden',
            en: 'No active learners',
            pl: 'Brak obecnych uczniów',
          })}
          description={copy({
            de: 'Wenn andere Lernende die Lobby öffnen, erscheinen sie hier.',
            en: 'When other learners open the lobby, they will appear here.',
            pl: 'Gdy inni uczniowie otworzą lobby, pojawią się tutaj.',
          })}
        />
      );
    }

    return (
      <View style={{ gap: 10 }}>
        {lobby.presenceEntries.map((entry) => (
          <PresenceEntryRow key={entry.learnerId} copy={copy} entry={entry} locale={locale} />
        ))}
      </View>
    );
  };

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Aktive Lernende',
          en: 'Active learners',
          pl: 'Aktywni uczniowie',
        })}
      </Text>
      {renderContent()}
    </Card>
  );
}
