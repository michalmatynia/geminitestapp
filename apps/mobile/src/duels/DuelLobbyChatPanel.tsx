import { View } from 'react-native';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  MessageCard,
} from './duels-primitives';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from './useKangurMobileDuelLobbyChat';
import { type KangurDuelLobbyChatMessage } from '@kangur/contracts/kangur-duels-chat';
import { ChatMessageRow } from './DuelLobbyChatPanel/ChatMessageRow';
import { ChatHeader } from './DuelLobbyChatPanel/ChatHeader';
import { ChatFormInput, ChatFormActions } from './DuelLobbyChatPanel/ChatForm';
import { ChatStatus } from './DuelLobbyChatPanel/ChatStatus';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelLobbyChatPanelProps = {
  activeLearnerId: string | null;
  canSendChatMessage: boolean;
  chat: DuelChatState;
  chatActionError: string | null;
  chatDraft: string;
  chatRemainingChars: number;
  copy: DuelCopy;
  lobbyChatPreview: DuelChatState['messages'];
  locale: DuelLocale;
  onChatDraftChange: (nextValue: string) => void;
  onSendLobbyChat: () => Promise<void>;
};

function renderMessages(
  lobbyChatPreview: KangurDuelLobbyChatMessage[],
  activeLearnerId: string | null,
  locale: DuelLocale,
  copy: DuelCopy,
): React.JSX.Element {
  if (lobbyChatPreview.length === 0) {
    return (
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
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {lobbyChatPreview.map((message) => (
        <ChatMessageRow
          key={message.id}
          activeLearnerId={activeLearnerId}
          locale={locale}
          message={message}
        />
      ))}
    </View>
  );
}

export function DuelLobbyChatPanel({
  activeLearnerId,
  canSendChatMessage,
  chat,
  chatActionError,
  chatDraft,
  chatRemainingChars,
  copy,
  lobbyChatPreview,
  locale,
  onChatDraftChange,
  onSendLobbyChat,
}: DuelLobbyChatPanelProps): React.JSX.Element {
  const status = ChatStatus({ chat, copy });

  const renderContent = (): React.JSX.Element => (
    <>
      {renderMessages(lobbyChatPreview, activeLearnerId, locale, copy)}
      <ChatFormInput
        chat={chat}
        chatDraft={chatDraft}
        copy={copy}
        onChatDraftChange={onChatDraftChange}
      />
      <ChatFormActions
        canSendChatMessage={canSendChatMessage}
        chat={chat}
        chatActionError={chatActionError}
        chatRemainingChars={chatRemainingChars}
        copy={copy}
        onSendLobbyChat={onSendLobbyChat}
      />
    </>
  );

  return (
    <Card>
      <ChatHeader chat={chat} copy={copy} />
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
      ) : (
        status ?? renderContent()
      )}
    </Card>
  );
}
