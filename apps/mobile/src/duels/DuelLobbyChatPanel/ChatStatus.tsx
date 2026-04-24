import { View } from 'react-native';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { MessageCard } from '../duels-primitives';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from '../useKangurMobileDuelLobbyChat';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

export function ChatStatus({ chat, copy }: { chat: DuelChatState; copy: DuelCopy }): React.JSX.Element | null {
  if (chat.error !== null) {
    return (
      <MessageCard
        title={copy({
          de: 'Lobby-Chat konnte nicht geladen werden',
          en: 'Could not load the lobby chat',
          pl: 'Nie udało się pobrać czatu lobby',
        })}
        description={chat.error}
        tone='error'
      />
    );
  }
  if (chat.isLoading) {
    return (
      <MessageCard
        title={copy({
          de: 'Lobby-Chat wird geladen',
          en: 'Loading lobby chat',
          pl: 'Ładujemy czat lobby',
        })}
        description={chat.isRestoringAuth
            ? copy({
                de: 'Die Anmeldung wird wiederhergestellt und die letzten Nachrichten werden geladen.',
                en: 'Restoring sign-in and loading the latest messages.',
                pl: 'Przywracamy logowanie i pobieramy ostatnie wiadomości.',
              })
            : copy({
                de: 'Die aktuellen Nachrichten aus der Lobby werden geladen.',
                en: 'Loading the latest messages from the lobby.',
                pl: 'Pobieramy bieżące wiadomości z lobby.',
              })}
      />
    );
  }
  return null;
}
