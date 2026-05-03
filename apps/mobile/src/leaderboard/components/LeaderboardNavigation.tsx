import React from 'react';
import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

export function LeaderboardNavigation({
  copy,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
}): React.JSX.Element {
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      <Text onPress={() => {}} style={{ color: '#1d4ed8', fontWeight: '700' }}>
        {copy({ de: 'Tagesplan jetzt', en: 'Daily plan now', pl: 'Plan dnia teraz' })}
      </Text>
      <Text onPress={() => {}} style={{ color: '#1d4ed8', fontWeight: '700' }}>
        {copy({ de: 'Duell-Lobby öffnen', en: 'Open duel lobby', pl: 'Otwórz lobby pojedynków' })}
      </Text>
    </View>
  );
}
