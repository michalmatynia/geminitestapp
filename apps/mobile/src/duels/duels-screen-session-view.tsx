import type { KangurDuelChoice } from '@kangur/contracts';
import { Text, View } from 'react-native';

import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
  BadgesCard,
  LessonCheckpointsCard,
  LessonMasteryCard,
  MessageCard,
  NextStepsCard,
} from './duels-primitives';
import {
  DUEL_REACTION_OPTIONS,
  formatDifficultyLabel,
  formatModeLabel,
  formatOperationLabel,
  formatPlayerStatusLabel,
  formatQuestionProgress,
  formatReactionLabel,
  formatRelativeAge,
  formatRoundProgressLabel,
  formatSeriesProgress,
  formatSeriesSummary,
  formatSeriesTitle,
  formatSpectatorQuestionProgress,
  formatStatusLabel,
  getPlayerStatusTone,
  getStatusTone,
  resolveRoundProgress,
  resolveSeriesWins,
  resolveWinnerSummary,
} from './duels-utils';

type DuelCopy = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['copy'];
type DuelLocale = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['locale'];
type DuelSessionState = ReturnType<
  (typeof import('./useKangurMobileDuelSession'))['useKangurMobileDuelSession']
>;
type DuelRoundProgress = ReturnType<typeof resolveRoundProgress>;

type DuelsSessionViewProps = {
  canShareInvite: boolean;
  copy: DuelCopy;
  duel: DuelSessionState;
  hasWaitingSession: boolean;
  inviteeName: string;
  inviteShareError: string | null;
  isFinishedSession: boolean;
  isLoadingAuth: boolean;
  isLobbyActionPending: boolean;
  locale: DuelLocale;
  loginCallToAction: React.JSX.Element;
  onHandleInviteShare: () => Promise<void>;
  onHandleRematch: () => Promise<void>;
  onOpenLobby: () => void;
  roundProgress: DuelRoundProgress;
  sessionTimelineItems: string[];
};

