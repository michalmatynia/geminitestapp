import type { KangurDuelLeaderboardEntry } from '@kangur/contracts-duels';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import {
  KangurMobileActionButton,
  KangurMobileCard,
  KangurMobileInsetPanel,
  KangurMobileLinkButton,
  KangurMobilePendingActionButton,
  KangurMobileSummaryChip,
} from '../shared/KangurMobileUi';

type LeaderboardDuelsState = {
  actionError: string | null;
  challengeLearner: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: KangurDuelLeaderboardEntry | null;
  currentRank: number | null;
  entries: KangurDuelLeaderboardEntry[];
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingLearnerId: string | null;
  refresh: () => Promise<void>;
};

export function LeaderboardDuelsSection({
  duelLeaderboard,
  duelTopWinRatePercent,
  openDuelSession,
}: {
  duelLeaderboard: LeaderboardDuelsState;
  duelTopWinRatePercent: number | null;
  openDuelSession: (sessionId: string) => void;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <KangurMobileCard gap={14}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Duell-Rangliste',
            en: 'Duel leaderboard',
            pl: 'Ranking pojedynków',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {copy({
            de: 'Rivalentabelle',
            en: 'Rivals board',
            pl: 'Tabela rywali',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Vergleiche die aktuelle Form, prüfe ob dein Stand schon sichtbar ist und fordere Rivalen direkt von hier aus heraus.',
            en: 'Compare current form, check whether your standing is already visible, and challenge a rival right from here.',
            pl: 'Porównaj bieżącą formę, sprawdź czy Twój wynik jest już widoczny i rzuć wyzwanie od razu stąd.',
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <KangurMobileSummaryChip
          label={copy({
            de: `Spieler ${duelLeaderboard.entries.length}`,
            en: `Players ${duelLeaderboard.entries.length}`,
            pl: `Gracze ${duelLeaderboard.entries.length}`,
          })}
          backgroundColor='#eff6ff'
          borderColor='#bfdbfe'
          textColor='#1d4ed8'
        />
        <KangurMobileSummaryChip
          label={
            duelTopWinRatePercent === null
              ? copy({
                  de: 'Top-Quote wartet',
                  en: 'Top win rate pending',
                  pl: 'Top win rate czeka',
                })
              : copy({
                  de: `Top-Quote ${duelTopWinRatePercent}%`,
                  en: `Top win rate ${duelTopWinRatePercent}%`,
                  pl: `Top win rate ${duelTopWinRatePercent}%`,
                })
          }
          backgroundColor='#fffbeb'
          borderColor='#fde68a'
          textColor='#b45309'
        />
        <KangurMobileSummaryChip
          label={
            duelLeaderboard.currentRank
              ? copy({
                  de: `Deine Position #${duelLeaderboard.currentRank}`,
                  en: `Your rank #${duelLeaderboard.currentRank}`,
                  pl: `Twoja pozycja #${duelLeaderboard.currentRank}`,
                })
              : duelLeaderboard.isAuthenticated
                ? copy({
                    de: 'Wartet auf Sichtbarkeit',
                    en: 'Waiting for visibility',
                    pl: 'Czeka na widoczność',
                  })
                : copy({
                    de: 'Anmelden',
                    en: 'Sign in',
                    pl: 'Zaloguj się',
                  })
          }
          backgroundColor='#ecfdf5'
          borderColor='#a7f3d0'
          textColor='#047857'
        />
      </View>

      {duelLeaderboard.isLoading ? (
        <Text style={{ color: '#334155', fontSize: 15 }}>
          {copy({
            de: 'Die Duell-Rangliste wird geladen...',
            en: 'Loading duel leaderboard...',
            pl: 'Ładujemy ranking pojedynków...',
          })}
        </Text>
      ) : duelLeaderboard.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#991b1b', fontSize: 14, lineHeight: 21 }}>
            {duelLeaderboard.error}
          </Text>
          <KangurMobileActionButton
            centered
            onPress={() => {
              void duelLeaderboard.refresh();
            }}
            label={copy({
              de: 'Duelle aktualisieren',
              en: 'Refresh duels',
              pl: 'Odśwież pojedynki',
            })}
          />
        </View>
      ) : duelLeaderboard.entries.length === 0 ? (
        <Text style={{ color: '#334155', fontSize: 15 }}>
          {copy({
            de: 'Es gibt in diesem Fenster noch keine abgeschlossenen Duelle. Die ersten beendeten Matches füllen hier sofort die Rivalentabelle.',
            en: 'There are no completed duels in this window yet. The first finished matches will fill the rivals table here right away.',
            pl: 'Nie ma jeszcze zakończonych pojedynków w tym oknie. Pierwsze skończone mecze od razu wypełnią tutaj tabelę rywali.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {duelLeaderboard.isAuthenticated ? (
            duelLeaderboard.currentEntry ? (
              <KangurMobileInsetPanel
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
                  #{duelLeaderboard.currentRank} {duelLeaderboard.currentEntry.displayName}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: `Siege ${duelLeaderboard.currentEntry.wins} • Niederlagen ${duelLeaderboard.currentEntry.losses} • Unentschieden ${duelLeaderboard.currentEntry.ties}`,
                    en: `Wins ${duelLeaderboard.currentEntry.wins} • Losses ${duelLeaderboard.currentEntry.losses} • Ties ${duelLeaderboard.currentEntry.ties}`,
                    pl: `Wygrane ${duelLeaderboard.currentEntry.wins} • Porażki ${duelLeaderboard.currentEntry.losses} • Remisy ${duelLeaderboard.currentEntry.ties}`,
                  })}
                </Text>
              </KangurMobileInsetPanel>
            ) : (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                  en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                  pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                })}
              </Text>
            )
          ) : (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Melde dich an, damit deine eigene Position hier hervorgehoben wird.',
                en: 'Sign in so your own standing can be highlighted here.',
                pl: 'Zaloguj się, aby wyróżnić tutaj Twoją pozycję.',
              })}
            </Text>
          )}

          {duelLeaderboard.actionError ? (
            <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
              {duelLeaderboard.actionError}
            </Text>
          ) : null}

          <View style={{ gap: 10 }}>
            {duelLeaderboard.entries.map((entry, index) => {
              const isCurrentLearner =
                duelLeaderboard.currentEntry?.learnerId === entry.learnerId;

              return (
                <View
                  key={entry.learnerId}
                  style={{ gap: 8 }}
                >
                  <KangurMobileInsetPanel
                    gap={8}
                    style={{
                      borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0',
                      backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc',
                    }}
                  >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
                        #{index + 1}
                      </Text>
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                          {entry.displayName}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 13 }}>
                          {copy({
                            de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
                            en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
                            pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
                          })}
                        </Text>
                      </View>
                    </View>

                    {isCurrentLearner ? (
                      <View
                        style={{
                          borderRadius: 999,
                          backgroundColor: '#1d4ed8',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                          {copy({
                            de: 'Du',
                            en: 'You',
                            pl: 'Ty',
                          })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 19 }}>
                    {copy({
                      de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatKangurMobileScoreDateTime(entry.lastPlayedAt, locale)}`,
                      en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatKangurMobileScoreDateTime(entry.lastPlayedAt, locale)}`,
                      pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatKangurMobileScoreDateTime(entry.lastPlayedAt, locale)}`,
                    })}
                  </Text>

                  {duelLeaderboard.isAuthenticated && !isCurrentLearner ? (
                    <KangurMobilePendingActionButton
                      horizontalPadding={12}
                      label={copy({
                        de: 'Herausfordern',
                        en: 'Challenge player',
                        pl: 'Rzuć wyzwanie',
                      })}
                      onPress={() => {
                        void duelLeaderboard.challengeLearner(entry.learnerId).then((sessionId) => {
                          if (sessionId) {
                            openDuelSession(sessionId);
                          }
                        });
                      }}
                      pending={duelLeaderboard.pendingLearnerId === entry.learnerId}
                      pendingLabel={copy({
                        de: 'Duell wird gesendet...',
                        en: 'Sending duel...',
                        pl: 'Wysyłanie pojedynku...',
                      })}
                      verticalPadding={9}
                    />
                  ) : null}
                  </KangurMobileInsetPanel>
                </View>
              );
            })}
          </View>

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <KangurMobileActionButton
              centered
              onPress={() => {
                void duelLeaderboard.refresh();
              }}
              label={copy({
                de: 'Duelle aktualisieren',
                en: 'Refresh duels',
                pl: 'Odśwież pojedynki',
              })}
              stretch
              tone='secondary'
            />

            <KangurMobileLinkButton
              centered
              href={createKangurDuelsHref()}
              label={copy({
                de: 'Duelle öffnen',
                en: 'Open duels',
                pl: 'Otwórz pojedynki',
              })}
              stretch
              tone='primary'
            />
          </View>
        </View>
      )}
    </KangurMobileCard>
  );
}
