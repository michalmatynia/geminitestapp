import { Text, TextInput, View } from 'react-native';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  ActionButton,
  MessageCard,
} from '../duels-primitives';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from '../useKangurMobileDuelLobbyChat';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

export function ChatFormInput({
  chat,
  chatDraft,
  copy,
  onChatDraftChange,
}: {
  chat: DuelChatState;
  chatDraft: string;
  copy: DuelCopy;
  onChatDraftChange: (nextValue: string) => void;
}): React.JSX.Element {
  return (
    <TextInput
      accessibilityLabel={copy({
        de: 'Nachricht an den Lobby-Chat',
        en: 'Lobby chat message',
        pl: 'Wiadomość do czatu lobby',
      })}
  editable={chat.isSending === false}
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
  );
}

export function ChatFormActions({
  chat,
  chatRemainingChars,
  chatActionError,
  canSendChatMessage,
  copy,
  onSendLobbyChat,
}: {
  chat: DuelChatState;
  chatRemainingChars: number;
  chatActionError: string | null;
  canSendChatMessage: boolean;
  copy: DuelCopy;
  onSendLobbyChat: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
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
          chat.isSending === true
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
