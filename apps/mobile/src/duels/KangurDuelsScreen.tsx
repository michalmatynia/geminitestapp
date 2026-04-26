import React, { useCallback } from 'react';
import { ActionButton, LinkButton } from './duels-primitives';
import { HOME_ROUTE, LOBBY_CHAT_PREVIEW_LIMIT } from './utils/duels-ui';
import { createKangurDuelsHref } from './duelsHref';
import { useKangurDuelsScreenData } from './useKangurDuelsScreenData';
import { DuelsScreenContent } from './DuelsScreenContent';

export function KangurDuelsScreen(): React.JSX.Element {
  const data = useKangurDuelsScreenData();
  const { copy, lobby, signIn, supportsLearnerCredentials, chat, lobbyActions, sessionActions, routeJoin, sessionState, joinDuelAction } = data;

  const createLoginCallToAction = useCallback((label: string) => (
    supportsLearnerCredentials ? <LinkButton href={HOME_ROUTE} label={label} stretch tone='primary' /> : <ActionButton label={label} onPress={signIn} stretch />
  ), [signIn, supportsLearnerCredentials]);

  const renderJoinAction = useCallback((id: string) => {
    const label = copy({ de: 'Duell beitreten', en: 'Join duel', pl: 'Dołącz do pojedynku' });
    if (lobby.isAuthenticated) {
       
      return <ActionButton label={label} onPress={() => joinDuelAction(id)} stretch />;
    }
    return createLoginCallToAction(copy({ de: 'Anmelden, um beizutreten', en: 'Sign in to join', pl: 'Zaloguj, aby dołączyć' }));
  }, [copy, createLoginCallToAction, lobby, joinDuelAction]);


  const renderSpectateAction = useCallback((id: string) => (
    <LinkButton href={createKangurDuelsHref({ sessionId: id, spectate: true })} label={copy({ de: 'Duell beobachten', en: 'Watch duel', pl: 'Obserwuj pojedynek' })} stretch tone='secondary' />
  ), [copy]);

  const autoRefreshChipLabel = lobbyActions.autoRefreshEnabled
    ? copy({ de: 'Auto-Refresh (Ein)', en: 'Auto refresh (On)', pl: 'Auto odświeżanie (Włączone)' })
    : copy({ de: 'Auto-Refresh (Aus)', en: 'Auto refresh (Off)', pl: 'Auto odświeżanie (Wyłączone)' });

  const canSend = chat.isAuthenticated && !chat.isSending && lobbyActions.chatDraft.trim().length > 0 && lobbyActions.chatDraft.trim().length <= chat.maxMessageLength;

  return (
    <DuelsScreenContent
      {...data}
      autoRefreshChipLabel={autoRefreshChipLabel}
      autoRefreshEnabled={lobbyActions.autoRefreshEnabled}
      canSendChatMessage={canSend}
      chatActionError={lobbyActions.chatActionError}
      chatDraft={lobbyActions.chatDraft}
      chatRemainingChars={Math.max(0, chat.maxMessageLength - lobbyActions.chatDraft.length)}
      createLoginCallToAction={createLoginCallToAction}
      handleInviteShare={sessionActions.handleInviteShare}
      handleLobbyChatSend={lobbyActions.handleLobbyChatSend}
      handleRematch={sessionActions.handleRematch}
      isJoiningFromRoute={routeJoin.isJoiningFromRoute}
      joinSessionFromRoute={routeJoin.joinSessionFromRoute}
      lobbyChatPreview={chat.messages.slice(-LOBBY_CHAT_PREVIEW_LIMIT)}
      onChatDraftChange={(v) => { lobbyActions.setChatDraft(v); if (lobbyActions.chatActionError !== null) lobbyActions.setChatActionError(null); }}
      onToggleAutoRefresh={() => lobbyActions.setAutoRefreshEnabled((p) => !p)}
      renderJoinAction={renderJoinAction}
      renderSpectateAction={renderSpectateAction}
      routeJoinError={routeJoin.routeJoinError}
      sessionState={{ ...sessionState, inviteShareError: sessionActions.inviteShareError }}
    />
  );
}
