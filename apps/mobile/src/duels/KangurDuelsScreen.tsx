import type { KangurDuelChoice } from '@kangur/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import {
  KangurMobileCard as Card,
  KangurMobileFilterChip,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { shareKangurDuelInvite } from './duelInviteShare';
import { createKangurDuelsHref } from './duelsHref';
import {
  ActionButton,
  AutoRefreshChip,
  BadgesCard,
  LessonCheckpointsCard,
  LessonMasteryCard,
  LinkButton,
  LobbyEntryCard,
  MessageCard,
  NextStepsCard,
} from './duels-primitives';
import {
  AUTO_REFRESH_INTERVAL_MS,
  DIFFICULTY_OPTIONS,
  DUEL_REACTION_OPTIONS,
  HOME_ROUTE,
  LOBBY_CHAT_PREVIEW_LIMIT,
  MODE_FILTER_OPTIONS,
  OPERATION_OPTIONS,
  SERIES_BEST_OF_OPTIONS,
  formatDifficultyLabel,
  formatLobbyChatSenderLabel,
  formatModeLabel,
  formatOperationLabel,
  formatPlayerStatusLabel,
  formatQuestionProgress,
  formatReactionLabel,
  formatRelativeAge,
  formatRoundProgressLabel,
  formatSeriesBestOfLabel,
  formatSeriesProgress,
  formatSeriesSummary,
  formatSeriesTitle,
  formatSpectatorQuestionProgress,
  formatStatusLabel,
  getPlayerStatusTone,
  getStatusTone,
  isWaitingSessionStatus,
  localizeDuelText,
  normalizeSeriesBestOf,
  resolveRoundProgress,
  resolveSeriesWins,
  resolveSessionIdParam,
  resolveSpectateParam,
  resolveWinnerSummary,
} from './duels-utils';
import { useKangurMobileDuelLobbyChat } from './useKangurMobileDuelLobbyChat';
import { useKangurMobileDuelSession } from './useKangurMobileDuelSession';
import { useKangurMobileDuelsLobby } from './useKangurMobileDuelsLobby';

