import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { ActionButton, MessageCard } from './duels-primitives';
import { formatRelativeAge } from './duels-utils';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelLobbyRecentOpponentsSectionProps = {
  copy: DuelCopy;
  locale: DuelLocale;
  lobby: DuelLobbyState;
  onOpenSession: (sessionId: string) => void;
};

function OpponentEntryRow({
  entry,
  copy,
  locale,
  isActionPending,
  onOpenSession,
  createPrivateChallenge,
}: {
  entry: DuelLobbyState['opponents'][number];
  copy: DuelCopy;
  locale: DuelLocale;
  isActionPending: boolean;
  onOpenSession: (sessionId: string) => void;
  createPrivateChallenge: DuelLobbyState['createPrivateChallenge'];
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {entry.displayName}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>
        {copy({
          de: 'Letztes Spiel',
          en: 'Last game',
          pl: 'Ostatnia gra',
        })}{' '}
        {formatRelativeAge(entry.lastPlayedAt, locale)}
      </Text>
      <ActionButton
        disabled={isActionPending}
        label={copy({
          de: 'Erneut herausfordern',
          en: 'Challenge again',
          pl: 'Wyzwij ponownie',
        })}
        onPress={async () => {
          const nextSessionId = await createPrivateChallenge(entry.learnerId);
          if (nextSessionId !== null) {
            onOpenSession(nextSessionId);
          }
        }}
        stretch
      />
    </View>
  );
}

function OpponentsStatus({
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
          de: 'Letzte Rivalen erfordern Anmeldung',
          en: 'Recent rivals require sign-in',
          pl: 'Ostatni rywale wymagają logowania',
        })}
        description={copy({
          de: 'Nach der Anmeldung erscheinen hier die letzten Rivalen und schnelle Rückkämpfe.',
          en: 'After signing in, recent rivals and quick rematches will appear here.',
          pl: 'Po zalogowaniu pojawią się tutaj ostatni rywale i szybkie rewanże.',
        })}
      />
    );
  }

  if (lobby.isOpponentsLoading) {
    return (
      <MessageCard
        title={copy({
          de: 'Gegnerliste wird geladen',
          en: 'Loading opponents',
          pl: 'Ładujemy listę przeciwników',
        })}
        description={copy({
          de: 'Die letzten Rivalen aus wcześniejszych Duellen werden geladen.',
          en: 'Loading recent rivals from earlier duels.',
          pl: 'Pobieramy ostatnich rywali z wcześniejszych pojedynków.',
        })}
      />
    );
  }

  return null;
}

export function DuelLobbyRecentOpponentsSection({
  copy,
  locale,
  lobby,
  onOpenSession,
}: DuelLobbyRecentOpponentsSectionProps): React.JSX.Element {
  const renderContent = (): React.JSX.Element => {
    const status = OpponentsStatus({ lobby, copy });
    if (status !== null) {
      return status;
    }

    if (lobby.opponents.length === 0) {
      return (
        <MessageCard
          title={copy({
            de: 'Noch keine letzten Rivalen',
            en: 'No recent rivals yet',
            pl: 'Brak jeszcze ostatnich rywali',
          })}
          description={copy({
            de: 'Beende das erste Duell, damit sich diese Liste automatisch füllt.',
            en: 'Finish the first duel and this list will fill automatically.',
            pl: 'Rozegraj pierwszy pojedynek, aby ta lista wypełniła się automatycznie.',
          })}
        />
      );
    }

    return (
      <View style={{ gap: 10 }}>
        {lobby.opponents.map((entry) => (
          <OpponentEntryRow
            key={entry.learnerId}
            copy={copy}
            createPrivateChallenge={lobby.createPrivateChallenge}
            entry={entry}
            isActionPending={lobby.isActionPending}
            locale={locale}
            onOpenSession={onOpenSession}
          />
        ))}
      </View>
    );
  };

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Letzte Gegner',
            en: 'Recent opponents',
            pl: 'Ostatni przeciwnicy',
          })}
        </Text>
        {lobby.isAuthenticated ? (
          <ActionButton
            disabled={lobby.isOpponentsLoading}
            label={copy({
              de: 'Gegnerliste aktualisieren',
              en: 'Refresh opponents',
              pl: 'Odśwież przeciwników',
            })}
            onPress={lobby.refresh}
            stretch
            tone='secondary'
          />
        ) : null}
      </View>
      {renderContent()}
    </Card>
  );
}
