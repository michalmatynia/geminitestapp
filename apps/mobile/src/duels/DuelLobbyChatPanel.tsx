import { Text, TextInput, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
  MessageCard,
} from './duels-primitives';
import {
  formatLobbyChatSenderLabel,
  formatRelativeAge,
} from './duels-utils';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from './useKangurMobileDuelLobbyChat';

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

function ChatMessageRow({
  message,
  activeLearnerId,
  locale,
}: {
  message: DuelChatState['messages'][number];
  activeLearnerId: string | null;
  locale: DuelLocale;
}): React.JSX.Element {
  const isOwnMessage = message.senderId === activeLearnerId;

  return (
    <View
      key={message.id}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isOwnMessage ? '#bfdbfe' : '#e2e8f0',
        backgroundColor: isOwnMessage ? '#eff6ff' : '#f8fafc',
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
  );
}

function ChatHeader({
  copy,
  chat,
}: {
  copy: DuelCopy;
  chat: DuelChatState;
}): React.JSX.Element {
  return (
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
  );
}

function ChatForm({
  chat,
  chatDraft,
  chatRemainingChars,
  chatActionError,
  canSendChatMessage,
  copy,
  onChatDraftChange,
  onSendLobbyChat,
}: {
  chat: DuelChatState;
  chatDraft: string;
  chatRemainingChars: number;
  chatActionError: string | null;
  canSendChatMessage: boolean;
  copy: DuelCopy;
  onChatDraftChange: (nextValue: string) => void;
  onSendLobbyChat: () => Promise<void>;
}): React.JSX.Element {
  return (
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
        onChangeText={onChatDraftChange}
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
      {chatActionError !== null ? (
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
        onPress={onSendLobbyChat}
        stretch
      />
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
  const renderStatus = (): React.JSX.Element | null => {
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
  };

  const renderContent = (): React.JSX.Element => (
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
            <ChatMessageRow
              key={message.id}
              activeLearnerId={activeLearnerId}
              locale={locale}
              message={message}
            />
          ))}
        </View>
      )}
      <ChatForm
        canSendChatMessage={canSendChatMessage}
        chat={chat}
        chatActionError={chatActionError}
        chatDraft={chatDraft}
        chatRemainingChars={chatRemainingChars}
        copy={copy}
        onChatDraftChange={onChatDraftChange}
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
        renderStatus() ?? renderContent()
      )}
    </Card>
  );
}