export function KangurDuelsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{
    join?: string | string[];
    spectate?: string | string[];
    sessionId?: string | string[];
  }>();
  const router = useRouter();
  const {
    isLoadingAuth,
    session: authSession,
    signIn,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();
  const routeSessionId = resolveSessionIdParam(params.sessionId);
  const joinSessionId = routeSessionId
    ? null
    : resolveSessionIdParam(params.join);
  const sessionId = routeSessionId;
  const isSpectatingRoute = resolveSpectateParam(params.spectate);
  const lobby = useKangurMobileDuelsLobby();
  const chat = useKangurMobileDuelLobbyChat();
  const duel = useKangurMobileDuelSession(sessionId, {
    spectate: isSpectatingRoute,
  });
  const attemptedJoinSessionIdRef = useRef<string | null>(null);
  const activeLearnerId =
    authSession.user?.activeLearner?.id ?? authSession.user?.id ?? null;
  const [chatDraft, setChatDraft] = useState('');
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [inviteShareError, setInviteShareError] = useState<string | null>(null);
  const [routeJoinError, setRouteJoinError] = useState<string | null>(null);
  const [isJoiningFromRoute, setIsJoiningFromRoute] = useState(false);
  const lobbyChatPreview = chat.messages.slice(-LOBBY_CHAT_PREVIEW_LIMIT);
  const chatRemainingChars = Math.max(0, chat.maxMessageLength - chatDraft.length);
  const canSendChatMessage =
    chat.isAuthenticated &&
    !chat.isSending &&
    chatDraft.trim().length > 0 &&
    chatDraft.trim().length <= chat.maxMessageLength;
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const autoRefreshChipLabel = autoRefreshEnabled
    ? copy({
        de: 'Auto-Refresh (Ein)',
        en: 'Auto refresh (On)',
        pl: 'Auto odświeżanie (Włączone)',
      })
    : copy({
        de: 'Auto-Refresh (Aus)',
        en: 'Auto refresh (Off)',
        pl: 'Auto odświeżanie (Wyłączone)',
      });
  const trimmedSearchQuery = lobby.searchQuery.trim();
  const trimmedSearchSubmittedQuery = lobby.searchSubmittedQuery.trim();
  const searchStatusTone: Tone = lobby.isSearchLoading
    ? {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        textColor: '#b45309',
      }
    : trimmedSearchSubmittedQuery.length >= 2 || trimmedSearchQuery.length >= 2
      ? {
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          textColor: '#1d4ed8',
        }
      : {
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          textColor: '#475569',
        };
  const searchStatusLabel = lobby.isSearchLoading
    ? copy({
        de: 'Suche läuft',
        en: 'Searching',
        pl: 'Trwa wyszukiwanie',
      })
    : trimmedSearchSubmittedQuery.length >= 2
      ? copy({
          de: `Suche: ${trimmedSearchSubmittedQuery}`,
          en: `Search: ${trimmedSearchSubmittedQuery}`,
          pl: `Szukano: ${trimmedSearchSubmittedQuery}`,
        })
      : trimmedSearchQuery.length >= 2
        ? copy({
            de: `Bereit: ${trimmedSearchQuery}`,
            en: `Ready: ${trimmedSearchQuery}`,
            pl: `Gotowe: ${trimmedSearchQuery}`,
          })
        : lobby.isAuthenticated
          ? copy({
              de: 'Mindestens 2 Zeichen',
              en: 'At least 2 characters',
              pl: 'Co najmniej 2 znaki',
            })
          : copy({
              de: 'Anmeldung erforderlich',
              en: 'Sign-in required',
              pl: 'Wymaga logowania',
            });
  const hasWaitingSession = duel.session
    ? isWaitingSessionStatus(duel.session.status)
    : false;
  const isFinishedSession = duel.session
    ? duel.session.status === 'completed' || duel.session.status === 'aborted'
    : false;
  const roundProgress = duel.session
    ? resolveRoundProgress(duel.session, duel.player, duel.isSpectating)
    : null;
  const activePlayersCount =
    duel.session?.players.filter((player) => player.status !== 'left').length ?? 0;
  const hasPendingInvitedPlayer =
    duel.session?.players.some((player) => player.status === 'invited') ?? false;
  const isInvitedLearnerMissing = duel.session?.invitedLearnerId
    ? !duel.session.players.some(
        (player) =>
          player.learnerId === duel.session?.invitedLearnerId &&
          player.status !== 'left',
      )
    : false;
  const needsMorePlayersToStart = duel.session
    ? activePlayersCount < (duel.session.minPlayersToStart ?? 2)
    : false;
  const canShareInvite = Boolean(
    duel.session &&
      duel.player &&
      !duel.isSpectating &&
      duel.session.visibility === 'private' &&
      hasWaitingSession &&
      (hasPendingInvitedPlayer || isInvitedLearnerMissing || needsMorePlayersToStart),
  );
  const inviteeName =
    duel.session?.invitedLearnerName?.trim() ||
    copy({
      de: 'der zweiten Person',
      en: 'the other player',
      pl: 'drugiej osoby',
    });
  const sessionTimelineItems = duel.session
    ? [
        copy({
          de: `Erstellt ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
          en: `Created ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
          pl: `Utworzono ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
        }),
        duel.session.startedAt
          ? copy({
              de: `Gestartet ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
              en: `Started ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
              pl: `Rozpoczęto ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
            })
          : null,
        copy({
          de: `Zuletzt aktualisiert ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
          en: `Last updated ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
          pl: `Ostatnia aktualizacja ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
        }),
        duel.session.endedAt
          ? copy({
              de: `Beendet ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
              en: `Ended ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
              pl: `Zakończenie ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
            })
          : null,
      ].filter((item): item is string => Boolean(item))
    : [];

  const createLoginCallToAction = (label: string): React.JSX.Element =>
    supportsLearnerCredentials ? (
      <LinkButton href={HOME_ROUTE} label={label} stretch tone='primary' />
    ) : (
      <ActionButton label={label} onPress={signIn} stretch />
    );

  const openSession = (nextSessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId: nextSessionId }));
  };

  const openLobby = (): void => {
    router.replace(createKangurDuelsHref());
  };

  const handleRematch = async (): Promise<void> => {
    if (!duel.session || duel.isSpectating) {
      return;
    }

    const nextSeriesBestOf = normalizeSeriesBestOf(duel.session.series?.bestOf);
    const overrides = {
      difficulty: duel.session.difficulty,
      operation: duel.session.operation,
      seriesBestOf: nextSeriesBestOf,
    } as const;

    if (duel.session.visibility === 'private') {
      const opponentLearnerId =
        duel.session.players.find((player) => player.learnerId !== activeLearnerId)
          ?.learnerId ?? null;

      if (!opponentLearnerId) {
        return;
      }

      const nextSessionId = await lobby.createPrivateChallenge(
        opponentLearnerId,
        overrides,
      );
      if (nextSessionId) {
        openSession(nextSessionId);
      }
      return;
    }

    const nextSessionId =
      duel.session.mode === 'quick_match'
        ? await lobby.createQuickMatch(overrides)
        : await lobby.createPublicChallenge(overrides);
    if (nextSessionId) {
      openSession(nextSessionId);
    }
  };

  const handleInviteShare = async (): Promise<void> => {
    if (!duel.session || !duel.player || duel.isSpectating) {
      return;
    }

    setInviteShareError(null);

    try {
      await shareKangurDuelInvite({
        locale,
        sessionId: duel.session.id,
        sharerDisplayName: duel.player.displayName,
      });
    } catch (error) {
      setInviteShareError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : copy({
              de: 'Der Einladungslink konnte nicht geteilt werden.',
              en: 'Could not share the invite link.',
              pl: 'Nie udało się udostępnić linku do zaproszenia.',
            }),
      );
    }
  };

  const joinSessionFromRoute = async (): Promise<void> => {
    if (!joinSessionId) {
      return;
    }

    setRouteJoinError(null);
    setIsJoiningFromRoute(true);

    try {
      const nextSessionId = await lobby.joinDuel(joinSessionId);
      if (nextSessionId) {
        openSession(nextSessionId);
        return;
      }

      setRouteJoinError(
        lobby.actionError ??
          copy({
            de: 'Der Duell-Einladung konnte nicht beigetreten werden.',
            en: 'Could not join the duel invite.',
            pl: 'Nie udało się dołączyć do zaproszenia do pojedynku.',
          }),
      );
    } finally {
      setIsJoiningFromRoute(false);
    }
  };

  useEffect(() => {
    if (!joinSessionId || routeSessionId || isSpectatingRoute) {
      return;
    }

    if (!lobby.isAuthenticated || lobby.isLoadingAuth) {
      return;
    }

    if (attemptedJoinSessionIdRef.current === joinSessionId) {
      return;
    }

    attemptedJoinSessionIdRef.current = joinSessionId;
    void joinSessionFromRoute();
  }, [
    isSpectatingRoute,
    joinSessionId,
    lobby.isAuthenticated,
    lobby.isLoadingAuth,
    routeSessionId,
  ]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return undefined;
    }

    void lobby.refresh();
    const intervalId = setInterval(() => {
      void lobby.refresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, lobby.refresh]);

  const handleLobbyChatSend = async (): Promise<void> => {
    setChatActionError(null);

    const didSend = await chat.sendMessage(chatDraft);
    if (didSend) {
      setChatDraft('');
      return;
    }

    setChatActionError(
      copy({
        de: 'Die Nachricht konnte nicht in den Lobby-Chat gesendet werden.',
        en: 'Could not send the message to the lobby chat.',
        pl: 'Nie udało się wysłać wiadomości do czatu lobby.',
      }),
    );
  };

  const renderJoinAction = (targetSessionId: string): React.JSX.Element =>
    lobby.isAuthenticated ? (
      <ActionButton
        label={copy({
          de: 'Duell beitreten',
          en: 'Join duel',
          pl: 'Dołącz do pojedynku',
        })}
        onPress={async () => {
          const nextSessionId = await lobby.joinDuel(targetSessionId);
          if (nextSessionId) {
            openSession(nextSessionId);
          }
        }}
        stretch
      />
    ) : (
      createLoginCallToAction(
        copy({
          de: 'Anmelden, um beizutreten',
          en: 'Sign in to join',
          pl: 'Zaloguj, aby dołączyć',
        }),
      )
    );

  const renderSpectateAction = (targetSessionId: string): React.JSX.Element => (
    <LinkButton
      href={createKangurDuelsHref({ sessionId: targetSessionId, spectate: true })}
      label={copy({
        de: 'Duell beobachten',
        en: 'Watch duel',
        pl: 'Obserwuj pojedynek',
      })}
      stretch
      tone='secondary'
    />
  );

  if (joinSessionId && !routeSessionId && !isSpectatingRoute) {
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
              onPress={openLobby}
              tone='ghost'
            />
            <KangurMobileSectionTitle
              title={copy({
                de: 'Einladung beitreten',
                en: 'Joining invite',
                pl: 'Dołączanie do zaproszenia',
              })}
              subtitle={copy({
                de: 'Ein Link mit dem Parameter join akzeptiert eine private Einladung und öffnet danach die aktive Duellsitzung.',
                en: 'A link with the join parameter accepts a private invite and then opens the active duel session.',
                pl: 'Link z parametrem join przyjmuje prywatne zaproszenie i po powodzeniu otwiera aktywną sesję pojedynku.',
              })}
            />
          </View>

          {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Anmelden, um die Einladung anzunehmen',
                  en: 'Sign in to accept the invite',
                  pl: 'Zaloguj się, aby przyjąć zaproszenie',
                })}
                description={copy({
                  de: 'Melde dich an, dann kannst du diese private Duell-Einladung annehmen.',
                  en: 'Sign in first to accept this private duel invite.',
                  pl: 'Zaloguj się, aby przyjąć to prywatne zaproszenie do pojedynku.',
                })}
              />
              {createLoginCallToAction(
                copy({
                  de: 'Zum Login',
                  en: 'Go to sign in',
                  pl: 'Przejdź do logowania',
                }),
              )}
            </Card>
          ) : isJoiningFromRoute || lobby.isActionPending ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Duellbeitritt läuft',
                  en: 'Joining duel',
                  pl: 'Dołączamy do pojedynku',
                })}
                description={copy({
                  de: 'Die private Einladung wird akzeptiert und der vollständige Sitzungsstatus geladen.',
                  en: 'Accepting the private invite and loading the full session state.',
                  pl: 'Akceptujemy prywatne zaproszenie i pobieramy pełny stan sesji.',
                })}
              />
            </Card>
          ) : routeJoinError || lobby.actionError ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Einladung konnte nicht angenommen werden',
                  en: 'Could not accept the invite',
                  pl: 'Nie udało się przyjąć zaproszenia',
                })}
                description={
                  routeJoinError ??
                  lobby.actionError ??
                  copy({
                    de: 'Versuche es erneut oder kehre zur Duell-Lobby zurück.',
                    en: 'Try again or go back to the duels lobby.',
                    pl: 'Spróbuj ponownie albo wróć do lobby pojedynków.',
                  })
                }
                tone='error'
              />
              <View style={{ gap: 8 }}>
                <ActionButton
                  label={copy({
                    de: 'Erneut versuchen',
                    en: 'Try again',
                    pl: 'Spróbuj ponownie',
                  })}
                  onPress={joinSessionFromRoute}
                  stretch
                />
                <ActionButton
                  label={copy({
                    de: 'Zurück zur Lobby',
                    en: 'Back to lobby',
                    pl: 'Wróć do lobby',
                  })}
                  onPress={openLobby}
                  stretch
                  tone='secondary'
                />
              </View>
            </Card>
          ) : (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Sitzung wird vorbereitet',
                  en: 'Preparing session',
                  pl: 'Przygotowujemy sesję',
                })}
                description={copy({
                  de: 'Wenn der Link korrekt ist, öffnet sich gleich das Duell.',
                  en: 'If the link is correct, the duel will open shortly.',
                  pl: 'Jeśli link jest poprawny, pojedynek otworzy się za chwilę.',
                })}
              />
            </Card>
          )}
      </KangurMobileScrollScreen>
    );
  }

  if (sessionId) {
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
              onPress={openLobby}
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
              {createLoginCallToAction(
                copy({
                  de: 'Zum Login',
                  en: 'Go to sign in',
                  pl: 'Przejdź do logowania',
                }),
              )}
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
                onPress={openLobby}
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
                      <View
                        style={{
                          gap: 8,
                        }}
                      >
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
                          {formatQuestionProgress(duel.session!, player, locale)}
                        </Text>
                      </View>
                      {duel.session!.series ? (
                        <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                          {copy({
                            de: 'Gewonnene Spiele in der Serie:',
                            en: 'Series games won:',
                            pl: 'Wygrane gry w serii:',
                          })}{' '}
                          {resolveSeriesWins(duel.session!.series, player.learnerId)}
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
                          <Text
                            style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}
                          >
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
                        onPress={handleInviteShare}
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
                    {duel.isSpectating
                      ? copy({
                          de: 'Aktuelle Frage',
                          en: 'Current question',
                          pl: 'Aktualne pytanie',
                        })
                      : copy({
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
                        disabled={lobby.isActionPending}
                        label={copy({
                          de: 'Rückspiel starten',
                          en: 'Play rematch',
                          pl: 'Zagraj rewanż',
                        })}
                        onPress={handleRematch}
                        stretch
                      />
                      <ActionButton
                        label={copy({
                          de: 'Zurück zur Lobby',
                          en: 'Back to lobby',
                          pl: 'Wróć do lobby',
                        })}
                        onPress={openLobby}
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
                      onPress={openLobby}
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
                        onPress={openLobby}
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
                            openLobby();
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

  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
      keyboardShouldPersistTaps='handled'
    >
        <View style={{ gap: 14 }}>
          <LinkButton
            href={HOME_ROUTE}
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
            tone='secondary'
          />
          <KangurMobileSectionTitle
            title={copy({
              de: 'Duelle',
              en: 'Duels',
              pl: 'Pojedynki',
            })}
            subtitle={copy({
              de: 'Von hier aus startest du schnelle Matches, öffnest öffentliche Herausforderungen und kehrst direkt zu aktiven Rivalen zurück.',
              en: 'From here you can start quick matches, open public challenges, and jump straight back to active rivals.',
              pl: 'Stąd uruchomisz szybkie mecze, otworzysz publiczne wyzwania i od razu wrócisz do aktywnych rywali.',
            })}
          />
        </View>

        {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
          <Card>
            <MessageCard
              title={copy({
                de: 'Anmelden, um Duelle zu spielen',
                en: 'Sign in to duel',
                pl: 'Zaloguj się, aby grać w pojedynki',
              })}
              description={copy({
                de: 'Gäste können die öffentliche Lobby und Rangliste ansehen. Melde dich an, um Duelle zu erstellen oder ihnen beizutreten.',
                en: 'Guests can browse the public lobby and leaderboard. Sign in to create or join duels.',
                pl: 'Goście mogą przeglądać publiczne lobby i ranking. Zaloguj się, aby tworzyć pojedynki lub do nich dołączać.',
              })}
            />
            {createLoginCallToAction(
              copy({
                de: 'Zum Login',
                en: 'Go to sign in',
                pl: 'Przejdź do logowania',
              }),
            )}
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            {copy({
              de: 'Spielbereich',
              en: 'Play panel',
              pl: 'Panel gry',
            })}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wähle Rechenart, Spielmodus und Schwierigkeitsgrad für das neue Duell.',
              en: 'Choose the operation, mode, and difficulty for the new duel.',
              pl: 'Wybierz działanie, tryb działań i poziom trudności dla nowego pojedynku.',
            })}
          </Text>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Rechenart',
                en: 'Operation',
                pl: 'Działanie',
              })}
            </Text>
            <View style={{ flexDirection: 'column', gap: 8 }}>
              {OPERATION_OPTIONS.map((option) => (
                <KangurMobileFilterChip
                  key={option}
                  fullWidth
                  label={formatOperationLabel(option, locale)}
                  onPress={() => {
                    lobby.setOperation(option);
                  }}
                  selected={lobby.operation === option}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Schwierigkeit',
                en: 'Difficulty',
                pl: 'Poziom',
              })}
            </Text>
            <View style={{ flexDirection: 'column', gap: 8 }}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <KangurMobileFilterChip
                  key={option}
                  fullWidth
                  label={formatDifficultyLabel(option, locale)}
                  onPress={() => {
                    lobby.setDifficulty(option);
                  }}
                  selected={lobby.difficulty === option}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Format',
                en: 'Format',
                pl: 'Format',
              })}
            </Text>
            <View style={{ flexDirection: 'column', gap: 8 }}>
              {SERIES_BEST_OF_OPTIONS.map((option) => (
                <KangurMobileFilterChip
                  key={`series-best-of-${option}`}
                  fullWidth
                  label={formatSeriesBestOfLabel(option, locale)}
                  onPress={() => {
                    lobby.setSeriesBestOf(option);
                  }}
                  selected={lobby.seriesBestOf === option}
                />
              ))}
            </View>
            <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
              {lobby.seriesBestOf === 1
                ? copy({
                    de: 'Neue Herausforderungen erstellen ein einzelnes Match.',
                    en: 'New challenges will create a single match.',
                    pl: 'Nowe wyzwania utworzą pojedynczy mecz.',
                  })
                : copy({
                    de: `Neue Herausforderungen erstellen ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                    en: `New challenges will create ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                    pl: `Nowe wyzwania utworzą ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                  })}
            </Text>
          </View>

          {lobby.actionError ? (
            <MessageCard
              title={copy({
                de: 'Aktion fehlgeschlagen',
                en: 'Action failed',
                pl: 'Akcja nie powiodła się',
              })}
              description={lobby.actionError}
              tone='error'
            />
          ) : null}

          {lobby.isAuthenticated ? (
            <View style={{ gap: 8 }}>
              <ActionButton
                disabled={lobby.isActionPending}
                label={copy({
                  de: 'Schnelles Match',
                  en: 'Quick match',
                  pl: 'Szybki mecz',
                })}
                onPress={async () => {
                  const nextSessionId = await lobby.createQuickMatch();
                  if (nextSessionId) {
                    openSession(nextSessionId);
                  }
                }}
                stretch
              />
              <ActionButton
                disabled={lobby.isActionPending}
                label={copy({
                  de: 'Öffentliche Herausforderung',
                  en: 'Public challenge',
                  pl: 'Publiczne wyzwanie',
                })}
                onPress={async () => {
                  const nextSessionId = await lobby.createPublicChallenge();
                  if (nextSessionId) {
                    openSession(nextSessionId);
                  }
                }}
                stretch
                tone='secondary'
              />
            </View>
          ) : (
            createLoginCallToAction(
              copy({
                de: 'Anmelden, um ein Duell zu starten',
                en: 'Sign in to start a duel',
                pl: 'Zaloguj, aby rozpocząć pojedynek',
              }),
            )
          )}
        </Card>

        <Card>
          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {copy({
                  de: 'Lobby',
                  en: 'Lobby',
                  pl: 'Lobby',
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 13 }}>
                {copy({
                  de: `Sichtbare öffentliche Räume: ${lobby.visiblePublicEntries.length}`,
                  en: `Visible public rooms: ${lobby.visiblePublicEntries.length}`,
                  pl: `Widoczne publiczne pokoje: ${lobby.visiblePublicEntries.length}`,
                })}
              </Text>
            </View>
            <View style={{ gap: 8, alignItems: 'stretch' }}>
              <ActionButton
                disabled={lobby.isActionPending}
                label={copy({
                  de: 'Aktualisieren',
                  en: 'Refresh',
                  pl: 'Odśwież',
                })}
                onPress={lobby.refresh}
                stretch
                tone='secondary'
              />
              <AutoRefreshChip
                enabled={autoRefreshEnabled}
                label={autoRefreshChipLabel}
                onToggle={() => setAutoRefreshEnabled((prev) => !prev)}
                fullWidth
              />
            </View>
          </View>

          <View style={{ flexDirection: 'column', gap: 8 }}>
            {MODE_FILTER_OPTIONS.map((option) => (
              <KangurMobileFilterChip
                fullWidth
                key={option.value}
                label={localizeDuelText(option.label, locale)}
                onPress={() => {
                  lobby.setModeFilter(option.value);
                }}
                selected={lobby.modeFilter === option.value}
              />
            ))}
          </View>

          {lobby.lobbyError ? (
            <MessageCard
              title={copy({
                de: 'Lobby ist nicht verfügbar',
                en: 'Lobby is unavailable',
                pl: 'Lobby jest niedostępne',
              })}
              description={lobby.lobbyError}
              tone='error'
            />
          ) : lobby.isLobbyLoading ? (
            <MessageCard
              title={copy({
                de: 'Lobby wird geladen',
                en: 'Loading lobby',
                pl: 'Ładujemy lobby',
              })}
              description={
                lobby.isRestoringAuth
                  ? copy({
                      de: 'Die Anmeldung wird wiederhergestellt und verfügbare Duelle werden geladen.',
                      en: 'Restoring sign-in and loading available duels.',
                      pl: 'Przywracamy logowanie i pobieramy dostępne pojedynki.',
                    })
                  : copy({
                      de: 'Verfügbare öffentliche und private Räume werden geladen.',
                      en: 'Loading available public and private rooms.',
                      pl: 'Pobieramy dostępne publiczne i prywatne pokoje.',
                    })
              }
            />
          ) : (
            <>
              {lobby.inviteEntries.length > 0 ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {copy({
                      de: 'Einladungen',
                      en: 'Invites',
                      pl: 'Zaproszenia',
                    })}
                  </Text>
                  {lobby.inviteEntries.map((entry) => (
                    <LobbyEntryCard
                      key={entry.sessionId}
                      action={renderJoinAction(entry.sessionId)}
                      actionLabel={copy({
                        de: 'Private Einladung für angemeldete Lernende.',
                        en: 'Private invite for a signed-in learner.',
                        pl: 'Prywatne zaproszenie dla zalogowanego ucznia.',
                      })}
                      description={copy({
                        de: `Gastgeber ${entry.host.displayName} lädt zu einem privaten Duell ${formatOperationLabel(entry.operation, locale)} ein.`,
                        en: `Host ${entry.host.displayName} is inviting you to a private ${formatOperationLabel(entry.operation, locale)} duel.`,
                        pl: `Gospodarz ${entry.host.displayName} zaprasza do prywatnego pojedynku ${formatOperationLabel(entry.operation, locale)}.`,
                      })}
                      entry={entry}
                      locale={locale}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  {copy({
                    de: 'Öffentliche Räume',
                    en: 'Public rooms',
                    pl: 'Publiczne pokoje',
                  })}
                </Text>
                {lobby.visiblePublicEntries.length === 0 ? (
                  <MessageCard
                    title={copy({
                      de: 'Keine öffentlichen Duelle',
                      en: 'No public duels',
                      pl: 'Brak publicznych pojedynków',
                    })}
                    description={copy({
                      de: 'Ein anderer Filter oder ein schnelles Match erstellt einen neuen Raum zum Beitreten.',
                      en: 'Changing the filter or starting a quick match will create a new room to join.',
                      pl: 'Zmiana filtra albo szybki mecz utworzy nowy pokój gotowy do dołączenia.',
                    })}
                  />
                ) : (
                  lobby.visiblePublicEntries.map((entry) => (
                    <LobbyEntryCard
                      key={entry.sessionId}
                      action={
                        <View style={{ gap: 8 }}>
                          {renderJoinAction(entry.sessionId)}
                          {renderSpectateAction(entry.sessionId)}
                        </View>
                      }
                      actionLabel={copy({
                        de: 'Du kannst als Spieler beitreten oder den Raum im Zuschauermodus öffnen.',
                        en: 'You can join as a player or open the room in spectator mode.',
                        pl: 'Możesz dołączyć jako gracz albo otworzyć pokój w trybie obserwatora.',
                      })}
                      description={copy({
                        de: `${formatModeLabel(entry.mode, locale)} von ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                        en: `${formatModeLabel(entry.mode, locale)} hosted by ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                        pl: `${formatModeLabel(entry.mode, locale)} gospodarza ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                      })}
                      entry={entry}
                      locale={locale}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </Card>

        <Card>
        <View style={{ gap: 8 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
              {copy({
                de: 'Lobby-Chat',
                en: 'Lobby chat',
                pl: 'Czat lobby',
              })}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {copy({
                de: 'Schnelle Abstimmung vor dem Duell und während du auf einen Gegner wartest.',
                en: 'Quick coordination before the duel and while waiting for an opponent.',
                pl: 'Szybka koordynacja przed pojedynkiem i w czasie oczekiwania na przeciwnika.',
              })}
            </Text>
          </View>
          {chat.isAuthenticated ? (
            <ActionButton
              disabled={chat.isLoading || chat.isSending}
              label={copy({
                de: 'Aktualisieren',
                en: 'Refresh',
                pl: 'Odśwież',
              })}
              onPress={chat.refresh}
              tone='secondary'
              stretch
            />
          ) : null}
        </View>

          {!chat.isAuthenticated ? (
            <MessageCard
              title={copy({
                de: 'Zum Lobby-Chat anmelden',
                en: 'Sign in for lobby chat',
                pl: 'Zaloguj się do czatu lobby',
              })}
              description={copy({
                de: 'Nach der Anmeldung kannst du kurze Nachrichten lesen und senden, um szybki mecz albo rewanż ustalić.',
                en: 'After sign-in, you can read and send short messages to set up a quick match or rematch.',
                pl: 'Po zalogowaniu możesz czytać i wysyłać krótkie wiadomości, aby ustalić szybki mecz albo rewanż.',
              })}
            />
          ) : chat.error ? (
            <MessageCard
              title={copy({
                de: 'Lobby-Chat konnte nicht geladen werden',
                en: 'Could not load the lobby chat',
                pl: 'Nie udało się pobrać czatu lobby',
              })}
              description={chat.error}
              tone='error'
            />
          ) : chat.isLoading ? (
            <MessageCard
              title={copy({
                de: 'Lobby-Chat wird geladen',
                en: 'Loading lobby chat',
                pl: 'Ładujemy czat lobby',
              })}
              description={
                chat.isRestoringAuth
                  ? copy({
                      de: 'Die Anmeldung wird wiederhergestellt und die letzten Nachrichten werden geladen.',
                      en: 'Restoring sign-in and loading the latest messages.',
                      pl: 'Przywracamy logowanie i pobieramy ostatnie wiadomości.',
                    })
                  : copy({
                      de: 'Die aktuellen Nachrichten aus der Lobby werden geladen.',
                      en: 'Loading the latest messages from the lobby.',
                      pl: 'Pobieramy bieżące wiadomości z lobby.',
                    })
              }
            />
          ) : (
            <>
              {lobbyChatPreview.length === 0 ? (
                <MessageCard
                  title={copy({
                    de: 'Keine Nachrichten',
                    en: 'No messages',
                    pl: 'Brak wiadomości',
                  })}
                  description={copy({
                    de: 'Das ist ein guter Ort, um ein schnelles Match oder ein privates Rückspiel zu verabreden.',
                    en: 'This is a good place to arrange a quick match or a private rematch.',
                    pl: 'To dobre miejsce na ustalenie szybkiego meczu albo prywatnego rewanżu.',
                  })}
                />
              ) : (
                <View style={{ gap: 10 }}>
                  {lobbyChatPreview.map((message) => (
                    <View
                      key={message.id}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          message.senderId === activeLearnerId ? '#bfdbfe' : '#e2e8f0',
                        backgroundColor:
                          message.senderId === activeLearnerId ? '#eff6ff' : '#f8fafc',
                        gap: 6,
                        padding: 14,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                        {formatLobbyChatSenderLabel(message, activeLearnerId, locale)}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {message.message}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>
                        {formatRelativeAge(message.createdAt, locale)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ gap: 8 }}>
                <TextInput
                  accessibilityLabel={copy({
                    de: 'Nachricht an den Lobby-Chat',
                    en: 'Lobby chat message',
                    pl: 'Wiadomość do czatu lobby',
                  })}
                  editable={!chat.isSending}
                  maxLength={chat.maxMessageLength}
                  multiline
                  onChangeText={(nextValue) => {
                    setChatDraft(nextValue);
                    if (chatActionError) {
                      setChatActionError(null);
                    }
                  }}
                  placeholder={copy({
                    de: 'Schreibe in die Lobby',
                    en: 'Write to the lobby',
                    pl: 'Napisz do lobby',
                  })}
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: 16,
                    borderWidth: 1,
                    minHeight: 96,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    textAlignVertical: 'top',
                  }}
                  value={chatDraft}
                />
                <Text style={{ color: '#64748b', fontSize: 12 }}>
                  {copy({
                    de: `${chatRemainingChars} Zeichen übrig.`,
                    en: `${chatRemainingChars} characters left.`,
                    pl: `Pozostało ${chatRemainingChars} znaków.`,
                  })}
                </Text>
                {chatActionError ? (
                  <MessageCard
                    title={copy({
                      de: 'Nachricht konnte nicht gesendet werden',
                      en: 'Could not send the message',
                      pl: 'Nie udało się wysłać wiadomości',
                    })}
                    description={chatActionError}
                    tone='error'
                  />
                ) : null}
                <ActionButton
                  disabled={!canSendChatMessage}
                  label={
                    chat.isSending
                      ? copy({
                          de: 'Wird gesendet...',
                          en: 'Sending...',
                          pl: 'Wysyłanie...',
                        })
                      : copy({
                          de: 'Nachricht senden',
                          en: 'Send message',
                          pl: 'Wyślij wiadomość',
                        })
                  }
                  onPress={handleLobbyChatSend}
                  stretch
                />
              </View>
            </>
          )}
        </Card>

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
                            openSession(nextSessionId);
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
                        openSession(nextSessionId);
                      }
                    }}
                    stretch
                  />
                </View>
              ))}
            </View>
          )}
        </Card>

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

        <LessonCheckpointsCard context='lobby' />
        <LessonMasteryCard context='lobby' />
        <BadgesCard context='lobby' />
        <NextStepsCard context='lobby' />
    </KangurMobileScrollScreen>
  );
}
