import { Text, View } from 'react-native';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  ActionButton,
} from '../duels-primitives';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from '../useKangurMobileDuelLobbyChat';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

export function ChatHeader({
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
