import { View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
  BadgesCard,
  LessonCheckpointsCard,
  LessonMasteryCard,
  MessageCard,
  NextStepsCard,
} from './duels-primitives';
import { type resolveRoundProgress } from './utils/duels-ui';
import { DuelSessionActionsCard } from './DuelSessionActionsCard';
import { DuelSessionDetailsCard } from './DuelSessionDetailsCard';
import { DuelSessionPlayersCard } from './DuelSessionPlayersCard';
import { DuelSessionQuestionCard } from './DuelSessionQuestionCard';
import { DuelSessionReactionsCard } from './DuelSessionReactionsCard';
import { DuelSessionSeriesCard } from './DuelSessionSeriesCard';
import { DuelSessionSummaryCard } from './DuelSessionSummaryCard';
import { DuelSessionWaitingRoomCard } from './DuelSessionWaitingRoomCard';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];
type DuelRoundProgress = ReturnType<typeof resolveRoundProgress>;

type DuelsSessionViewProps = {
  canShareInvite: boolean;
  copy: DuelCopy;
  duel: DuelSessionState;
  hasWaitingSession: boolean;
  inviteeName: string;
  inviteShareError: string | null;
  isFinishedSession: boolean;
  isLoadingAuth: boolean;
  isLobbyActionPending: boolean;
  locale: DuelLocale;
  loginCallToAction: React.JSX.Element;
  onHandleInviteShare: () => Promise<void>;
  onHandleRematch: () => Promise<void>;
  onOpenLobby: () => void;
  roundProgress: DuelRoundProgress;
  sessionTimelineItems: string[];
};

