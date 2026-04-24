import { Text, View } from 'react-native';

import {
  formatLobbyChatSenderLabel,
  formatRelativeAge,
} from '../utils/duels-ui';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from '../useKangurMobileDuelLobbyChat';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

export function ChatMessageRow({
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
