import { View } from 'react-native';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import {
  BadgesCard,
  LessonCheckpointsCard,
  LessonMasteryCard,
  LinkButton,
  MessageCard,
  NextStepsCard,
} from './duels-primitives';
import {
  DuelLobbyLeaderboardSection,
  DuelLobbyPresenceSection,
  DuelLobbyRecentOpponentsSection,
  DuelLobbySearchSection,
} from './duels-screen-lobby-secondary-sections';
import { HOME_ROUTE } from './utils/duels-ui';
import { DuelLobbyChatPanel } from './DuelLobbyChatPanel';
import { DuelLobbyPlayPanel } from './DuelLobbyPlayPanel';
import { DuelLobbyRoomsPanel } from './DuelLobbyRoomsPanel';
import { type UseKangurMobileDuelLobbyChatResult as DuelChatState } from './useKangurMobileDuelLobbyChat';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelsLobbyViewProps = {
  activeLearnerId: string | null;
  autoRefreshEnabled: boolean;
  autoRefreshChipLabel: string;
  canSendChatMessage: boolean;
  chat: DuelChatState;
  chatActionError: string | null;
  chatDraft: string;
  chatRemainingChars: number;
  copy: DuelCopy;
  lobby: DuelLobbyState;
  lobbyChatPreview: DuelChatState['messages'];
  loginIntroCallToAction: React.JSX.Element;
  loginStartCallToAction: React.JSX.Element;
  locale: DuelLocale;
  onChatDraftChange: (nextValue: string) => void;
  onOpenSession: (sessionId: string) => void;
  onSendLobbyChat: () => Promise<void>;
  onToggleAutoRefresh: () => void;
  renderJoinAction: (targetSessionId: string) => React.JSX.Element;
  renderSpectateAction: (targetSessionId: string) => React.JSX.Element;
  searchStatusLabel: string;
  searchStatusTone: Tone;
};

function GuestIntroCard({ copy, loginIntroCallToAction }: { copy: DuelCopy, loginIntroCallToAction: React.JSX.Element }): React.JSX.Element {
  return (
    <Card>
      <MessageCard
        title={copy({ de: 'Anmelden, um Duelle zu spielen', en: 'Sign in to duel', pl: 'Zaloguj się, aby grać w pojedynki' })}
        description={copy({ de: 'Gäste können die öffentliche Lobby und Rangliste ansehen. Melde dich an, um Duelle zu erstellen oder ihnen beizutreten.', en: 'Guests can browse the public lobby and leaderboard. Sign in to create or join duels.', pl: 'Goście mogą przeglądać publiczne lobby i ranking. Zaloguj się, aby tworzyć pojedynki lub do nich dołączać.' })}
      />
      {loginIntroCallToAction}
    </Card>
  );
}

export function DuelsLobbyView(props: DuelsLobbyViewProps): React.JSX.Element {
  const {
    copy,
    lobby,
    activeLearnerId,
    autoRefreshEnabled,
    autoRefreshChipLabel,
    canSendChatMessage,
    chat,
    chatActionError,
    chatDraft,
    chatRemainingChars,
    lobbyChatPreview,
    locale,
    onChatDraftChange,
    onOpenSession,
    onSendLobbyChat,
    onToggleAutoRefresh,
    renderJoinAction,
    renderSpectateAction,
    searchStatusLabel,
    searchStatusTone,
    loginIntroCallToAction,
  } = props;

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }} keyboardShouldPersistTaps='handled'>
      <View style={{ gap: 14 }}>
        <LinkButton href={HOME_ROUTE} label={copy({ de: 'Zurück', en: 'Back', pl: 'Wróć' })} tone='secondary' />
        <KangurMobileSectionTitle
          title={copy({ de: 'Duelle', en: 'Duels', pl: 'Pojedynki' })}
          subtitle={copy({ de: 'Von hier aus startest du schnelle Matches, öffnest öffentliche Herausforderungen und kehrst direkt zu aktiven Rivalen zurück.', en: 'From here you can start quick matches, open public challenges, and jump straight back to active rivals.', pl: 'Stąd uruchomisz szybkie mecze, otworzysz publiczne wyzwania i od razu wrócisz do aktywnych rywali.' })}
        />
      </View>

      {!lobby.isAuthenticated && !lobby.isLoadingAuth ? <GuestIntroCard copy={copy} loginIntroCallToAction={loginIntroCallToAction} /> : null}

      <DuelLobbyPlayPanel copy={copy} locale={locale} lobby={lobby} loginStartCallToAction={props.loginStartCallToAction} onOpenSession={onOpenSession} />
      <DuelLobbyRoomsPanel autoRefreshChipLabel={autoRefreshChipLabel} autoRefreshEnabled={autoRefreshEnabled} copy={copy} locale={locale} lobby={lobby} onToggleAutoRefresh={onToggleAutoRefresh} renderJoinAction={renderJoinAction} renderSpectateAction={renderSpectateAction} />
      <DuelLobbyChatPanel activeLearnerId={activeLearnerId} canSendChatMessage={canSendChatMessage} chat={chat} chatActionError={chatActionError} chatDraft={chatDraft} chatRemainingChars={chatRemainingChars} copy={copy} lobbyChatPreview={lobbyChatPreview} locale={locale} onChatDraftChange={onChatDraftChange} onSendLobbyChat={onSendLobbyChat} />
      <DuelLobbyPresenceSection copy={copy} locale={locale} lobby={lobby} />
      <DuelLobbySearchSection copy={copy} locale={locale} lobby={lobby} onOpenSession={onOpenSession} searchStatusLabel={searchStatusLabel} searchStatusTone={searchStatusTone} />
      <DuelLobbyRecentOpponentsSection copy={copy} locale={locale} lobby={lobby} onOpenSession={onOpenSession} />
      <DuelLobbyLeaderboardSection copy={copy} locale={locale} lobby={lobby} />
      <LessonCheckpointsCard context='lobby' />
      <LessonMasteryCard context='lobby' />
      <BadgesCard context='lobby' />
      <NextStepsCard context='lobby' />
    </KangurMobileScrollScreen>
  );
}
