import React from 'react';
import { View } from 'react-native';
import { MessageCard } from '../duels-primitives';

interface SpectatorMessageProps {
  copy: (v: Record<string, string>) => string;
  isAuthenticated: boolean;
}

export function SpectatorMessage({ copy, isAuthenticated }: SpectatorMessageProps): React.JSX.Element {
  const baseDescription = copy({
    de: 'Im Beobachtermodus verfolgst du das öffentliche Duell ohne als Spieler beizutreten.',
    en: 'In spectator mode, you follow the public duel without joining as a player.',
    pl: 'W trybie obserwatora śledzisz publiczny pojedynek i reakcje bez dołączania jako gracz.',
  });
  const loginPromptTitle = copy({
    de: 'Anmeldung erforderlich',
    en: 'Sign in required',
    pl: 'Wymagane logowanie',
  });

  return (
    <View style={{ gap: 8 }}>
      <MessageCard
        title={copy({ de: 'Zuschauermodus', en: 'Spectator mode', pl: 'Tryb obserwatora' })}
        description={baseDescription}
      />
      {!isAuthenticated ? (
        <MessageCard
          title={loginPromptTitle}
          description={copy({
            de: 'Du beobachtest das öffentliche Duell. Melde dich an, wenn du Reaktionen senden möchtest.',
            en: 'You are watching the public duel. Sign in if you want to send reactions.',
            pl: 'Obserwujesz publiczny pojedynek. Zaloguj się, jeśli chcesz wysyłać reakcje.',
          })}
        />
      ) : null}
    </View>
  );
}
