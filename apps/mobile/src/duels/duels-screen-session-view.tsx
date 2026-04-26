import { View } from 'react-native';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileCard as Card, KangurMobileScrollScreen, KangurMobileSectionTitle } from '../shared/KangurMobileUi';
import { ActionButton, MessageCard } from './duels-primitives';
import { type resolveRoundProgress } from '../utils/duels-ui';
import { DuelSessionFullContent } from './DuelSessionFullContent';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

export type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
export type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];
export type DuelRoundProgress = ReturnType<typeof resolveRoundProgress>;

export type DuelsSessionViewProps = {
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

function LoadingCard({ duel, copy }: { duel: DuelSessionState, copy: DuelCopy }): React.JSX.Element {
  let description = copy({ de: 'Rundenstatus wird geladen.', en: 'Loading round state.', pl: 'Pobieramy stan rundy.' });
  if (duel.isRestoringAuth) {
    description = copy({ de: 'Die Anmeldung wird wiederhergestellt.', en: 'Restoring sign-in.', pl: 'Przywracamy logowanie.' });
  } else if (duel.isSpectating) {
    description = copy({ de: 'Status wird geladen.', en: 'Loading state.', pl: 'Pobieramy stan.' });
  }

  return (
    <Card>
      <MessageCard
        title={duel.isSpectating ? copy({ de: 'Öffentliches Duell wird geladen', en: 'Loading public duel', pl: 'Ładujemy publiczny pojedynek' }) : copy({ de: 'Duell wird geladen', en: 'Loading duel', pl: 'Ładujemy pojedynek' })}
        description={description}
      />
    </Card>
  );
}

function ErrorCard({ duel, copy, onOpenLobby }: { duel: DuelSessionState, copy: DuelCopy, onOpenLobby: () => void }): React.JSX.Element {
  const errorMsg = duel.error ?? copy({ de: 'Es fehlen Duelldaten.', en: 'Duel data is missing.', pl: 'Brakuje danych.' });
  return (
    <Card>
      <MessageCard
        title={duel.isSpectating ? copy({ de: 'Öffentliches Duell konnte nicht geöffnet werden', en: 'Could not open the public duel', pl: 'Nie udało się otworzyć publicznego pojedynku' }) : copy({ de: 'Duell konnte nicht geöffnet werden', en: 'Could not open the duel', pl: 'Nie udało się otworzyć pojedynku' })}
        description={errorMsg}
        tone='error'
      />
      <ActionButton label={copy({ de: 'Zurück zur Lobby', en: 'Back to lobby', pl: 'Wróć do lobby' })} onPress={onOpenLobby} stretch />
    </Card>
  );
}

function AuthRequiredCard({ copy, loginCallToAction }: { copy: DuelCopy, loginCallToAction: React.JSX.Element }): React.JSX.Element {
  return (
    <Card>
      <MessageCard title={copy({ de: 'Anmelden, um dieses Duell zu öffnen', en: 'Sign in to open this duel', pl: 'Zaloguj się, aby otworzyć ten pojedynek' })} description={copy({ de: 'Melde dich zuerst an.', en: 'Sign in first.', pl: 'Najpierw się zaloguj.' })} />
      {loginCallToAction}
    </Card>
  );
}

export function DuelsSessionView(props: DuelsSessionViewProps): React.JSX.Element {
  const { copy, duel, onOpenLobby } = props;

  const renderContent = (): React.JSX.Element => {
    if (!duel.isSpectating && !duel.isAuthenticated && !props.isLoadingAuth) return <AuthRequiredCard copy={copy} loginCallToAction={props.loginCallToAction} />;
    if (duel.isLoading) return <LoadingCard duel={duel} copy={copy} />;
    return <SessionContent {...props} />;
  };

  function SessionContent(contentProps: DuelsSessionViewProps): React.JSX.Element {
    const { duel: sessionDuel, onOpenLobby: sessionOnOpenLobby } = contentProps;
    if (sessionDuel.error !== null || !sessionDuel.session || (!sessionDuel.isSpectating && !sessionDuel.player)) return <ErrorCard duel={sessionDuel} copy={contentProps.copy} onOpenLobby={sessionOnOpenLobby} />;
    return <DuelSessionFullContent {...contentProps} />;
  }

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
      <View style={{ gap: 14 }}>
        <ActionButton label={copy({ de: 'Zurück zur Lobby', en: 'Back to lobby', pl: 'Wróć do lobby' })} onPress={onOpenLobby} tone='ghost' />
        <KangurMobileSectionTitle title={duel.isSpectating ? copy({ de: 'Öffentliches Duell', en: 'Public duel', pl: 'Publiczny pojedynek' }) : copy({ de: 'Duell', en: 'Duel', pl: 'Pojedynek' })} subtitle={duel.isSpectating ? copy({ de: 'Zuschauermodus.', en: 'Spectator mode.', pl: 'Tryb obserwatora.' }) : copy({ de: 'Duell-Sitzung.', en: 'Duel session.', pl: 'Sesja pojedynku.' })} />
      </View>
      {renderContent()}
    </KangurMobileScrollScreen>
  );
}
