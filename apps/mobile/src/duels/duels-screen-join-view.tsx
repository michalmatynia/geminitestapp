import { Text, View } from 'react-native';

import {
  KangurMobileCard as Card,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
} from '../shared/KangurMobileUi';
import { ActionButton, MessageCard } from './duels-primitives';

type DuelCopy = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['copy'];

type DuelsJoinRouteViewProps = {
  copy: DuelCopy;
  isAuthenticated: boolean;
  isActionPending: boolean;
  isJoiningFromRoute: boolean;
  isLoadingAuth: boolean;
  lobbyActionError: string | null;
  loginCallToAction: React.JSX.Element;
  onJoinFromRoute: () => Promise<void>;
  onOpenLobby: () => void;
  routeJoinError: string | null;
};

export function DuelsJoinRouteView({
  copy,
  isAuthenticated,
  isActionPending,
  isJoiningFromRoute,
  isLoadingAuth,
  lobbyActionError,
  loginCallToAction,
  onJoinFromRoute,
  onOpenLobby,
  routeJoinError,
}: DuelsJoinRouteViewProps): React.JSX.Element {
  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
      <View style={{ gap: 14 }}>
        <ActionButton
          label={copy({
            de: 'Zurück zur Lobby',
            en: 'Back to lobby',
            pl: 'Wróć do lobby',
          })}
          onPress={onOpenLobby}
          tone='ghost'
        />
        <KangurMobileSectionTitle
          title={copy({
            de: 'Einladung beitreten',
            en: 'Joining invite',
            pl: 'Dołączanie do zaproszenia',
          })}
          subtitle={copy({
            de: 'Ein Link mit dem Parameter join akzeptiert eine private Einladung und öffnet danach die aktive Duellsitzung.',
            en: 'A link with the join parameter accepts a private invite and then opens the active duel session.',
            pl: 'Link z parametrem join przyjmuje prywatne zaproszenie i po powodzeniu otwiera aktywną sesję pojedynku.',
          })}
        />
      </View>

      {!isAuthenticated && !isLoadingAuth ? (
        <Card>
          <MessageCard
            title={copy({
              de: 'Anmelden, um die Einladung anzunehmen',
              en: 'Sign in to accept the invite',
              pl: 'Zaloguj się, aby przyjąć zaproszenie',
            })}
            description={copy({
              de: 'Melde dich an, dann kannst du diese private Duell-Einladung annehmen.',
              en: 'Sign in first to accept this private duel invite.',
              pl: 'Zaloguj się, aby przyjąć to prywatne zaproszenie do pojedynku.',
            })}
          />
          {loginCallToAction}
        </Card>
      ) : isJoiningFromRoute || isActionPending ? (
        <Card>
          <MessageCard
            title={copy({
              de: 'Duellbeitritt läuft',
              en: 'Joining duel',
              pl: 'Dołączamy do pojedynku',
            })}
            description={copy({
              de: 'Die private Einladung wird akzeptiert und der vollständige Sitzungsstatus geladen.',
              en: 'Accepting the private invite and loading the full session state.',
              pl: 'Akceptujemy prywatne zaproszenie i pobieramy pełny stan sesji.',
            })}
          />
        </Card>
      ) : routeJoinError || lobbyActionError ? (
        <Card>
          <MessageCard
            title={copy({
              de: 'Einladung konnte nicht angenommen werden',
              en: 'Could not accept the invite',
              pl: 'Nie udało się przyjąć zaproszenia',
            })}
            description={
              routeJoinError ??
              lobbyActionError ??
              copy({
                de: 'Versuche es erneut oder kehre zur Duell-Lobby zurück.',
                en: 'Try again or go back to the duels lobby.',
                pl: 'Spróbuj ponownie albo wróć do lobby pojedynków.',
              })
            }
            tone='error'
          />
          <View style={{ gap: 8 }}>
            <ActionButton
              label={copy({
                de: 'Erneut versuchen',
                en: 'Try again',
                pl: 'Spróbuj ponownie',
              })}
              onPress={onJoinFromRoute}
              stretch
            />
            <ActionButton
              label={copy({
                de: 'Zurück zur Lobby',
                en: 'Back to lobby',
                pl: 'Wróć do lobby',
              })}
              onPress={onOpenLobby}
              stretch
              tone='secondary'
            />
          </View>
        </Card>
      ) : (
        <Card>
          <MessageCard
            title={copy({
              de: 'Sitzung wird vorbereitet',
              en: 'Preparing session',
              pl: 'Przygotowujemy sesję',
            })}
            description={copy({
              de: 'Wenn der Link korrekt ist, öffnet sich gleich das Duell.',
              en: 'If the link is correct, the duel will open shortly.',
              pl: 'Jeśli link jest poprawny, pojedynek otworzy się za chwilę.',
            })}
          />
        </Card>
      )}
    </KangurMobileScrollScreen>
  );
}
