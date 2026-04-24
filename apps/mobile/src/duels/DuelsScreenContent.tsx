import React from 'react';
import { DuelsJoinRouteView } from './duels-screen-join-view';
import { DuelsLobbyView } from './duels-screen-lobby-view';
import { DuelsSessionView } from './duels-screen-session-view';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';
import type { UseKangurMobileDuelSessionResult } from './useKangurMobileDuelSession';
import type { UseKangurMobileDuelLobbyChatResult } from './useKangurMobileDuelLobbyChat';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { UseKangurDuelsSessionStateResult } from './useKangurDuelsSessionState';
import type { KangurMobileTone } from '../shared/KangurMobileUi';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

export interface DuelsScreenContentProps {
  activeLearnerId: string | null;
  autoRefreshChipLabel: string;
  autoRefreshEnabled: boolean;
  canSendChatMessage: boolean;
  chat: UseKangurMobileDuelLobbyChatResult;
  chatActionError: string | null;
  chatDraft: string;
  chatRemainingChars: number;
  copy: DuelCopy;
  createLoginCallToAction: (label: string) => React.JSX.Element;
  duel: UseKangurMobileDuelSessionResult;
  handleInviteShare: () => Promise<void>;
  handleLobbyChatSend: () => Promise<void>;
  handleRematch: () => Promise<void>;
  isJoiningFromRoute: boolean;
  isSpectatingRoute: boolean;
  joinSessionFromRoute: () => Promise<void>;
  joinSessionId: string | null;
  lobby: UseKangurMobileDuelsLobbyResult;
  lobbyChatPreview: UseKangurMobileDuelLobbyChatResult['messages'];
  locale: DuelLocale;
  onChatDraftChange: (nextValue: string) => void;
  onOpenLobby: () => void;
  onOpenSession: (id: string) => void;
  onToggleAutoRefresh: () => void;
  renderJoinAction: (id: string) => React.JSX.Element;
  renderSpectateAction: (id: string) => React.JSX.Element;
  routeJoinError: string | null;
  routeSessionId: string | null;
  searchStatusLabel: string;
  searchStatusTone: KangurMobileTone;
  sessionId: string | null;
  sessionState: UseKangurDuelsSessionStateResult & { inviteShareError: string | null };
  isLoadingAuth: boolean;
  }


export function DuelsScreenContent(props: DuelsScreenContentProps): React.JSX.Element {
  const { joinSessionId, routeSessionId, isSpectatingRoute, sessionId } = props;

  if (joinSessionId !== null && routeSessionId === null && !isSpectatingRoute) {
    return <DuelsJoinView {...props} />;
  }

  if (sessionId !== null) {
    return <DuelsSessionActiveView {...props} />;
  }

  return <DuelsLobbyActiveView {...props} />;
}

function DuelsJoinView({ copy, lobby, isJoiningFromRoute, joinSessionFromRoute, onOpenLobby, routeJoinError, createLoginCallToAction }: DuelsScreenContentProps): React.JSX.Element {
  return (
    <DuelsJoinRouteView
      copy={copy}
      isAuthenticated={lobby.isAuthenticated}
      isActionPending={lobby.isActionPending}
      isJoiningFromRoute={isJoiningFromRoute}
      isLoadingAuth={lobby.isLoadingAuth}
      lobbyActionError={lobby.actionError}
      loginCallToAction={createLoginCallToAction(
        copy({ de: 'Zum Login', en: 'Go to sign in', pl: 'Przejdź do logowania' }),
      )}
      onJoinFromRoute={joinSessionFromRoute}
      onOpenLobby={onOpenLobby}
      routeJoinError={routeJoinError}
    />
  );
}

function DuelsSessionActiveView({ sessionState, copy, duel, isLoadingAuth, lobby, locale, createLoginCallToAction, handleInviteShare, handleRematch, onOpenLobby }: DuelsScreenContentProps): React.JSX.Element {
  return (
    <DuelsSessionView
      canShareInvite={sessionState.canShareInvite}
      copy={copy}
      duel={duel}
      hasWaitingSession={sessionState.hasWaitingSession}
      inviteeName={sessionState.inviteeName}
      inviteShareError={sessionState.inviteShareError}
      isFinishedSession={sessionState.isFinishedSession}
      isLoadingAuth={isLoadingAuth}
      isLobbyActionPending={lobby.isActionPending}
      locale={locale}
      loginCallToAction={createLoginCallToAction(
        copy({ de: 'Zum Login', en: 'Go to sign in', pl: 'Przejdź do logowania' }),
      )}
      onHandleInviteShare={handleInviteShare}
      onHandleRematch={handleRematch}
      onOpenLobby={onOpenLobby}
      roundProgress={sessionState.roundProgress}
      sessionTimelineItems={sessionState.sessionTimelineItems}
    />
  );
}

function DuelsLobbyActiveView({
  activeLearnerId, autoRefreshEnabled, autoRefreshChipLabel, canSendChatMessage, chat,
  chatActionError, chatDraft, chatRemainingChars, copy, lobby, lobbyChatPreview,
  locale, onChatDraftChange, onOpenSession, handleLobbyChatSend, onToggleAutoRefresh,
  renderJoinAction, renderSpectateAction, searchStatusLabel, searchStatusTone, createLoginCallToAction
}: DuelsScreenContentProps): React.JSX.Element {
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
        copy({ de: 'Zum Login', en: 'Go to sign in', pl: 'Przejdź do logowania' }),
      )}
      loginStartCallToAction={createLoginCallToAction(
        copy({ de: 'Anmelden, um ein Duell zu starten', en: 'Sign in to start a duel', pl: 'Zaloguj, aby rozpocząć pojedynek' }),
      )}
      locale={locale}
      onChatDraftChange={onChatDraftChange}
      onOpenSession={onOpenSession}
      onSendLobbyChat={handleLobbyChatSend}
      onToggleAutoRefresh={onToggleAutoRefresh}
      renderJoinAction={renderJoinAction}
      renderSpectateAction={renderSpectateAction}
      searchStatusLabel={searchStatusLabel}
      searchStatusTone={searchStatusTone}
    />
  );
}
