import React, { useCallback } from 'react';
import { ActionButton, LinkButton } from './duels-primitives';
import { HOME_ROUTE, LOBBY_CHAT_PREVIEW_LIMIT } from './utils/duels-ui';
import { createKangurDuelsHref } from './duelsHref';
import { useKangurDuelsScreenData } from './useKangurDuelsScreenData';
import { DuelsScreenContent } from './DuelsScreenContent';

export function KangurDuelsScreen(): React.JSX.Element {
  const data = useKangurDuelsScreenData();

  const createLoginCallToAction = useCallback((label: string) => (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data.supportsLearnerCredentials ? <LinkButton href={HOME_ROUTE} label={label} stretch tone='primary' /> : <ActionButton label={label} onPress={data.signIn} stretch />
  ), [data.signIn, data.supportsLearnerCredentials]);

  const renderJoinAction = useCallback((id: string) => {
    const label = data.copy({ de: 'Duell beitreten', en: 'Join duel', pl: 'Dołącz do pojedynku' });
    if (data.lobby.isAuthenticated) {
       
      return <ActionButton label={label} onPress={() => data.joinDuelAction(id)} stretch />;
    }
    return createLoginCallToAction(data.copy({ de: 'Anmelden, um beizutreten', en: 'Sign in to join', pl: 'Zaloguj, aby dołączyć' }));
  }, [data.copy, createLoginCallToAction, data.lobby.isAuthenticated, data.joinDuelAction]);


  const renderSpectateAction = useCallback((id: string) => (
    <LinkButton href={createKangurDuelsHref({ sessionId: id, spectate: true })} label={data.copy({ de: 'Duell beobachten', en: 'Watch duel', pl: 'Obserwuj pojedynek' })} stretch tone='secondary' />
  ), [data.copy]);

  const autoRefreshChipLabel = data.lobbyActions.autoRefreshEnabled
    ? data.copy({ de: 'Auto-Refresh (Ein)', en: 'Auto refresh (On)', pl: 'Auto odświeżanie (Włączone)' })
    : data.copy({ de: 'Auto-Refresh (Aus)', en: 'Auto refresh (Off)', pl: 'Auto odświeżanie (Wyłączone)' });

  const canSend = data.chat.isAuthenticated && !data.chat.isSending && data.lobbyActions.chatDraft.trim().length > 0 && data.lobbyActions.chatDraft.trim().length <= data.chat.maxMessageLength;

  return (
    <DuelsScreenContent
      {...data}
      autoRefreshChipLabel={autoRefreshChipLabel}
      autoRefreshEnabled={data.lobbyActions.autoRefreshEnabled}
      canSendChatMessage={canSend}
      chatActionError={data.lobbyActions.chatActionError}
      chatDraft={data.lobbyActions.chatDraft}
      chatRemainingChars={Math.max(0, data.chat.maxMessageLength - data.lobbyActions.chatDraft.length)}
      createLoginCallToAction={createLoginCallToAction}
      handleInviteShare={data.sessionActions.handleInviteShare}
      handleLobbyChatSend={data.lobbyActions.handleLobbyChatSend}
      handleRematch={data.sessionActions.handleRematch}
      isJoiningFromRoute={data.routeJoin.isJoiningFromRoute}
      joinSessionFromRoute={data.routeJoin.joinSessionFromRoute}
      lobbyChatPreview={data.chat.messages.slice(-LOBBY_CHAT_PREVIEW_LIMIT)}
      onChatDraftChange={(v) => { data.lobbyActions.setChatDraft(v); if (data.lobbyActions.chatActionError !== null) data.lobbyActions.setChatActionError(null); }}
      onToggleAutoRefresh={() => data.lobbyActions.setAutoRefreshEnabled((p) => !p)}
      renderJoinAction={renderJoinAction}
      renderSpectateAction={renderSpectateAction}
      routeJoinError={data.routeJoin.routeJoinError}
      sessionState={{ ...data.sessionState, inviteShareError: data.sessionActions.inviteShareError }}
    />
  );
}
