import { Text, TextInput, View } from 'react-native';

import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { ActionButton, MessageCard } from './duels-primitives';
import { formatRelativeAge } from './duels-utils';

type DuelCopy = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['copy'];
type DuelLocale = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['locale'];
type DuelLobbyState = ReturnType<
  (typeof import('./useKangurMobileDuelsLobby'))['useKangurMobileDuelsLobby']
>;

type DuelLobbySecondarySectionProps = {
  copy: DuelCopy;
  locale: DuelLocale;
  lobby: DuelLobbyState;
};

type DuelLobbySearchSectionProps = DuelLobbySecondarySectionProps & {
  onOpenSession: (sessionId: string) => void;
  searchStatusLabel: string;
  searchStatusTone: Tone;
};

export function DuelLobbyPresenceSection({
  copy,
  locale,
  lobby,
}: DuelLobbySecondarySectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Aktive Lernende',
          en: 'Active learners',
          pl: 'Aktywni uczniowie',
        })}
      </Text>
      {!lobby.isAuthenticated ? (
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
      ) : lobby.presenceError ? (
        <MessageCard
          title={copy({
            de: 'Präsenz konnte nicht geladen werden',
            en: 'Could not load presence',
            pl: 'Nie udało się pobrać obecności',
          })}
          description={lobby.presenceError}
          tone='error'
        />
      ) : lobby.isPresenceLoading ? (
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
      ) : lobby.presenceEntries.length === 0 ? (
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
      ) : (
        <View style={{ gap: 10 }}>
          {lobby.presenceEntries.map((entry) => (
            <View
              key={entry.learnerId}
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
          ))}
        </View>
      )}
    </Card>
  );
}

