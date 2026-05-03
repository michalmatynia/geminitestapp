import type React from 'react';
import { useState } from 'react';
import type { UseKangurMobileDuelLobbyChatResult } from './useKangurMobileDuelLobbyChat';
import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

export type UseKangurDuelsLobbyActionsResult = {
  chatDraft: string;
  setChatDraft: React.Dispatch<React.SetStateAction<string>>;
  chatActionError: string | null;
  setChatActionError: React.Dispatch<React.SetStateAction<string | null>>;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleLobbyChatSend: () => Promise<void>;
};

export function useKangurDuelsLobbyActions(
  chat: UseKangurMobileDuelLobbyChatResult,
  copy: DuelCopy,
): UseKangurDuelsLobbyActionsResult {
  const [chatDraft, setChatDraft] = useState('');
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

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

  return {
    chatDraft,
    setChatDraft,
    chatActionError,
    setChatActionError,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    handleLobbyChatSend,
  };
}
