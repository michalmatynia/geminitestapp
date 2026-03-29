import type { KangurDuelLeaderboardEntry } from '@kangur/contracts-duels';
import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { formatProfileDateTime } from './profile-primitives';

type ProfileDuelOpponent = {
  displayName: string;
  lastPlayedAt: string;
  learnerId: string;
};

type ProfileDuelsState = {
  actionError: string | null;
  createRematch: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: KangurDuelLeaderboardEntry | null;
  currentRank: number | null;
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  opponents: ProfileDuelOpponent[];
  pendingOpponentLearnerId: string | null;
  refresh: () => Promise<void>;
};

export function ProfileDuelsCard({
  duelProfile,
  duelsHref,
  openDuelSession,
}: {
  duelProfile: ProfileDuelsState;
  duelsHref: Href;
  openDuelSession: (sessionId: string) => void;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Duelle',
            en: 'Duels',
            pl: 'Pojedynki',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Schneller Rückweg zu Rivalen',
            en: 'Quick return to rivals',
            pl: 'Szybki powrót do rywali',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Prüfe direkt im Profil den aktuellen Duellstand, springe zu den letzten Rivalen zurück und öffne einen Rückkampf ohne den Verlauf zu verlassen.',
            en: 'Check the current duel standing right in the profile, return to recent rivals, and open a rematch without leaving your history.',
            pl: 'Sprawdź bezpośrednio w profilu aktualny stan pojedynków, wróć do ostatnich rywali i otwórz rewanż bez wychodzenia z historii.',
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Rivalen ${duelProfile.opponents.length}`,
            en: `Rivals ${duelProfile.opponents.length}`,
            pl: `Rywale ${duelProfile.opponents.length}`,
          })}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
        <Pill
          label={
            duelProfile.currentRank
              ? copy({
                  de: `Deine Position #${duelProfile.currentRank}`,
                  en: `Your rank #${duelProfile.currentRank}`,
                  pl: `Twoja pozycja #${duelProfile.currentRank}`,
                })
              : copy({
                  de: 'Position ausstehend',
                  en: 'Rank pending',
                  pl: 'Pozycja czeka',
                })
          }
          tone={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
          }}
        />
      </View>

      {!duelProfile.isAuthenticated ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Melde dich an, um hier Duellstand, letzte Rivalen und schnelle Rückkämpfe aus dem Profil zu sehen.',
            en: 'Sign in to see duel standing, recent rivals, and quick rematches here in the profile.',
            pl: 'Zaloguj się, aby zobaczyć tutaj w profilu stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
          })}
        </Text>
      ) : duelProfile.isRestoringAuth || duelProfile.isLoading ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Rivalen und Duellrangliste werden geladen.',
            en: 'Loading rivals and the duel leaderboard.',
            pl: 'Pobieramy rywali i ranking pojedynków.',
          })}
        </Text>
      ) : duelProfile.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
            {duelProfile.error}
          </Text>
          <ActionButton
            label={copy({
              de: 'Duelle aktualisieren',
              en: 'Refresh duels',
              pl: 'Odśwież pojedynki',
            })}
            onPress={() => duelProfile.refresh()}
            stretch
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {duelProfile.currentEntry ? (
            <InsetPanel
              gap={8}
              style={{
                borderColor: '#bfdbfe',
                backgroundColor: '#eff6ff',
              }}
            >
              <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                {copy({
                  de: 'DEIN DUELLSTAND',
                  en: 'YOUR DUEL SNAPSHOT',
                  pl: 'TWÓJ WYNIK W POJEDYNKACH',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                #{duelProfile.currentRank} {duelProfile.currentEntry.displayName}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: `Siege ${duelProfile.currentEntry.wins} • Niederlagen ${duelProfile.currentEntry.losses} • Unentschieden ${duelProfile.currentEntry.ties}`,
                  en: `Wins ${duelProfile.currentEntry.wins} • Losses ${duelProfile.currentEntry.losses} • Ties ${duelProfile.currentEntry.ties}`,
                  pl: `Wygrane ${duelProfile.currentEntry.wins} • Porażki ${duelProfile.currentEntry.losses} • Remisy ${duelProfile.currentEntry.ties}`,
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                {copy({
                  de: `Matches ${duelProfile.currentEntry.matches} • Quote ${Math.round(duelProfile.currentEntry.winRate * 100)}% • letztes Duell ${formatProfileDateTime(duelProfile.currentEntry.lastPlayedAt, locale)}`,
                  en: `Matches ${duelProfile.currentEntry.matches} • Win rate ${Math.round(duelProfile.currentEntry.winRate * 100)}% • last duel ${formatProfileDateTime(duelProfile.currentEntry.lastPlayedAt, locale)}`,
                  pl: `Mecze ${duelProfile.currentEntry.matches} • Win rate ${Math.round(duelProfile.currentEntry.winRate * 100)}% • ostatni pojedynek ${formatProfileDateTime(duelProfile.currentEntry.lastPlayedAt, locale)}`,
                })}
              </Text>
            </InsetPanel>
          ) : (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Dein Konto ist in dieser Profil-Momentaufnahme noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit dein Rang hier auftaucht.',
                en: 'Your account is not visible in this profile snapshot yet. Finish another duel or open the lobby so your rank shows up here.',
                pl: 'Twojego konta nie widać jeszcze w tej migawce profilu. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
              })}
            </Text>
          )}

          {duelProfile.actionError ? (
            <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
              {duelProfile.actionError}
            </Text>
          ) : null}

          {duelProfile.opponents.length === 0 ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rückkämpfe frei.',
                en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                {copy({
                  de: 'Letzte Rivalen',
                  en: 'Recent rivals',
                  pl: 'Ostatni rywale',
                })}
              </Text>
              {duelProfile.opponents.map((opponent) => (
                <InsetPanel key={opponent.learnerId} gap={8}>
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {opponent.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    {copy({
                      de: `Letztes Duell ${formatProfileDateTime(opponent.lastPlayedAt, locale)}`,
                      en: `Last duel ${formatProfileDateTime(opponent.lastPlayedAt, locale)}`,
                      pl: `Ostatni pojedynek ${formatProfileDateTime(opponent.lastPlayedAt, locale)}`,
                    })}
                  </Text>
                  <ActionButton
                    disabled={duelProfile.isActionPending}
                    label={
                      duelProfile.pendingOpponentLearnerId === opponent.learnerId
                        ? copy({
                            de: 'Rückkampf wird gesendet...',
                            en: 'Sending rematch...',
                            pl: 'Wysyłanie rewanżu...',
                          })
                        : copy({
                            de: 'Schneller Rückkampf',
                            en: 'Quick rematch',
                            pl: 'Szybki rewanż',
                          })
                    }
                    onPress={async () => {
                      const sessionId = await duelProfile.createRematch(opponent.learnerId);
                      if (sessionId) {
                        openDuelSession(sessionId);
                      }
                    }}
                  />
                </InsetPanel>
              ))}
            </View>
          )}

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <ActionButton
              label={copy({
                de: 'Duelle aktualisieren',
                en: 'Refresh duels',
                pl: 'Odśwież pojedynki',
              })}
              onPress={() => duelProfile.refresh()}
              stretch
              tone='secondary'
            />
            <LinkButton
              href={duelsHref}
              label={copy({
                de: 'Duelle öffnen',
                en: 'Open duels',
                pl: 'Otwórz pojedynki',
              })}
              stretch
            />
          </View>
        </View>
      )}
    </Card>
  );
}