export function DuelLobbySearchSection({
  copy,
  locale,
  lobby,
  onOpenSession,
  searchStatusLabel,
  searchStatusTone,
}: DuelLobbySearchSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Lernende suchen',
            en: 'Search learners',
            pl: 'Szukaj uczniów',
          })}
        </Text>
        <Pill label={searchStatusLabel} tone={searchStatusTone} />
      </View>
      {!lobby.isAuthenticated ? (
        <MessageCard
          title={copy({
            de: 'Zum Suchen anmelden',
            en: 'Sign in to search learners',
            pl: 'Zaloguj się, aby szukać uczniów',
          })}
          description={copy({
            de: 'Nach der Anmeldung znajdziesz ucznia po loginie lub nazwie i od razu wyślesz prywatne wyzwanie.',
            en: 'After sign-in, you can find a learner by login or name and send a private challenge right away.',
            pl: 'Po zalogowaniu znajdziesz ucznia po loginie lub nazwie i od razu wyślesz prywatne wyzwanie.',
          })}
        />
      ) : (
        <>
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Gib mindestens 2 Zeichen des Logins oder Namens des Lernenden ein.',
                en: 'Enter at least 2 characters from the learner login or name.',
                pl: 'Wpisz co najmniej 2 znaki loginu lub nazwy ucznia.',
              })}
            </Text>
            <TextInput
              accessibilityLabel={copy({
                de: 'Lernendensuche',
                en: 'Learner search',
                pl: 'Wyszukiwarka uczniów',
              })}
              onChangeText={lobby.setSearchQuery}
              placeholder={copy({
                de: 'Lernenden suchen',
                en: 'Search learner',
                pl: 'Szukaj ucznia',
              })}
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderRadius: 16,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 12,
                width: '100%',
              }}
              value={lobby.searchQuery}
            />
            <View style={{ gap: 8 }}>
              <ActionButton
                disabled={lobby.searchQuery.trim().length < 2}
                label={copy({
                  de: 'Suchen',
                  en: 'Search',
                  pl: 'Szukaj',
                })}
                onPress={lobby.submitSearch}
                stretch
              />
              {lobby.searchSubmittedQuery ? (
                <ActionButton
                  label={copy({
                    de: 'Suche löschen',
                    en: 'Clear search',
                    pl: 'Wyczyść wyszukiwanie',
                  })}
                  onPress={lobby.clearSearch}
                  stretch
                  tone='secondary'
                />
              ) : null}
            </View>
          </View>

          {lobby.searchError ? (
            <MessageCard
              title={copy({
                de: 'Suche fehlgeschlagen',
                en: 'Search failed',
                pl: 'Wyszukiwanie nie powiodło się',
              })}
              description={lobby.searchError}
              tone='error'
            />
          ) : lobby.isSearchLoading ? (
            <MessageCard
              title={copy({
                de: 'Lernende werden gesucht',
                en: 'Searching learners',
                pl: 'Szukamy uczniów',
              })}
              description={copy({
                de: 'Die Ergebnisse für die eingegebene Anfrage werden abgeglichen.',
                en: 'Matching results for the entered query.',
                pl: 'Dopasowujemy wyniki dla wpisanego zapytania.',
              })}
            />
          ) : lobby.searchSubmittedQuery.length >= 2 &&
            lobby.searchResults.length === 0 ? (
            <MessageCard
              title={copy({
                de: 'Keine Ergebnisse',
                en: 'No results',
                pl: 'Brak wyników',
              })}
              description={copy({
                de: 'Es wurden keine Lernenden gefunden, die zur eingegebenen Anfrage passen.',
                en: 'We did not find any learners matching the entered query.',
                pl: 'Nie znaleźliśmy uczniów pasujących do wpisanego zapytania.',
              })}
            />
          ) : lobby.searchResults.length > 0 ? (
            <View style={{ gap: 10 }}>
              {lobby.searchResults.map((entry) => (
                <View
                  key={entry.learnerId}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 8,
                    alignSelf: 'stretch',
                    width: '100%',
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {entry.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    {copy({
                      de: `Login: ${entry.loginName}`,
                      en: `Login: ${entry.loginName}`,
                      pl: `Login: ${entry.loginName}`,
                    })}
                  </Text>
                  <ActionButton
                    disabled={lobby.isActionPending}
                    label={copy({
                      de: 'Private Herausforderung senden',
                      en: 'Send private challenge',
                      pl: 'Wyślij prywatne wyzwanie',
                    })}
                    onPress={async () => {
                      const nextSessionId = await lobby.createPrivateChallenge(
                        entry.learnerId,
                      );
                      if (nextSessionId) {
                        onOpenSession(nextSessionId);
                      }
                    }}
                    stretch
                  />
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

export function DuelLobbyRecentOpponentsSection({
  copy,
  locale,
  lobby,
  onOpenSession,
}: DuelLobbySecondarySectionProps & {
  onOpenSession: (sessionId: string) => void;
}): React.JSX.Element {
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
      {!lobby.isAuthenticated ? (
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
      ) : lobby.isOpponentsLoading ? (
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
      ) : lobby.opponents.length === 0 ? (
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
      ) : (
        <View style={{ gap: 10 }}>
          {lobby.opponents.map((entry) => (
            <View
              key={entry.learnerId}
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
                disabled={lobby.isActionPending}
                label={copy({
                  de: 'Erneut herausfordern',
                  en: 'Challenge again',
                  pl: 'Wyzwij ponownie',
                })}
                onPress={async () => {
                  const nextSessionId = await lobby.createPrivateChallenge(
                    entry.learnerId,
                  );
                  if (nextSessionId) {
                    onOpenSession(nextSessionId);
                  }
                }}
                stretch
              />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function DuelLobbyLeaderboardSection({
  copy,
  locale,
  lobby,
}: DuelLobbySecondarySectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Duellrangliste',
          en: 'Duels leaderboard',
          pl: 'Wyniki dueli',
        })}
      </Text>
      {lobby.leaderboardError ? (
        <MessageCard
          title={copy({
            de: 'Duellrangliste ist nicht verfügbar',
            en: 'Duels leaderboard is unavailable',
            pl: 'Ranking dueli jest niedostępny',
          })}
          description={lobby.leaderboardError}
          tone='error'
        />
      ) : lobby.leaderboardEntries.length === 0 ? (
        <MessageCard
          title={copy({
            de: 'Keine gespielten Duelle',
            en: 'No completed duels',
            pl: 'Brak rozegranych dueli',
          })}
          description={copy({
            de: 'Die Rangliste füllt sich nach den ersten abgeschlossenen Duellen.',
            en: 'The leaderboard will fill up after the first completed duels.',
            pl: 'Ranking zapełni się po pierwszych zakończonych pojedynkach.',
          })}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {lobby.leaderboardEntries.map((entry, index) => (
            <View
              key={`${entry.learnerId}-${index}`}
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
                #{index + 1} {entry.displayName}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: `Siege ${entry.wins} · Niederlagen ${entry.losses} · Unentschieden ${entry.ties}`,
                  en: `Wins ${entry.wins} · Losses ${entry.losses} · Draws ${entry.ties}`,
                  pl: `Wygrane ${entry.wins} · Porażki ${entry.losses} · Remisy ${entry.ties}`,
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                {copy({
                  de: `Spiele ${entry.matches} · Siegesquote ${Math.round(entry.winRate * 100)}% · letztes Spiel ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
                  en: `Matches ${entry.matches} · Win rate ${Math.round(entry.winRate * 100)}% · last game ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
                  pl: `Mecze ${entry.matches} · Win rate ${Math.round(entry.winRate * 100)}% · ostatnia gra ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
