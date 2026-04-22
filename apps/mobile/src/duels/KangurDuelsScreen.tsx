import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import { type KangurMobileTone as Tone } from '../shared/KangurMobileUi';
import { shareKangurDuelInvite } from './duelInviteShare';
import { createKangurDuelsHref } from './duelsHref';
import { ActionButton, LinkButton } from './duels-primitives';
import { DuelsJoinRouteView } from './duels-screen-join-view';
import { DuelsLobbyView } from './duels-screen-lobby-view';
import { DuelsSessionView } from './duels-screen-session-view';
import {
  AUTO_REFRESH_INTERVAL_MS,
  HOME_ROUTE,
  LOBBY_CHAT_PREVIEW_LIMIT,
  isWaitingSessionStatus,
  normalizeSeriesBestOf,
  resolveRoundProgress,
  resolveSessionIdParam,
  resolveSpectateParam,
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
  const joinSessionId = routeSessionId !== null
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

  let searchStatusTone: Tone = {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    textColor: '#475569',
  };

  if (lobby.isSearchLoading) {
    searchStatusTone = {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  } else if (trimmedSearchSubmittedQuery.length >= 2 || trimmedSearchQuery.length >= 2) {
    searchStatusTone = {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      textColor: '#1d4ed8',
    };
  }

  let searchStatusLabel = '';
  if (lobby.isSearchLoading) {
    searchStatusLabel = copy({
      de: 'Suche läuft',
      en: 'Searching',
      pl: 'Trwa wyszukiwanie',
    });
  } else if (trimmedSearchSubmittedQuery.length >= 2) {
    searchStatusLabel = copy({
      de: `Suche: ${trimmedSearchSubmittedQuery}`,
      en: `Search: ${trimmedSearchSubmittedQuery}`,
      pl: `Szukano: ${trimmedSearchSubmittedQuery}`,
    });
  } else if (trimmedSearchQuery.length >= 2) {
    searchStatusLabel = copy({
      de: `Bereit: ${trimmedSearchQuery}`,
      en: `Ready: ${trimmedSearchQuery}`,
      pl: `Gotowe: ${trimmedSearchQuery}`,
    });
  } else if (lobby.isAuthenticated) {
    searchStatusLabel = copy({
      de: 'Mindestens 2 Zeichen',
      en: 'At least 2 characters',
      pl: 'Co najmniej 2 znaki',
    });
  } else {
    searchStatusLabel = copy({
      de: 'Anmeldung erforderlich',
      en: 'Sign-in required',
      pl: 'Wymaga logowania',
    });
  }

  const hasWaitingSession = duel.session !== null && isWaitingSessionStatus(duel.session.status);
  const isFinishedSession = duel.session !== null && (duel.session.status === 'completed' || duel.session.status === 'aborted');
  const roundProgress = duel.session !== null
    ? resolveRoundProgress(duel.session, duel.player, duel.isSpectating)
    : null;
  const activePlayersCount =
    duel.session?.players.filter((player) => player.status !== 'left').length ?? 0;
  const hasPendingInvitedPlayer =
    duel.session?.players.some((player) => player.status === 'invited') ?? false;

  let isInvitedLearnerMissing = false;
  if (duel.session?.invitedLearnerId !== null && duel.session?.invitedLearnerId !== undefined) {
    const invitedId = duel.session.invitedLearnerId;
    isInvitedLearnerMissing = !duel.session.players.some(
      (player) =>
        player.learnerId === invitedId &&
        player.status !== 'left',
    );
  }

  const needsMorePlayersToStart = duel.session !== null && activePlayersCount < (duel.session.minPlayersToStart ?? 2);
  const canShareInvite = Boolean(
    duel.session !== null &&
      duel.player !== null &&
      !duel.isSpectating &&
      duel.session.visibility === 'private' &&
      hasWaitingSession &&
      (hasPendingInvitedPlayer || isInvitedLearnerMissing || needsMorePlayersToStart),
  );

  const rawInviteeName = duel.session?.invitedLearnerName?.trim();
  const inviteeName =
    typeof rawInviteeName === 'string' && rawInviteeName !== ''
      ? rawInviteeName
      : copy({
          de: 'der zweiten Person',
          en: 'the other player',
          pl: 'drugiej osoby',
        });

  const sessionTimelineItems: string[] = [];
  if (duel.session !== null) {
    sessionTimelineItems.push(
      copy({
        de: `Erstellt ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
        en: `Created ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
        pl: `Utworzono ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
      }),
    );
    if (duel.session.startedAt !== null) {
      sessionTimelineItems.push(
        copy({
          de: `Gestartet ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
          en: `Started ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
          pl: `Rozpoczęto ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
        }),
      );
    }
    sessionTimelineItems.push(
      copy({
        de: `Zuletzt aktualisiert ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
        en: `Last updated ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
        pl: `Ostatnia aktualizacja ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
      }),
    );
    if (duel.session.endedAt !== null) {
      sessionTimelineItems.push(
        copy({
          de: `Beendet ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
          en: `Ended ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
          pl: `Zakończenie ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
        }),
      );
    }
  }

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

      if (opponentLearnerId === null) {
        return;
      }

      const nextSessionId = await lobby.createPrivateChallenge(
        opponentLearnerId,
        overrides,
      );
      if (nextSessionId !== null) {
        openSession(nextSessionId);
      }
      return;
    }

    const nextSessionId =
      duel.session.mode === 'quick_match'
        ? await lobby.createQuickMatch(overrides)
        : await lobby.createPublicChallenge(overrides);
    if (nextSessionId !== null) {
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
    if (joinSessionId === null) {
      return;
    }

    setRouteJoinError(null);
    setIsJoiningFromRoute(true);

    try {
      const nextSessionId = await lobby.joinDuel(joinSessionId);
      if (nextSessionId !== null) {
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

  const handleJoinSessionFromRoute = (): void => {
    void joinSessionFromRoute();
  };

  useEffect(() => {
    if (joinSessionId === null || routeSessionId !== null || isSpectatingRoute) {
      return;
    }

    if (!lobby.isAuthenticated || lobby.isLoadingAuth) {
      return;
    }

    if (attemptedJoinSessionIdRef.current === joinSessionId) {
      return;
    }

    attemptedJoinSessionIdRef.current = joinSessionId;
    handleJoinSessionFromRoute();
  }, [
    isSpectatingRoute,
    joinSessionId,
    lobby.isAuthenticated,
    lobby.isLoadingAuth,
    routeSessionId,
  ]);

  const handleLobbyRefresh = (): void => {
    void lobby.refresh();
  };

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return undefined;
    }

    handleLobbyRefresh();
    const intervalId = setInterval(() => {
      handleLobbyRefresh();
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
          if (nextSessionId !== null) {
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

  if (joinSessionId !== null && routeSessionId === null && !isSpectatingRoute) {
    return (
      <DuelsJoinRouteView
        copy={copy}
        isAuthenticated={lobby.isAuthenticated}
        isActionPending={lobby.isActionPending}
        isJoiningFromRoute={isJoiningFromRoute}
        isLoadingAuth={lobby.isLoadingAuth}
        lobbyActionError={lobby.actionError}
        loginCallToAction={createLoginCallToAction(
          copy({
            de: 'Zum Login',
            en: 'Go to sign in',
            pl: 'Przejdź do logowania',
          }),
        )}
        onJoinFromRoute={joinSessionFromRoute}
        onOpenLobby={openLobby}
        routeJoinError={routeJoinError}
      />
    );
  }

  if (sessionId !== null) {
    return (
      <DuelsSessionView
        canShareInvite={canShareInvite}
        copy={copy}
        duel={duel}
        hasWaitingSession={hasWaitingSession}
        inviteeName={inviteeName}
        inviteShareError={inviteShareError}
        isFinishedSession={isFinishedSession}
        isLoadingAuth={isLoadingAuth}
        isLobbyActionPending={lobby.isActionPending}
        locale={locale}
        loginCallToAction={createLoginCallToAction(
          copy({
            de: 'Zum Login',
            en: 'Go to sign in',
            pl: 'Przejdź do logowania',
          }),
        )}
        onHandleInviteShare={handleInviteShare}
        onHandleRematch={handleRematch}
        onOpenLobby={openLobby}
        roundProgress={roundProgress}
        sessionTimelineItems={sessionTimelineItems}
      />
    );
  }

  return (
    <DuelsLobbyView
      activeLearnerId={activeLearnerId}
      autoRefreshEnabled={autoRefreshEnabled}
      autoRefreshChipLabel={autoRefreshChipLabel}
      canSendChatMessage={canSendChatMessage}
      chat={chat}
      chatActionError={chatActionError}
      chatDraft={chatDraft}
      chatRemainingChars={chatRemainingChars}
      copy={copy}
      lobby={lobby}
      lobbyChatPreview={lobbyChatPreview}
      loginIntroCallToAction={createLoginCallToAction(
        copy({
          de: 'Zum Login',
          en: 'Go to sign in',
          pl: 'Przejdź do logowania',
        }),
      )}
      loginStartCallToAction={createLoginCallToAction(
        copy({
          de: 'Anmelden, um ein Duell zu starten',
          en: 'Sign in to start a duel',
          pl: 'Zaloguj, aby rozpocząć pojedynek',
        }),
      )}
      locale={locale}
      onChatDraftChange={(nextValue) => {
        setChatDraft(nextValue);
        if (chatActionError !== null) {
          setChatActionError(null);
        }
      }}
      onOpenSession={openSession}
      onSendLobbyChat={handleLobbyChatSend}
      onToggleAutoRefresh={() => setAutoRefreshEnabled((prev) => !prev)}
      renderJoinAction={renderJoinAction}
      renderSpectateAction={renderSpectateAction}
      searchStatusLabel={searchStatusLabel}
      searchStatusTone={searchStatusTone}
    />
  );
}
