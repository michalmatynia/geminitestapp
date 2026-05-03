import React from 'react';
import { MessageCard } from '../duels-primitives';

interface SpectatorMessageProps {
  copy: (v: Record<string, string>) => string;
  isAuthenticated: boolean;
}

export function SpectatorMessage({ copy, isAuthenticated }: SpectatorMessageProps): React.JSX.Element {
  return (
    <MessageCard
      title={copy({ de: 'Zuschauermodus', en: 'Spectator mode', pl: 'Tryb obserwatora' })}
      description={
        isAuthenticated
          ? copy({
              de: 'Du beobachtest das öffentliche Duell. Du kannst Reaktionen senden, beantwortest aber keine Fragen.',
              en: 'You are watching the public duel. You can send reactions, but you do not answer questions.',
              pl: 'Obserwujesz publiczny pojedynek. Możesz wysyłać reakcje, ale nie odpowiadasz na pytania.',
            })
          : copy({
              de: 'Du beobachtest das öffentliche Duell. Melde dich an, wenn du Reaktionen senden möchtest.',
              en: 'You are watching the public duel. Sign in if you want to send reactions.',
              pl: 'Obserwujesz publiczny pojedynek. Zaloguj się, jeśli chcesz wysyłać reakcje.',
            })
      }
    />
  );
}