export function DuelsSessionView({
  canShareInvite,
  copy,
  duel,
  hasWaitingSession,
  inviteeName,
  inviteShareError,
  isFinishedSession,
  isLoadingAuth,
  isLobbyActionPending,
  locale,
  loginCallToAction,
  onHandleInviteShare,
  onHandleRematch,
  onOpenLobby,
  roundProgress,
  sessionTimelineItems,
}: DuelsSessionViewProps): React.JSX.Element {
  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
      <View style={{ gap: 14 }}>
        <ActionButton
          label={copy({
            de: 'Zurück zur Lobby',
            en: 'Back to lobby',
            pl: 'Wróć do lobby',
          })}
          onPress={onOpenLobby}
          tone='ghost'
        />
        <KangurMobileSectionTitle
          title={
            duel.isSpectating
              ? copy({
                  de: 'Öffentliches Duell',
                  en: 'Public duel',
                  pl: 'Publiczny pojedynek',
                })
              : copy({
                  de: 'Duell',
                  en: 'Duel',
                  pl: 'Pojedynek',
                })
          }
          subtitle={
            duel.isSpectating
              ? copy({
                  de: 'Im Zuschauermodus verfolgst du das öffentliche Duell und die Reaktionen, ohne als Spieler beizutreten.',
                  en: 'In spectator mode, you follow the public duel and reactions without joining as a player.',
                  pl: 'W trybie obserwatora śledzisz publiczny pojedynek i reakcje bez dołączania jako gracz.',
                })
              : copy({
                  de: 'Hier kannst du im Warteraum bleiben, den Spielfortschritt verfolgen und den Rundenstatus prüfen, ohne das Duell zu verlassen.',
                  en: 'Here you can stay in the waiting room, follow player progress, and check round status without leaving the duel.',
                  pl: 'Tutaj możesz zostać w poczekalni, śledzić postęp graczy i sprawdzać stan rundy bez wychodzenia z pojedynku.',
                })
          }
        />
      </View>

      {!duel.isSpectating && !duel.isAuthenticated && !isLoadingAuth ? (
        <Card>
          <MessageCard
            title={copy({
              de: 'Anmelden, um dieses Duell zu öffnen',
              en: 'Sign in to open this duel',
              pl: 'Zaloguj się, aby otworzyć ten pojedynek',
            })}
            description={copy({
              de: 'Melde dich zuerst an, dann kannst du dieses Duell öffnen.',
              en: 'Sign in first to open this duel.',
              pl: 'Najpierw się zaloguj, aby otworzyć ten pojedynek.',
            })}
          />
          {loginCallToAction}
        </Card>
      ) : duel.isLoading ? (
        <Card>
          <MessageCard
            title={
              duel.isSpectating
                ? copy({
                    de: 'Öffentliches Duell wird geladen',
                    en: 'Loading public duel',
                    pl: 'Ładujemy publiczny pojedynek',
                  })
                : copy({
                    de: 'Duell wird geladen',
                    en: 'Loading duel',
                    pl: 'Ładujemy pojedynek',
                  })
            }
            description={
              duel.isRestoringAuth
                ? copy({
                    de: 'Die Anmeldung wird wiederhergestellt und das aktive Duell geladen.',
                    en: 'Restoring sign-in and loading the active duel.',
                    pl: 'Przywracamy logowanie i pobieramy aktywny pojedynek.',
                  })
                : duel.isSpectating
                  ? copy({
                      de: 'Der öffentliche Rundenstatus, die Spielerliste und die Zahl der Zuschauer werden geladen.',
                      en: 'Loading the public round state, player list, and spectator count.',
                      pl: 'Pobieramy publiczny stan rundy, listę graczy i liczbę widzów.',
                    })
                  : copy({
                      de: 'Der aktuelle Rundenstatus und die Spielerliste werden geladen.',
                      en: 'Loading the current round state and player list.',
                      pl: 'Pobieramy aktualny stan rundy i listę graczy.',
                    })
            }
          />
        </Card>
      ) : duel.error || !duel.session || (!duel.isSpectating && !duel.player) ? (
        <Card>
          <MessageCard
            title={
              duel.isSpectating
                ? copy({
                    de: 'Öffentliches Duell konnte nicht geöffnet werden',
                    en: 'Could not open the public duel',
                    pl: 'Nie udało się otworzyć publicznego pojedynku',
                  })
                : copy({
                    de: 'Duell konnte nicht geöffnet werden',
                    en: 'Could not open the duel',
                    pl: 'Nie udało się otworzyć pojedynku',
                  })
            }
            description={
              duel.error ??
              (duel.isSpectating
                ? copy({
                    de: 'Es fehlen öffentliche Duelldaten. Kehre zur Lobby zurück und versuche es erneut.',
                    en: 'Public duel details are missing. Go back to the lobby and try again.',
                    pl: 'Brakuje danych publicznego pojedynku. Wróć do lobby i spróbuj jeszcze raz.',
                  })
                : copy({
                    de: 'Es fehlen Duelldaten. Kehre zur Lobby zurück und versuche es erneut.',
                    en: 'The duel data is missing. Go back to the lobby and try again.',
                    pl: 'Brakuje danych pojedynku. Wróć do lobby i spróbuj jeszcze raz.',
                  }))
            }
            tone='error'
          />
          <ActionButton
            label={copy({
              de: 'Zurück zur Lobby',
              en: 'Back to lobby',
              pl: 'Wróć do lobby',
            })}
            onPress={onOpenLobby}
            stretch
          />
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: `Sitzung ${duel.session.id}`,
                  en: `Session ${duel.session.id}`,
                  pl: `Sesja ${duel.session.id}`,
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {formatModeLabel(duel.session.mode, locale)} ·{' '}
                {formatOperationLabel(duel.session.operation, locale)}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {locale === 'de'
                  ? `${duel.session.questionCount} Fragen · ${duel.session.timePerQuestionSec}s pro Antwort · ${formatDifficultyLabel(duel.session.difficulty, locale)}`
                  : locale === 'en'
                    ? `${duel.session.questionCount} questions · ${duel.session.timePerQuestionSec}s per answer · ${formatDifficultyLabel(duel.session.difficulty, locale)}`
                    : `${duel.session.questionCount} pytań · ${duel.session.timePerQuestionSec}s na odpowiedź · ${formatDifficultyLabel(duel.session.difficulty, locale)}`}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={formatStatusLabel(duel.session.status, locale)}
                tone={getStatusTone(duel.session.status)}
              />
              <Pill
                label={
                  duel.session.visibility === 'private'
                    ? copy({
                        de: 'Privat',
                        en: 'Private',
                        pl: 'Prywatny',
                      })
                    : copy({
                        de: 'Öffentlich',
                        en: 'Public',
                        pl: 'Publiczny',
                      })
                }
                tone={{
                  backgroundColor: '#f8fafc',
                  borderColor: '#cbd5e1',
                  textColor: '#475569',
                }}
              />
              <Pill
                label={
                  duel.player
                    ? formatQuestionProgress(duel.session, duel.player, locale)
                    : formatSpectatorQuestionProgress(duel.session, locale)
                }
                tone={{
                  backgroundColor: '#eff6ff',
                  borderColor: '#bfdbfe',
                  textColor: '#1d4ed8',
                }}
              />
              {duel.isSpectating || duel.spectatorCount > 0 ? (
                <Pill
                  label={copy({
                    de: `Zuschauer ${duel.spectatorCount}`,
                    en: `Audience ${duel.spectatorCount}`,
                    pl: `Widownia ${duel.spectatorCount}`,
                  })}
                  tone={{
                    backgroundColor: '#f5f3ff',
                    borderColor: '#ddd6fe',
                    textColor: '#6d28d9',
                  }}
                />
              ) : null}
              {duel.session.series ? (
                <Pill
                  label={formatSeriesTitle(duel.session.series, locale)}
                  tone={{
                    backgroundColor: '#f5f3ff',
                    borderColor: '#ddd6fe',
                    textColor: '#6d28d9',
                  }}
                />
              ) : null}
            </View>

            {roundProgress && !hasWaitingSession ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {formatRoundProgressLabel(roundProgress, locale)}
                </Text>
                <View
                  style={{
                    height: 10,
                    width: '100%',
                    borderRadius: 999,
                    backgroundColor: '#e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${roundProgress.percent}%`,
                      borderRadius: 999,
                      backgroundColor:
                        duel.session.status === 'completed' ||
                        duel.session.status === 'aborted'
                          ? '#16a34a'
                          : '#1d4ed8',
                    }}
                  />
                </View>
              </View>
            ) : null}

            {sessionTimelineItems.length > 0 ? (
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 8,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Zeitachse der Sitzung',
                    en: 'Session timeline',
                    pl: 'Oś sesji',
                  })}
                </Text>
                <View style={{ gap: 6 }}>
                  {sessionTimelineItems.map((item) => (
                    <Text
                      key={item}
                      style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}
                    >
                      {item}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {duel.isSpectating ? (
              <MessageCard
                title={copy({
                  de: 'Zuschauermodus',
                  en: 'Spectator mode',
                  pl: 'Tryb obserwatora',
                })}
                description={
                  duel.isAuthenticated
                    ? copy({
                        de: 'Du beobachtest das öffentliche Duell. Du kannst Reaktionen senden, beantwortest aber keine Fragen.',
                        en: 'You are watching the public duel. You can send reactions, but you do not answer questions.',
                        pl: 'Obserwujesz publiczny pojedynek. Możesz wysyłać reakcje, ale nie odpowiadasz na pytania.',
                      })
                    : copy({
                        de: 'Du beobachtest das öffentliche Duell. Melde dich an, wenn du Reaktionen senden möchtest.',
                        en: 'You are watching the public duel. Sign in if you want to send reactions.',
                        pl: 'Obserwujesz publiczny pojedynek. Zaloguj się, jeśli chcesz wysyłać reakcje.',
                      })
                }
              />
            ) : null}

            {duel.actionError ? (
              <MessageCard
                title={copy({
                  de: 'Aktion fehlgeschlagen',
                  en: 'Action failed',
                  pl: 'Akcja nie powiodła się',
                })}
                description={duel.actionError}
                tone='error'
              />
            ) : null}
          </Card>

          {duel.session.series ? (
            <Card>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {copy({
                  de: 'Serie',
                  en: 'Series',
                  pl: 'Seria',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {formatSeriesProgress(duel.session.series, locale)}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                {formatSeriesSummary(duel.session.series, duel.session.players, locale)}
              </Text>
            </Card>
          ) : null}

          <Card>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
              {copy({
                de: 'Spieler',
                en: 'Players',
                pl: 'Gracze',
              })}
            </Text>
            <View style={{ gap: 10 }}>
              {duel.session.players.map((player) => (
                <View
                  key={player.learnerId}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor:
                      player.learnerId === duel.player?.learnerId ? '#bfdbfe' : '#e2e8f0',
                    backgroundColor:
                      player.learnerId === duel.player?.learnerId ? '#eff6ff' : '#f8fafc',
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                      {player.displayName}
                    </Text>
                    <Pill
                      label={formatPlayerStatusLabel(player.status, locale)}
                      tone={getPlayerStatusTone(player.status)}
                    />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: '#475569', lineHeight: 20 }}>
                      {locale === 'de'
                        ? `Punktzahl ${player.score}${player.bonusPoints ? ` + ${player.bonusPoints} Bonus` : ''}`
                        : locale === 'en'
                          ? `Score ${player.score}${player.bonusPoints ? ` + ${player.bonusPoints} bonus` : ''}`
                          : `Wynik ${player.score}${player.bonusPoints ? ` + ${player.bonusPoints} bonus` : ''}`}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                      {formatQuestionProgress(duel.session, player, locale)}
                    </Text>
                  </View>
                  {duel.session.series ? (
                    <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                      {copy({
                        de: 'Gewonnene Spiele in der Serie:',
                        en: 'Series games won:',
                        pl: 'Wygrane gry w serii:',
                      })}{' '}
                      {resolveSeriesWins(duel.session.series, player.learnerId)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
              {copy({
                de: 'Reaktionen',
                en: 'Reactions',
                pl: 'Reakcje',
              })}
            </Text>
            {duel.session.status === 'completed' || duel.session.status === 'aborted' ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die Sitzung ist beendet, aber die letzten Reaktionen bleiben weiter unten sichtbar.',
                  en: 'The session is finished, but the latest reactions remain visible below.',
                  pl: 'Sesja jest zakończona, ale ostatnie reakcje nadal widać poniżej.',
                })}
              </Text>
            ) : !duel.isAuthenticated ? (
              <MessageCard
                title={copy({
                  de: 'Reaktionen nur für angemeldete Nutzer',
                  en: 'Reactions for signed-in users',
                  pl: 'Reakcje dla zalogowanych',
                })}
                description={copy({
                  de: 'Ein angemeldeter Lernender kann live mit Emojis auf den Duellverlauf reagieren.',
                  en: 'A signed-in learner can react to the duel live with emoji.',
                  pl: 'Zalogowany uczeń może reagować na przebieg pojedynku emotkami na żywo.',
                })}
              />
            ) : (
              <>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {duel.isSpectating
                    ? copy({
                        de: 'Sende eine schnelle Reaktion, während du das Duell beobachtest.',
                        en: 'Send a quick reaction while watching the duel.',
                        pl: 'Wyślij szybką reakcję podczas oglądania pojedynku.',
                      })
                    : copy({
                        de: 'Sende eine schnelle Reaktion, ohne das Duell zu verlassen.',
                        en: 'Send a quick reaction without leaving the duel.',
                        pl: 'Wyślij szybką reakcję bez opuszczania pojedynku.',
                      })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {DUEL_REACTION_OPTIONS.map((type) => (
                    <ActionButton
                      key={type}
                      disabled={duel.isMutating}
                      label={formatReactionLabel(type, locale)}
                      onPress={async () => {
                        await duel.sendReaction(type);
                      }}
                      tone='secondary'
                    />
                  ))}
                </View>
              </>
            )}

            {duel.session.recentReactions?.length ? (
              <View style={{ gap: 10 }}>
                {duel.session.recentReactions
                  .slice(-6)
                  .reverse()
                  .map((reaction) => (
                    <View
                      key={reaction.id}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor:
                          reaction.learnerId === duel.player?.learnerId
                            ? '#bfdbfe'
                            : '#e2e8f0',
                        backgroundColor:
                          reaction.learnerId === duel.player?.learnerId
                            ? '#eff6ff'
                            : '#f8fafc',
                        gap: 6,
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                        {formatReactionLabel(reaction.type, locale)}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                        {reaction.displayName} · {formatRelativeAge(reaction.createdAt, locale)}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <MessageCard
                title={copy({
                  de: 'Keine Reaktionen',
                  en: 'No reactions',
                  pl: 'Brak reakcji',
                })}
                description={copy({
                  de: 'Nach dem ersten Emoji erscheint die Reaktionshistorie hier.',
                  en: 'After the first emoji, the reaction history will appear here.',
                  pl: 'Po pierwszej emotce historia reakcji pojawi się tutaj.',
                })}
              />
            )}
          </Card>

          {hasWaitingSession ? (
            <Card>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {duel.isSpectating
                  ? copy({
                      de: 'Warteraum des öffentlichen Duells',
                      en: 'Public duel waiting room',
                      pl: 'Poczekalnia publicznego pojedynku',
                    })
                  : copy({
                      de: 'Duell-Warteraum',
                      en: 'Duel waiting room',
                      pl: 'Poczekalnia pojedynku',
                    })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {duel.isSpectating
                  ? copy({
                      de: 'Du beobachtest die Wartephase. Sobald die benötigten Spieler beigetreten sind, beginnt die aktive Runde automatisch.',
                      en: 'You are watching the waiting phase. Once the required players join, the active round will begin automatically.',
                      pl: 'Obserwujesz etap oczekiwania. Gdy wymagani gracze dołączą, aktywna runda zacznie się automatycznie.',
                    })
                  : copy({
                      de: 'Wir warten, bis alle Spieler beitreten. Wenn die zweite Person in der Lobby erscheint, startet das Duell automatisch.',
                      en: 'Waiting for all players to join. When the second player appears in the lobby, the duel will start automatically.',
                      pl: 'Czekamy, aż wszyscy gracze dołączą. Gdy druga osoba pojawi się w lobby, pojedynek wystartuje automatycznie.',
                    })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                {copy({
                  de: `Minimale Spielerzahl zum Start: ${duel.session.minPlayersToStart ?? 2}`,
                  en: `Minimum players to start: ${duel.session.minPlayersToStart ?? 2}`,
                  pl: `Minimalna liczba graczy do startu: ${duel.session.minPlayersToStart ?? 2}`,
                })}
              </Text>
              {canShareInvite ? (
                <View style={{ gap: 8 }}>
                  <MessageCard
                    title={copy({
                      de: 'Einladung teilen',
                      en: 'Share invite',
                      pl: 'Udostępnij zaproszenie',
                    })}
                    description={copy({
                      de: `Sende ${inviteeName} einen direkten Link, damit das private Duell sofort ohne Suche in der Lobby geöffnet werden kann.`,
                      en: `Send a direct link to ${inviteeName} so the private duel opens right away without searching in the lobby.`,
                      pl: `Wyślij bezpośredni link do ${inviteeName}, aby prywatny pojedynek otworzył się od razu bez szukania go w lobby.`,
                    })}
                  />
                  <ActionButton
                    label={copy({
                      de: 'Einladungslink teilen',
                      en: 'Share invite link',
                      pl: 'Udostępnij link zaproszenia',
                    })}
                    onPress={onHandleInviteShare}
                    stretch
                    tone='secondary'
                  />
                  {inviteShareError ? (
                    <MessageCard
                      title={copy({
                        de: 'Einladung konnte nicht geteilt werden',
                        en: 'Could not share the invite',
                        pl: 'Nie udało się udostępnić zaproszenia',
                      })}
                      description={inviteShareError}
                      tone='error'
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>
          ) : null}

          {duel.session.status === 'in_progress' && duel.currentQuestion ? (
            <Card>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {copy({
                  de: 'Aktuelle Frage',
                  en: 'Current question',
                  pl: 'Aktualne pytanie',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 22 }}>
                {duel.currentQuestion.prompt}
              </Text>
              {duel.isSpectating ? (
                <>
                  <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                    {copy({
                      de: 'Zuschauer senden keine Antworten, können aber Frage und Spieltempo verfolgen.',
                      en: 'Spectators do not send answers, but they can follow the question and match pace.',
                      pl: 'Widz nie wysyła odpowiedzi, ale może śledzić pytanie i tempo meczu.',
                    })}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {duel.currentQuestion.choices.map((choice, index) => (
                      <View
                        key={`spectator-choice-${index}-${String(choice)}`}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          backgroundColor: '#f8fafc',
                          padding: 12,
                        }}
                      >
                        <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                          {copy({
                            de: `Option ${index + 1}: ${String(choice)}`,
                            en: `Option ${index + 1}: ${String(choice)}`,
                            pl: `Opcja ${index + 1}: ${String(choice)}`,
                          })}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={{ gap: 8 }}>
                  {duel.currentQuestion.choices.map((choice, index) => (
                    <ActionButton
                      key={`duel-choice-${index}-${String(choice)}`}
                      disabled={duel.isMutating}
                      label={copy({
                        de: `Antwort: ${String(choice)}`,
                        en: `Answer: ${String(choice)}`,
                        pl: `Odpowiedź: ${String(choice)}`,
                      })}
                      onPress={async () => {
                        await duel.submitAnswer(choice as KangurDuelChoice);
                      }}
                      stretch
                      tone='secondary'
                    />
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          {isFinishedSession ? (
            <Card>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {copy({
                  de: 'Zusammenfassung',
                  en: 'Summary',
                  pl: 'Podsumowanie',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {resolveWinnerSummary(duel.session.players, locale)}
              </Text>
              {!duel.isSpectating && duel.isAuthenticated ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                    {copy({
                      de: 'Das Rückspiel behält denselben Modus, dieselbe Rechenart, denselben Schwierigkeitsgrad und dasselbe Serienformat.',
                      en: 'The rematch will keep the same mode, operation, difficulty, and series format.',
                      pl: 'Rewanż zachowa ten sam tryb, działanie, poziom i format serii.',
                    })}
                  </Text>
                  <ActionButton
                    disabled={isLobbyActionPending}
                    label={copy({
                      de: 'Rückspiel starten',
                      en: 'Play rematch',
                      pl: 'Zagraj rewanż',
                    })}
                    onPress={onHandleRematch}
                    stretch
                  />
                  <ActionButton
                    label={copy({
                      de: 'Zurück zur Lobby',
                      en: 'Back to lobby',
                      pl: 'Wróć do lobby',
                    })}
                    onPress={onOpenLobby}
                    stretch
                    tone='secondary'
                  />
                </View>
              ) : (
                <ActionButton
                  label={copy({
                    de: 'Zurück zur Lobby',
                    en: 'Back to lobby',
                    pl: 'Wróć do lobby',
                  })}
                  onPress={onOpenLobby}
                  stretch
                />
              )}
            </Card>
          ) : null}

          {!isFinishedSession ? (
            <Card>
              <View style={{ gap: 8 }}>
                <ActionButton
                  disabled={duel.isMutating}
                  label={
                    duel.isSpectating
                      ? copy({
                          de: 'Öffentliches Duell aktualisieren',
                          en: 'Refresh public duel',
                          pl: 'Odśwież publiczny pojedynek',
                        })
                      : copy({
                          de: 'Duellstatus aktualisieren',
                          en: 'Refresh duel state',
                          pl: 'Odśwież stan pojedynku',
                        })
                  }
                  onPress={duel.refresh}
                  stretch
                  tone='secondary'
                />
                {duel.isSpectating ? (
                  <ActionButton
                    label={copy({
                      de: 'Zurück zur Lobby',
                      en: 'Back to lobby',
                      pl: 'Wróć do lobby',
                    })}
                    onPress={onOpenLobby}
                    stretch
                  />
                ) : (
                  <ActionButton
                    disabled={duel.isMutating}
                    label={copy({
                      de: hasWaitingSession ? 'Duell absagen' : 'Duell verlassen',
                      en: hasWaitingSession ? 'Cancel duel' : 'Leave duel',
                      pl: hasWaitingSession ? 'Anuluj pojedynek' : 'Opuść pojedynek',
                    })}
                    onPress={async () => {
                      const didLeave = await duel.leaveSession();
                      if (didLeave) {
                        onOpenLobby();
                      }
                    }}
                    stretch
                  />
                )}
              </View>
            </Card>
          ) : null}

          <LessonCheckpointsCard context='session' />
          <LessonMasteryCard context='session' />
          <BadgesCard context='session' />
          <NextStepsCard context='session' />
        </>
      )}
    </KangurMobileScrollScreen>
  );
}