export function DuelsSessionView({
  canShareInvite,
  copy,
  duel,
  hasWaitingSession,
  inviteeName,
  inviteShareError,
  isFinishedSession,
  isLoadingAuth,
  isLobbyActionPending,
  locale,
  loginCallToAction,
  onHandleInviteShare,
  onHandleRematch,
  onOpenLobby,
  roundProgress,
  sessionTimelineItems,
}: DuelsSessionViewProps): React.JSX.Element {
  const renderLoading = (): React.JSX.Element => (
    <Card>
      <MessageCard
        title={
          duel.isSpectating
            ? copy({
                de: 'Öffentliches Duell wird geladen',
                en: 'Loading public duel',
                pl: 'Ładujemy publiczny pojedynek',
              })
            : copy({
                de: 'Duell wird geladen',
                en: 'Loading duel',
                pl: 'Ładujemy pojedynek',
              })
        }
        description={
          duel.isRestoringAuth
            ? copy({
                de: 'Die Anmeldung wird wiederhergestellt und das aktive Duell geladen.',
                en: 'Restoring sign-in and loading the active duel.',
                pl: 'Przywracamy logowanie i pobieramy aktywny pojedynek.',
              })
            : duel.isSpectating
              ? copy({
                  de: 'Der öffentliche Rundenstatus, die Spielerliste und die Zahl der Zuschauer werden geladen.',
                  en: 'Loading the public round state, player list, and spectator count.',
                  pl: 'Pobieramy publiczny stan rundy, listę graczy i liczbę widzów.',
                })
              : copy({
                  de: 'Der aktuelle Rundenstatus und die Spielerliste werden geladen.',
                  en: 'Loading the current round state and player list.',
                  pl: 'Pobieramy aktualny stan rundy i listę graczy.',
                })
        }
      />
    </Card>
  );

  const renderError = (): React.JSX.Element => (
    <Card>
      <MessageCard
        title={
          duel.isSpectating
            ? copy({
                de: 'Öffentliches Duell konnte nicht geöffnet werden',
                en: 'Could not open the public duel',
                pl: 'Nie udało się otworzyć publicznego pojedynku',
              })
            : copy({
                de: 'Duell konnte nicht geöffnet werden',
                en: 'Could not open the duel',
                pl: 'Nie udało się otworzyć pojedynku',
              })
        }
        description={
          duel.error ??
          (duel.isSpectating
            ? copy({
                de: 'Es fehlen öffentliche Duelldaten. Kehre zur Lobby zurück und versuche es erneut.',
                en: 'Public duel details are missing. Go back to the lobby and try again.',
                pl: 'Brakuje danych publicznego pojedynku. Wróć do lobby i spróbuj jeszcze raz.',
              })
            : copy({
                de: 'Es fehlen Duelldaten. Kehre zur Lobby zurück und versuche es erneut.',
                en: 'The duel data is missing. Go back to the lobby and try again.',
                pl: 'Brakuje danych pojedynku. Wróć do lobby i spróbuj jeszcze raz.',
              }))
        }
        tone='error'
      />
      <ActionButton
        label={copy({
          de: 'Zurück zur Lobby',
          en: 'Back to lobby',
          pl: 'Wróć do lobby',
        })}
        onPress={onOpenLobby}
        stretch
      />
    </Card>
  );

  const renderAuthRequired = (): React.JSX.Element => (
    <Card>
      <MessageCard
        title={copy({
          de: 'Anmelden, um dieses Duell zu öffnen',
          en: 'Sign in to open this duel',
          pl: 'Zaloguj się, aby otworzyć ten pojedynek',
        })}
        description={copy({
          de: 'Melde dich zuerst an, dann kannst du dieses Duell öffnen.',
          en: 'Sign in first to open this duel.',
          pl: 'Najpierw się zaloguj, aby otworzyć ten pojedynek.',
        })}
      />
      {loginCallToAction}
    </Card>
  );

  const renderContent = (): React.JSX.Element => {
    if (!duel.isSpectating && !duel.isAuthenticated && !isLoadingAuth) {
      return renderAuthRequired();
    }

    if (duel.isLoading) {
      return renderLoading();
    }

    if (duel.error !== null || !duel.session || (!duel.isSpectating && !duel.player)) {
      return renderError();
    }

    return (
      <>
        <DuelSessionDetailsCard
          copy={copy}
          duel={duel}
          hasWaitingSession={hasWaitingSession}
          locale={locale}
          roundProgress={roundProgress}
          sessionTimelineItems={sessionTimelineItems}
        />
        <DuelSessionSeriesCard copy={copy} duel={duel} locale={locale} />
        <DuelSessionPlayersCard copy={copy} duel={duel} locale={locale} />
        <DuelSessionReactionsCard copy={copy} duel={duel} locale={locale} />
        <DuelSessionWaitingRoomCard
          canShareInvite={canShareInvite}
          copy={copy}
          duel={duel}
          inviteeName={inviteeName}
          inviteShareError={inviteShareError}
          onHandleInviteShare={onHandleInviteShare}
        />
        <DuelSessionQuestionCard copy={copy} duel={duel} />
        <DuelSessionSummaryCard
          copy={copy}
          duel={duel}
          isFinishedSession={isFinishedSession}
          isLobbyActionPending={isLobbyActionPending}
          locale={locale}
          onHandleRematch={onHandleRematch}
          onOpenLobby={onOpenLobby}
        />
        <DuelSessionActionsCard
          copy={copy}
          duel={duel}
          hasWaitingSession={hasWaitingSession}
          isFinishedSession={isFinishedSession}
          onOpenLobby={onOpenLobby}
        />
        <LessonCheckpointsCard context='session' />
        <LessonMasteryCard context='session' />
        <BadgesCard context='session' />
        <NextStepsCard context='session' />
      </>
    );
  };

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
          title={
            duel.isSpectating
              ? copy({
                  de: 'Öffentliches Duell',
                  en: 'Public duel',
                  pl: 'Publiczny pojedynek',
                })
              : copy({
                  de: 'Duell',
                  en: 'Duel',
                  pl: 'Pojedynek',
                })
          }
          subtitle={
            duel.isSpectating
              ? copy({
                  de: 'Im Zuschauermodus verfolgst du das öffentliche Duell und die Reaktionen, ohne als Spieler beizutreten.',
                  en: 'In spectator mode, you follow the public duel and reactions without joining as a player.',
                  pl: 'W trybie obserwatora śledzisz publiczny pojedynek i reakcje bez dołączania jako gracz.',
                })
              : copy({
                  de: 'Hier kannst du im Warteraum bleiben, den Spielfortschritt verfolgen und den Rundenstatus prüfen, ohne das Duell zu verlassen.',
                  en: 'Here you can stay in the waiting room, follow player progress, and check round status without leaving the duel.',
                  pl: 'Tutaj możesz zostać w poczekalni, śledzić postęp graczy i sprawdzać stan rundy bez wychodzenia z pojedynku.',
                })
          }
        />
      </View>

      {renderContent()}
    </KangurMobileScrollScreen>
  );
}
