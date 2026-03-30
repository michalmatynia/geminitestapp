import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobileSummaryChip,
} from '../shared/KangurMobileUi';
import { formatKangurMobileScoreDateTime } from './mobileScoreSummary';

type DuelCurrentEntry = {
  displayName: string;
  lastPlayedAt: string;
  losses: number;
  matches: number;
  ties: number;
  winRate: number;
  wins: number;
};

type DuelOpponent = {
  displayName: string;
  lastPlayedAt: string;
  learnerId: string;
};

type ResultsDuelsState = {
  actionError: string | null;
  createRematch: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: DuelCurrentEntry | null;
  currentRank: number | null;
  error: string | null;
  isActionPending: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  opponents: DuelOpponent[];
  pendingOpponentLearnerId: string | null;
  refresh: () => Promise<void>;
};

export function ResultsDuelsCard({
  duelResults,
  duelsHref,
  openDuelSession,
}: {
  duelResults: ResultsDuelsState;
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
            de: 'Prüfe den aktuellen Duellstand, sieh die letzten Rivalen und starte einen Rückkampf, ohne Ergebnisse zu verlassen.',
            en: 'Check the current duel standing, see recent rivals, and jump into a rematch without leaving results.',
            pl: 'Sprawdź aktualny stan pojedynków, zobacz ostatnich rywali i wejdź w rewanż bez wychodzenia z wyników.',
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <KangurMobileSummaryChip
          label={copy({
            de: `Rivalen ${duelResults.opponents.length}`,
            en: `Rivals ${duelResults.opponents.length}`,
            pl: `Rywale ${duelResults.opponents.length}`,
          })}
          backgroundColor='#eff6ff'
          borderColor='#bfdbfe'
          textColor='#1d4ed8'
        />
        <KangurMobileSummaryChip
          label={
            duelResults.currentRank
              ? copy({
                  de: `Deine Position #${duelResults.currentRank}`,
                  en: `Your rank #${duelResults.currentRank}`,
                  pl: `Twoja pozycja #${duelResults.currentRank}`,
                })
              : copy({
                  de: 'Wartet auf Sichtbarkeit',
                  en: 'Waiting for visibility',
                  pl: 'Czeka na widoczność',
                })
          }
          backgroundColor='#ecfdf5'
          borderColor='#a7f3d0'
          textColor='#047857'
        />
      </View>

      {duelResults.isRestoringAuth || duelResults.isLoading ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Der Duellstand in den Ergebnissen wird geladen.',
            en: 'Loading the duel standing in results.',
            pl: 'Pobieramy stan pojedynków w wynikach.',
          })}
        </Text>
      ) : duelResults.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
            {duelResults.error}
          </Text>
          <ActionButton
            label={copy({
              de: 'Duelle aktualisieren',
              en: 'Refresh duels',
              pl: 'Odśwież pojedynki',
            })}
            onPress={() => duelResults.refresh()}
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {duelResults.currentEntry ? (
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
                #{duelResults.currentRank} {duelResults.currentEntry.displayName}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: `Siege ${duelResults.currentEntry.wins} • Niederlagen ${duelResults.currentEntry.losses} • Unentschieden ${duelResults.currentEntry.ties}`,
                  en: `Wins ${duelResults.currentEntry.wins} • Losses ${duelResults.currentEntry.losses} • Ties ${duelResults.currentEntry.ties}`,
                  pl: `Wygrane ${duelResults.currentEntry.wins} • Porażki ${duelResults.currentEntry.losses} • Remisy ${duelResults.currentEntry.ties}`,
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                {copy({
                  de: `Matches ${duelResults.currentEntry.matches} • Quote ${Math.round(duelResults.currentEntry.winRate * 100)}% • letztes Duell ${formatKangurMobileScoreDateTime(duelResults.currentEntry.lastPlayedAt, locale)}`,
                  en: `Matches ${duelResults.currentEntry.matches} • Win rate ${Math.round(duelResults.currentEntry.winRate * 100)}% • last duel ${formatKangurMobileScoreDateTime(duelResults.currentEntry.lastPlayedAt, locale)}`,
                  pl: `Mecze ${duelResults.currentEntry.matches} • Win rate ${Math.round(duelResults.currentEntry.winRate * 100)}% • ostatni pojedynek ${formatKangurMobileScoreDateTime(duelResults.currentEntry.lastPlayedAt, locale)}`,
                })}
              </Text>
            </InsetPanel>
          ) : (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
              })}
            </Text>
          )}

          {duelResults.actionError ? (
            <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
              {duelResults.actionError}
            </Text>
          ) : null}

          {duelResults.opponents.length === 0 ? (
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
              {duelResults.opponents.map((opponent) => (
                <InsetPanel
                  key={opponent.learnerId}
                  gap={8}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {opponent.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    {copy({
                      de: `Letztes Duell ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale)}`,
                      en: `Last duel ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale)}`,
                      pl: `Ostatni pojedynek ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale)}`,
                    })}
                  </Text>
                  <KangurMobilePendingActionButton
                    horizontalPadding={14}
                    label={copy({
                      de: 'Schneller Rückkampf',
                      en: 'Quick rematch',
                      pl: 'Szybki rewanż',
                    })}
                    onPress={() => {
                      void duelResults.createRematch(opponent.learnerId).then((sessionId) => {
                        if (sessionId) {
                          openDuelSession(sessionId);
                        }
                      });
                    }}
                    pending={duelResults.pendingOpponentLearnerId === opponent.learnerId}
                    pendingLabel={copy({
                      de: 'Rückkampf wird gesendet...',
                      en: 'Sending rematch...',
                      pl: 'Wysyłanie rewanżu...',
                    })}
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
              onPress={() => duelResults.refresh()}
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
