import type {
  KangurDuelChoice,
  KangurDuelDifficulty,
  KangurDuelLobbyChatMessage,
  KangurDuelMode,
  KangurDuelOperation,
  KangurDuelPlayer,
  KangurDuelPlayerStatus,
  KangurDuelReactionType,
  KangurDuelSession,
  KangurDuelStatus,
} from '@kangur/contracts';
import { Link, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from './duelsHref';
import { useKangurMobileDuelLobbyChat } from './useKangurMobileDuelLobbyChat';
import { useKangurMobileDuelSession } from './useKangurMobileDuelSession';
import { useKangurMobileDuelsLobby } from './useKangurMobileDuelsLobby';

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const HOME_ROUTE = '/' as Href;

const DUEL_MODE_LABELS: Record<KangurDuelMode, string> = {
  challenge: 'Wyzwanie',
  quick_match: 'Szybki mecz',
};

const DUEL_OPERATION_SYMBOLS: Record<KangurDuelOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

const DUEL_OPERATION_LABELS: Record<KangurDuelOperation, string> = {
  addition: 'Dodawanie',
  subtraction: 'Odejmowanie',
  multiplication: 'Mnożenie',
  division: 'Dzielenie',
};

const DUEL_DIFFICULTY_LABELS: Record<KangurDuelDifficulty, string> = {
  easy: 'Łatwy',
  medium: 'Średni',
  hard: 'Trudny',
};

const DUEL_DIFFICULTY_EMOJIS: Record<KangurDuelDifficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

const DUEL_STATUS_LABELS: Record<KangurDuelStatus, string> = {
  aborted: 'Przerwany',
  completed: 'Zakończony',
  created: 'Utworzony',
  in_progress: 'W trakcie',
  ready: 'Gotowy',
  waiting: 'Oczekiwanie',
};

const DUEL_PLAYER_STATUS_LABELS: Record<KangurDuelPlayerStatus, string> = {
  completed: 'Ukończono',
  invited: 'Zaproszony',
  left: 'Wyszedł',
  playing: 'Gra',
  ready: 'Gotowy',
};

const MODE_FILTER_OPTIONS: Array<{
  value: 'all' | KangurDuelMode;
  label: string;
}> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'quick_match', label: 'Szybkie mecze' },
  { value: 'challenge', label: 'Wyzwania' },
];

const OPERATION_OPTIONS: KangurDuelOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

const DIFFICULTY_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];
const DUEL_REACTION_OPTIONS: KangurDuelReactionType[] = [
  'cheer',
  'wow',
  'gg',
  'fire',
  'clap',
  'rocket',
  'thumbs_up',
];
const LOBBY_CHAT_PREVIEW_LIMIT = 8;

const DUEL_REACTION_EMOJIS: Record<KangurDuelReactionType, string> = {
  cheer: '👏',
  wow: '😮',
  gg: '🤝',
  fire: '🔥',
  clap: '🙌',
  rocket: '🚀',
  thumbs_up: '👍',
};

const DUEL_REACTION_LABELS: Record<KangurDuelReactionType, string> = {
  cheer: 'Brawa',
  wow: 'Wow',
  gg: 'Dobra gra',
  fire: 'Ogień',
  clap: 'Super',
  rocket: 'Rakieta',
  thumbs_up: 'Kciuk w górę',
};

function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: '#ffffff',
        padding: 18,
        gap: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  subtitle: string;
  title: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>
        {title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
        {subtitle}
      </Text>
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  stretch = false,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  stretch?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';
  const isGhost = tone === 'ghost';

  return (
    <Pressable
      accessibilityRole='button'
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={{
        alignSelf: stretch ? 'stretch' : 'flex-start',
        opacity: disabled ? 0.55 : 1,
        borderRadius: 999,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: isGhost ? '#e2e8f0' : isPrimary ? 'transparent' : '#cbd5e1',
        backgroundColor: isPrimary ? '#0f172a' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          color: isPrimary ? '#ffffff' : '#0f172a',
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LinkButton({
  href,
  label,
  stretch = false,
  tone = 'secondary',
}: {
  href: Href;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole='button'
        style={{
          alignSelf: stretch ? 'stretch' : 'flex-start',
          borderRadius: 999,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: isPrimary ? 'transparent' : '#cbd5e1',
          backgroundColor: isPrimary ? '#0f172a' : '#ffffff',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            color: isPrimary ? '#ffffff' : '#0f172a',
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function FilterChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#1d4ed8' : '#cbd5e1',
        backgroundColor: selected ? '#dbeafe' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: selected ? '#1d4ed8' : '#334155',
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MessageCard({
  description,
  title,
  tone = 'neutral',
}: {
  description: string;
  title: string;
  tone?: 'error' | 'neutral';
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: tone === 'error' ? '#fecaca' : '#e2e8f0',
        backgroundColor: tone === 'error' ? '#fef2f2' : '#f8fafc',
        gap: 8,
        padding: 14,
      }}
    >
      <Text
        style={{
          color: tone === 'error' ? '#991b1b' : '#0f172a',
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: tone === 'error' ? '#7f1d1d' : '#475569',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </View>
  );
}

function getStatusTone(status: KangurDuelStatus): Tone {
  if (status === 'completed') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (status === 'aborted') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (status === 'in_progress' || status === 'ready') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
}

function getPlayerStatusTone(status: KangurDuelPlayerStatus): Tone {
  if (status === 'completed') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (status === 'left') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (status === 'playing') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
}

function formatModeLabel(mode: KangurDuelMode): string {
  return DUEL_MODE_LABELS[mode];
}

function formatOperationLabel(operation: KangurDuelOperation): string {
  return `${DUEL_OPERATION_SYMBOLS[operation]} ${DUEL_OPERATION_LABELS[operation]}`;
}

function formatDifficultyLabel(difficulty: KangurDuelDifficulty): string {
  return `${DUEL_DIFFICULTY_EMOJIS[difficulty]} ${DUEL_DIFFICULTY_LABELS[difficulty]}`;
}

function formatStatusLabel(status: KangurDuelStatus): string {
  return DUEL_STATUS_LABELS[status];
}

function formatPlayerStatusLabel(status: KangurDuelPlayerStatus): string {
  return DUEL_PLAYER_STATUS_LABELS[status];
}

function formatReactionLabel(type: KangurDuelReactionType): string {
  return `${DUEL_REACTION_EMOJIS[type]} ${DUEL_REACTION_LABELS[type]}`;
}

function formatRelativeAge(isoString: string): string {
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) {
    return 'przed chwilą';
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) {
    return 'przed chwilą';
  }
  if (seconds < 60) {
    return `${seconds}s temu`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min temu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} godz. temu`;
  }

  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
}

function formatQuestionProgress(session: KangurDuelSession, player: KangurDuelPlayer): string {
  const completed = Math.min(player.currentQuestionIndex ?? 0, session.questionCount);
  return `${completed}/${session.questionCount} pytań`;
}

function formatSpectatorQuestionProgress(session: KangurDuelSession): string {
  const currentQuestion =
    session.status === 'in_progress'
      ? Math.min((session.currentQuestionIndex ?? 0) + 1, session.questionCount)
      : Math.min(session.currentQuestionIndex ?? 0, session.questionCount);
  return `Runda ${currentQuestion}/${session.questionCount}`;
}

function resolveWinnerSummary(players: KangurDuelPlayer[]): string {
  if (!players.length) {
    return 'Pojedynek zakończony.';
  }

  const sorted = [...players].sort((left, right) => {
    const leftScore = left.score + (left.bonusPoints ?? 0);
    const rightScore = right.score + (right.bonusPoints ?? 0);
    return rightScore - leftScore;
  });
  const topPlayer = sorted[0];
  const secondPlayer = sorted[1];

  if (!topPlayer) {
    return 'Pojedynek zakończony.';
  }

  const topScore = topPlayer.score + (topPlayer.bonusPoints ?? 0);
  const secondScore = secondPlayer
    ? secondPlayer.score + (secondPlayer.bonusPoints ?? 0)
    : null;

  if (secondScore !== null && secondScore === topScore) {
    return 'Remis po ostatniej rundzie.';
  }

  return `Wygrywa ${topPlayer.displayName} z wynikiem ${topScore}.`;
}

function resolveSessionIdParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized || null;
}

function resolveSpectateParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function formatLobbyChatSenderLabel(
  message: KangurDuelLobbyChatMessage,
  activeLearnerId: string | null,
): string {
  return message.senderId === activeLearnerId ? 'Ty' : message.senderName;
}

function LobbyEntryCard({
  action,
  actionLabel,
  description,
  entry,
}: {
  action: React.ReactNode;
  actionLabel: string;
  description: string;
  entry: {
    createdAt: string;
    difficulty: KangurDuelDifficulty;
    host: {
      displayName: string;
      learnerId: string;
    };
    mode: KangurDuelMode;
    operation: KangurDuelOperation;
    questionCount: number;
    sessionId: string;
    status: KangurDuelStatus;
    timePerQuestionSec: number;
    updatedAt: string;
  };
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 17, fontWeight: '800' }}>
          {entry.host.displayName}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={formatModeLabel(entry.mode)} tone={getStatusTone(entry.status)} />
        <Pill
          label={formatOperationLabel(entry.operation)}
          tone={{
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          }}
        />
        <Pill
          label={formatDifficultyLabel(entry.difficulty)}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {entry.questionCount} pytań · {entry.timePerQuestionSec}s na pytanie · aktualizacja{' '}
        {formatRelativeAge(entry.updatedAt)}
      </Text>

      <View style={{ gap: 8 }}>
        {action}
        <Text style={{ color: '#64748b', fontSize: 12 }}>{actionLabel}</Text>
      </View>
    </View>
  );
}

export function KangurDuelsScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    join?: string | string[];
    spectate?: string | string[];
    sessionId?: string | string[];
  }>();
  const router = useRouter();
  const {
    isLoadingAuth,
    session: authSession,
    signIn,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();
  const routeSessionId = resolveSessionIdParam(params.sessionId);
  const joinSessionId = routeSessionId
    ? null
    : resolveSessionIdParam(params.join);
  const sessionId = routeSessionId;
  const isSpectatingRoute = resolveSpectateParam(params.spectate);
  const lobby = useKangurMobileDuelsLobby();
  const chat = useKangurMobileDuelLobbyChat();
  const duel = useKangurMobileDuelSession(sessionId, {
    spectate: isSpectatingRoute,
  });
  const attemptedJoinSessionIdRef = useRef<string | null>(null);
  const activeLearnerId =
    authSession.user?.activeLearner?.id ?? authSession.user?.id ?? null;
  const [chatDraft, setChatDraft] = useState('');
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [routeJoinError, setRouteJoinError] = useState<string | null>(null);
  const [isJoiningFromRoute, setIsJoiningFromRoute] = useState(false);
  const lobbyChatPreview = chat.messages.slice(-LOBBY_CHAT_PREVIEW_LIMIT);
  const chatRemainingChars = Math.max(0, chat.maxMessageLength - chatDraft.length);
  const canSendChatMessage =
    chat.isAuthenticated &&
    !chat.isSending &&
    chatDraft.trim().length > 0 &&
    chatDraft.trim().length <= chat.maxMessageLength;

  const createLoginCallToAction = (label: string): React.JSX.Element =>
    supportsLearnerCredentials ? (
      <LinkButton href={HOME_ROUTE} label={label} stretch tone='primary' />
    ) : (
      <ActionButton label={label} onPress={signIn} stretch />
    );

  const openSession = (nextSessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId: nextSessionId }));
  };

  const openLobby = (): void => {
    router.replace(createKangurDuelsHref());
  };

  const joinSessionFromRoute = async (): Promise<void> => {
    if (!joinSessionId) {
      return;
    }

    setRouteJoinError(null);
    setIsJoiningFromRoute(true);

    try {
      const nextSessionId = await lobby.joinDuel(joinSessionId);
      if (nextSessionId) {
        openSession(nextSessionId);
        return;
      }

      setRouteJoinError(
        lobby.actionError ?? 'Nie udało się dołączyć do zaproszenia do pojedynku.',
      );
    } finally {
      setIsJoiningFromRoute(false);
    }
  };

  useEffect(() => {
    if (!joinSessionId || routeSessionId || isSpectatingRoute) {
      return;
    }

    if (!lobby.isAuthenticated || lobby.isLoadingAuth) {
      return;
    }

    if (attemptedJoinSessionIdRef.current === joinSessionId) {
      return;
    }

    attemptedJoinSessionIdRef.current = joinSessionId;
    void joinSessionFromRoute();
  }, [
    isSpectatingRoute,
    joinSessionId,
    lobby.isAuthenticated,
    lobby.isLoadingAuth,
    routeSessionId,
  ]);

  const handleLobbyChatSend = async (): Promise<void> => {
    setChatActionError(null);

    const didSend = await chat.sendMessage(chatDraft);
    if (didSend) {
      setChatDraft('');
      return;
    }

    setChatActionError('Nie udało się wysłać wiadomości do czatu lobby.');
  };

  const renderJoinAction = (targetSessionId: string): React.JSX.Element =>
    lobby.isAuthenticated ? (
      <ActionButton
        label='Dołącz do pojedynku'
        onPress={async () => {
          const nextSessionId = await lobby.joinDuel(targetSessionId);
          if (nextSessionId) {
            openSession(nextSessionId);
          }
        }}
        stretch
      />
    ) : (
      createLoginCallToAction('Zaloguj, aby dołączyć')
    );

  const renderSpectateAction = (targetSessionId: string): React.JSX.Element => (
    <LinkButton
      href={createKangurDuelsHref({ sessionId: targetSessionId, spectate: true })}
      label='Obserwuj pojedynek'
      stretch
      tone='secondary'
    />
  );

  if (joinSessionId && !routeSessionId && !isSpectatingRoute) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
        <ScrollView
          contentContainerStyle={{
            gap: 18,
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
        >
          <View style={{ gap: 14 }}>
            <ActionButton label='Wróć do lobby' onPress={openLobby} tone='ghost' />
            <SectionTitle
              title='Dołączanie do zaproszenia'
              subtitle='Link z parametrem join przyjmuje prywatne zaproszenie i po powodzeniu otwiera aktywną sesję pojedynku.'
            />
          </View>

          {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
            <Card>
              <MessageCard
                title='Zaloguj sesję ucznia'
                description='Prywatne zaproszenie do pojedynku wymaga aktywnej sesji ucznia.'
              />
              {createLoginCallToAction('Przejdź do logowania')}
            </Card>
          ) : isJoiningFromRoute || lobby.isActionPending ? (
            <Card>
              <MessageCard
                title='Dołączamy do pojedynku'
                description='Akceptujemy prywatne zaproszenie i pobieramy pełny stan sesji.'
              />
            </Card>
          ) : routeJoinError || lobby.actionError ? (
            <Card>
              <MessageCard
                title='Nie udało się przyjąć zaproszenia'
                description={
                  routeJoinError ??
                  lobby.actionError ??
                  'Spróbuj ponownie albo wróć do lobby pojedynków.'
                }
                tone='error'
              />
              <View style={{ gap: 8 }}>
                <ActionButton
                  label='Spróbuj ponownie'
                  onPress={joinSessionFromRoute}
                  stretch
                />
                <ActionButton
                  label='Wróć do lobby'
                  onPress={openLobby}
                  stretch
                  tone='secondary'
                />
              </View>
            </Card>
          ) : (
            <Card>
              <MessageCard
                title='Przygotowujemy sesję'
                description='Jeśli link jest poprawny, za chwilę otworzy się ekran pojedynku.'
              />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (sessionId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
        <ScrollView
          contentContainerStyle={{
            gap: 18,
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
        >
          <View style={{ gap: 14 }}>
            <ActionButton label='Wróć do lobby' onPress={openLobby} tone='ghost' />
            <SectionTitle
              title={duel.isSpectating ? 'Podgląd pojedynku' : 'Pojedynek'}
              subtitle={
                duel.isSpectating
                  ? 'Tryb obserwatora pokazuje publiczny stan pojedynku i reakcje bez dołączania do meczu jako gracz.'
                  : 'Mobilny ekran pojedynku pokazuje poczekalnię, postęp gracza i stan rundy na tych samych kontraktach duels co web.'
              }
            />
          </View>

          {!duel.isSpectating && !duel.isAuthenticated && !isLoadingAuth ? (
            <Card>
              <MessageCard
                title='Zaloguj sesję ucznia'
                description='Do otwarcia konkretnego pojedynku potrzebna jest aktywna sesja ucznia.'
              />
              {createLoginCallToAction('Przejdź do logowania')}
            </Card>
          ) : duel.isLoading ? (
            <Card>
              <MessageCard
                title={duel.isSpectating ? 'Ładujemy podgląd pojedynku' : 'Ładujemy pojedynek'}
                description={
                  duel.isRestoringAuth
                    ? 'Przywracamy sesję ucznia i stan aktywnego pojedynku.'
                    : duel.isSpectating
                      ? 'Pobieramy publiczny stan rundy, listę graczy i liczbę widzów.'
                      : 'Pobieramy aktualny stan rundy i listę graczy.'
                }
              />
            </Card>
          ) : duel.error || !duel.session || (!duel.isSpectating && !duel.player) ? (
            <Card>
              <MessageCard
                title={
                  duel.isSpectating
                    ? 'Nie udało się otworzyć podglądu pojedynku'
                    : 'Nie udało się otworzyć pojedynku'
                }
                description={
                  duel.error ??
                  (duel.isSpectating
                    ? 'Brakuje danych publicznego podglądu. Wróć do lobby i spróbuj jeszcze raz.'
                    : 'Brakuje danych pojedynku. Wróć do lobby i spróbuj jeszcze raz.')
                }
                tone='error'
              />
              <ActionButton label='Wróć do lobby' onPress={openLobby} stretch />
            </Card>
          ) : (
            <>
              <Card>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    Sesja {duel.session.id}
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {formatModeLabel(duel.session.mode)} · {formatOperationLabel(duel.session.operation)}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {duel.session.questionCount} pytań · {duel.session.timePerQuestionSec}s na odpowiedź ·{' '}
                    {formatDifficultyLabel(duel.session.difficulty)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pill
                    label={formatStatusLabel(duel.session.status)}
                    tone={getStatusTone(duel.session.status)}
                  />
                  <Pill
                    label={duel.session.visibility === 'private' ? 'Prywatny' : 'Publiczny'}
                    tone={{
                      backgroundColor: '#f8fafc',
                      borderColor: '#cbd5e1',
                      textColor: '#475569',
                    }}
                  />
                  <Pill
                    label={
                      duel.player
                        ? formatQuestionProgress(duel.session, duel.player)
                        : formatSpectatorQuestionProgress(duel.session)
                    }
                    tone={{
                      backgroundColor: '#eff6ff',
                      borderColor: '#bfdbfe',
                      textColor: '#1d4ed8',
                    }}
                  />
                  {duel.isSpectating || duel.spectatorCount > 0 ? (
                    <Pill
                      label={`Widownia ${duel.spectatorCount}`}
                      tone={{
                        backgroundColor: '#f5f3ff',
                        borderColor: '#ddd6fe',
                        textColor: '#6d28d9',
                      }}
                    />
                  ) : null}
                </View>

                {duel.isSpectating ? (
                  <MessageCard
                    title='Tryb obserwatora'
                    description={
                      duel.isAuthenticated
                        ? 'Obserwujesz publiczny stan pojedynku. Możesz wysyłać reakcje, ale nie odpowiadasz na pytania.'
                        : 'Obserwujesz publiczny stan pojedynku. Zaloguj sesję ucznia, jeśli chcesz wysyłać reakcje.'
                    }
                  />
                ) : null}

                {duel.actionError ? (
                  <MessageCard
                    title='Akcja nie powiodła się'
                    description={duel.actionError}
                    tone='error'
                  />
                ) : null}
              </Card>

              <Card>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  Gracze
                </Text>
                <View style={{ gap: 10 }}>
                  {duel.session.players.map((player) => (
                    <View
                      key={player.learnerId}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          player.learnerId === duel.player?.learnerId ? '#bfdbfe' : '#e2e8f0',
                        backgroundColor:
                          player.learnerId === duel.player?.learnerId ? '#eff6ff' : '#f8fafc',
                        gap: 8,
                        padding: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                          {player.displayName}
                        </Text>
                        <Pill
                          label={formatPlayerStatusLabel(player.status)}
                          tone={getPlayerStatusTone(player.status)}
                        />
                      </View>
                      <Text style={{ color: '#475569', lineHeight: 20 }}>
                        Wynik {player.score}
                        {player.bonusPoints ? ` + ${player.bonusPoints} bonus` : ''} ·{' '}
                        {formatQuestionProgress(duel.session!, player)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              <Card>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  Reakcje
                </Text>
                {duel.session.status === 'completed' || duel.session.status === 'aborted' ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    Sesja jest zakończona, ale ostatnie reakcje zostają widoczne w historii
                    pojedynku.
                  </Text>
                ) : !duel.isAuthenticated ? (
                  <MessageCard
                    title='Reakcje dla zalogowanych'
                    description='Zalogowany uczeń może reagować na przebieg pojedynku emotkami na żywo.'
                  />
                ) : (
                  <>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {duel.isSpectating
                        ? 'Wyślij szybką reakcję podczas oglądania pojedynku.'
                        : 'Wyślij szybką reakcję bez opuszczania pojedynku.'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {DUEL_REACTION_OPTIONS.map((type) => (
                        <ActionButton
                          key={type}
                          disabled={duel.isMutating}
                          label={formatReactionLabel(type)}
                          onPress={async () => {
                            await duel.sendReaction(type);
                          }}
                          tone='secondary'
                        />
                      ))}
                    </View>
                  </>
                )}

                {duel.session.recentReactions?.length ? (
                  <View style={{ gap: 10 }}>
                    {duel.session.recentReactions
                      .slice(-6)
                      .reverse()
                      .map((reaction) => (
                        <View
                          key={reaction.id}
                          style={{
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor:
                              reaction.learnerId === duel.player?.learnerId
                                ? '#bfdbfe'
                                : '#e2e8f0',
                            backgroundColor:
                              reaction.learnerId === duel.player?.learnerId
                                ? '#eff6ff'
                                : '#f8fafc',
                            gap: 6,
                            padding: 12,
                          }}
                        >
                          <Text
                            style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}
                          >
                            {formatReactionLabel(reaction.type)}
                          </Text>
                          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                            {reaction.displayName} · {formatRelativeAge(reaction.createdAt)}
                          </Text>
                        </View>
                      ))}
                  </View>
                ) : (
                  <MessageCard
                    title='Brak reakcji'
                    description='Po pierwszej emotce historia reakcji pojawi się tutaj.'
                  />
                )}
              </Card>

              {duel.session.status === 'waiting' ||
              duel.session.status === 'ready' ||
              duel.session.status === 'created' ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {duel.isSpectating
                      ? 'Poczekalnia publicznego pojedynku'
                      : 'Poczekalnia pojedynku'}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {duel.isSpectating
                      ? 'Obserwujesz etap oczekiwania. Gdy wymagani gracze dołączą, podgląd przełączy się automatycznie do aktywnej rundy.'
                      : 'Czekamy, aż wszyscy gracze dołączą i backend przełączy sesję do aktywnej rundy. Gdy druga osoba pojawi się w lobby, ekran odświeży się automatycznie.'}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    Minimalna liczba graczy do startu: {duel.session.minPlayersToStart ?? 2}
                  </Text>
                </Card>
              ) : null}

              {duel.session.status === 'in_progress' && duel.currentQuestion ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {duel.isSpectating ? 'Podgląd pytania' : 'Aktualne pytanie'}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 22 }}>
                    {duel.currentQuestion.prompt}
                  </Text>
                  {duel.isSpectating ? (
                    <>
                      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                        Widz nie wysyła odpowiedzi, ale może śledzić pytanie i tempo meczu.
                      </Text>
                      <View style={{ gap: 8 }}>
                        {duel.currentQuestion.choices.map((choice, index) => (
                          <View
                            key={`spectator-choice-${index}-${String(choice)}`}
                            style={{
                              borderRadius: 18,
                              borderWidth: 1,
                              borderColor: '#e2e8f0',
                              backgroundColor: '#f8fafc',
                              padding: 12,
                            }}
                          >
                            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                              Opcja {index + 1}: {String(choice)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {duel.currentQuestion.choices.map((choice, index) => (
                        <ActionButton
                          key={`duel-choice-${index}-${String(choice)}`}
                          disabled={duel.isMutating}
                          label={`Odpowiedź: ${String(choice)}`}
                          onPress={async () => {
                            await duel.submitAnswer(choice as KangurDuelChoice);
                          }}
                          stretch
                          tone='secondary'
                        />
                      ))}
                    </View>
                  )}
                </Card>
              ) : null}

              {duel.session.status === 'completed' || duel.session.status === 'aborted' ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    Podsumowanie
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {resolveWinnerSummary(duel.session.players)}
                  </Text>
                </Card>
              ) : null}

              <Card>
                <View style={{ gap: 8 }}>
                  <ActionButton
                    disabled={duel.isMutating}
                    label={
                      duel.isSpectating
                        ? 'Odśwież podgląd pojedynku'
                        : 'Odśwież stan pojedynku'
                    }
                    onPress={duel.refresh}
                    stretch
                    tone='secondary'
                  />
                  {duel.isSpectating ? (
                    <ActionButton
                      label='Wróć do lobby'
                      onPress={openLobby}
                      stretch
                    />
                  ) : (
                    <ActionButton
                      disabled={duel.isMutating}
                      label='Opuść pojedynek'
                      onPress={async () => {
                        const didLeave = await duel.leaveSession();
                        if (didLeave) {
                          openLobby();
                        }
                      }}
                      stretch
                    />
                  )}
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View style={{ gap: 14 }}>
          <LinkButton href={HOME_ROUTE} label='Wróć' tone='secondary' />
          <SectionTitle
            title='Pojedynki'
            subtitle='Mobilne lobby pojedynków korzysta z tych samych kontraktów i endpointów Kangur duels co wersja webowa.'
          />
        </View>

        {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
          <Card>
            <MessageCard
              title='Zaloguj sesję ucznia'
              description='Goście mogą przeglądać publiczne lobby i ranking. Do tworzenia lub dołączania do pojedynków potrzebna jest aktywna sesja ucznia.'
            />
            {createLoginCallToAction('Przejdź do logowania')}
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            Panel gry
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            Wybierz działanie, tryb działań i poziom trudności dla nowego pojedynku.
          </Text>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>Działanie</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {OPERATION_OPTIONS.map((option) => (
                <FilterChip
                  key={option}
                  label={formatOperationLabel(option)}
                  onPress={() => {
                    lobby.setOperation(option);
                  }}
                  selected={lobby.operation === option}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>Poziom</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <FilterChip
                  key={option}
                  label={formatDifficultyLabel(option)}
                  onPress={() => {
                    lobby.setDifficulty(option);
                  }}
                  selected={lobby.difficulty === option}
                />
              ))}
            </View>
          </View>

          {lobby.actionError ? (
            <MessageCard
              title='Akcja nie powiodła się'
              description={lobby.actionError}
              tone='error'
            />
          ) : null}

          {lobby.isAuthenticated ? (
            <View style={{ gap: 8 }}>
              <ActionButton
                disabled={lobby.isActionPending}
                label='Szybki mecz'
                onPress={async () => {
                  const nextSessionId = await lobby.createQuickMatch();
                  if (nextSessionId) {
                    openSession(nextSessionId);
                  }
                }}
                stretch
              />
              <ActionButton
                disabled={lobby.isActionPending}
                label='Publiczne wyzwanie'
                onPress={async () => {
                  const nextSessionId = await lobby.createPublicChallenge();
                  if (nextSessionId) {
                    openSession(nextSessionId);
                  }
                }}
                stretch
                tone='secondary'
              />
            </View>
          ) : (
            createLoginCallToAction('Zaloguj, aby rozpocząć pojedynek')
          )}
        </Card>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                Lobby
              </Text>
              <Text style={{ color: '#64748b', fontSize: 13 }}>
                Widoczne publiczne pokoje: {lobby.visiblePublicEntries.length}
              </Text>
            </View>
            <ActionButton
              disabled={lobby.isActionPending}
              label='Odśwież'
              onPress={lobby.refresh}
              tone='secondary'
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MODE_FILTER_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                onPress={() => {
                  lobby.setModeFilter(option.value);
                }}
                selected={lobby.modeFilter === option.value}
              />
            ))}
          </View>

          {lobby.lobbyError ? (
            <MessageCard
              title='Lobby jest niedostępne'
              description={lobby.lobbyError}
              tone='error'
            />
          ) : lobby.isLobbyLoading ? (
            <MessageCard
              title='Ładujemy lobby'
              description={
                lobby.isRestoringAuth
                  ? 'Przywracamy sesję ucznia i pobieramy dostępne pojedynki.'
                  : 'Pobieramy dostępne publiczne i prywatne pokoje.'
              }
            />
          ) : (
            <>
              {lobby.inviteEntries.length > 0 ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    Zaproszenia
                  </Text>
                  {lobby.inviteEntries.map((entry) => (
                    <LobbyEntryCard
                      key={entry.sessionId}
                      action={renderJoinAction(entry.sessionId)}
                      actionLabel='Prywatne zaproszenie dla zalogowanego ucznia.'
                      description={`Gospodarz ${entry.host.displayName} zaprasza do prywatnego pojedynku ${formatOperationLabel(entry.operation)}.`}
                      entry={entry}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  Publiczne pokoje
                </Text>
                {lobby.visiblePublicEntries.length === 0 ? (
                  <MessageCard
                    title='Brak publicznych pojedynków'
                    description='Zmiana filtra albo szybki mecz utworzy nowy pokój gotowy do dołączenia.'
                  />
                ) : (
                  lobby.visiblePublicEntries.map((entry) => (
                    <LobbyEntryCard
                      key={entry.sessionId}
                      action={
                        <View style={{ gap: 8 }}>
                          {renderJoinAction(entry.sessionId)}
                          {renderSpectateAction(entry.sessionId)}
                        </View>
                      }
                      actionLabel='Możesz dołączyć jako gracz albo otworzyć pokój w trybie obserwatora.'
                      description={`${formatModeLabel(entry.mode)} gospodarza ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status).toLowerCase()}.`}
                      entry={entry}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </Card>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                Czat lobby
              </Text>
              <Text style={{ color: '#64748b', fontSize: 13 }}>
                Szybka koordynacja przed pojedynkiem i w czasie oczekiwania na przeciwnika.
              </Text>
            </View>
            {chat.isAuthenticated ? (
              <ActionButton
                disabled={chat.isLoading || chat.isSending}
                label='Odśwież'
                onPress={chat.refresh}
                tone='secondary'
              />
            ) : null}
          </View>

          {!chat.isAuthenticated ? (
            <MessageCard
              title='Czat lobby wymaga logowania'
              description='Zalogowany uczeń może czytać i wysyłać krótkie wiadomości do innych osób w lobby.'
            />
          ) : chat.error ? (
            <MessageCard
              title='Nie udało się pobrać czatu lobby'
              description={chat.error}
              tone='error'
            />
          ) : chat.isLoading ? (
            <MessageCard
              title='Ładujemy czat lobby'
              description={
                chat.isRestoringAuth
                  ? 'Przywracamy sesję ucznia i pobieramy ostatnie wiadomości.'
                  : 'Pobieramy bieżące wiadomości z lobby.'
              }
            />
          ) : (
            <>
              {lobbyChatPreview.length === 0 ? (
                <MessageCard
                  title='Brak wiadomości'
                  description='To dobre miejsce na ustalenie szybkiego meczu albo prywatnego rewanżu.'
                />
              ) : (
                <View style={{ gap: 10 }}>
                  {lobbyChatPreview.map((message) => (
                    <View
                      key={message.id}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          message.senderId === activeLearnerId ? '#bfdbfe' : '#e2e8f0',
                        backgroundColor:
                          message.senderId === activeLearnerId ? '#eff6ff' : '#f8fafc',
                        gap: 6,
                        padding: 14,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                        {formatLobbyChatSenderLabel(message, activeLearnerId)}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {message.message}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>
                        {formatRelativeAge(message.createdAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ gap: 8 }}>
                <TextInput
                  accessibilityLabel='Wiadomość do czatu lobby'
                  editable={!chat.isSending}
                  maxLength={chat.maxMessageLength}
                  multiline
                  onChangeText={(nextValue) => {
                    setChatDraft(nextValue);
                    if (chatActionError) {
                      setChatActionError(null);
                    }
                  }}
                  placeholder='Napisz do lobby'
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
                <Text style={{ color: '#64748b', fontSize: 12 }}>
                  Pozostało {chatRemainingChars} znaków.
                </Text>
                {chatActionError ? (
                  <MessageCard
                    title='Nie udało się wysłać wiadomości'
                    description={chatActionError}
                    tone='error'
                  />
                ) : null}
                <ActionButton
                  disabled={!canSendChatMessage}
                  label={chat.isSending ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                  onPress={handleLobbyChatSend}
                  stretch
                />
              </View>
            </>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            Aktywni uczniowie
          </Text>
          {!lobby.isAuthenticated ? (
            <MessageCard
              title='Lista aktywnych uczniów wymaga logowania'
              description='Po zalogowaniu mobilna aplikacja zacznie też pingować obecność w lobby.'
            />
          ) : lobby.presenceError ? (
            <MessageCard
              title='Nie udało się pobrać obecności'
              description={lobby.presenceError}
              tone='error'
            />
          ) : lobby.isPresenceLoading ? (
            <MessageCard
              title='Aktualizujemy obecność'
              description='Synchronizujemy listę uczniów widocznych w lobby.'
            />
          ) : lobby.presenceEntries.length === 0 ? (
            <MessageCard
              title='Brak obecnych uczniów'
              description='Gdy inni uczniowie otworzą lobby, pojawią się tutaj.'
            />
          ) : (
            <View style={{ gap: 10 }}>
              {lobby.presenceEntries.map((entry) => (
                <View
                  key={entry.learnerId}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {entry.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    Ostatnia aktywność {formatRelativeAge(entry.lastSeenAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            Szukaj uczniów
          </Text>
          {!lobby.isAuthenticated ? (
            <MessageCard
              title='Wyszukiwanie wymaga logowania'
              description='Po zalogowaniu możesz wysłać prywatne wyzwanie po loginie ucznia.'
            />
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  Wpisz co najmniej 2 znaki loginu lub nazwy ucznia.
                </Text>
                <TextInput
                  accessibilityLabel='Wyszukiwarka uczniów'
                  onChangeText={lobby.setSearchQuery}
                  placeholder='Szukaj ucznia'
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: 16,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                  value={lobby.searchQuery}
                />
                <View style={{ gap: 8 }}>
                  <ActionButton
                    disabled={lobby.searchQuery.trim().length < 2}
                    label='Szukaj'
                    onPress={lobby.submitSearch}
                    stretch
                  />
                  {lobby.searchSubmittedQuery ? (
                    <ActionButton
                      label='Wyczyść wyszukiwanie'
                      onPress={lobby.clearSearch}
                      stretch
                      tone='secondary'
                    />
                  ) : null}
                </View>
              </View>

              {lobby.searchError ? (
                <MessageCard
                  title='Wyszukiwanie nie powiodło się'
                  description={lobby.searchError}
                  tone='error'
                />
              ) : lobby.isSearchLoading ? (
                <MessageCard
                  title='Szukamy uczniów'
                  description='Dopasowujemy wyniki dla wpisanego zapytania.'
                />
              ) : lobby.searchSubmittedQuery.length >= 2 &&
                lobby.searchResults.length === 0 ? (
                <MessageCard
                  title='Brak wyników'
                  description='Nie znaleźliśmy uczniów pasujących do wpisanego zapytania.'
                />
              ) : lobby.searchResults.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {lobby.searchResults.map((entry) => (
                    <View
                      key={entry.learnerId}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#f8fafc',
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                        {entry.displayName}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>
                        Login: {entry.loginName}
                      </Text>
                      <ActionButton
                        disabled={lobby.isActionPending}
                        label='Wyślij prywatne wyzwanie'
                        onPress={async () => {
                          const nextSessionId = await lobby.createPrivateChallenge(
                            entry.learnerId,
                          );
                          if (nextSessionId) {
                            openSession(nextSessionId);
                          }
                        }}
                        stretch
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            Ostatni przeciwnicy
          </Text>
          {!lobby.isAuthenticated ? (
            <MessageCard
              title='Historia przeciwników wymaga logowania'
              description='Po zalogowaniu pojawi się tutaj skrót do ponownego wyzwania ostatnich rywali.'
            />
          ) : lobby.isOpponentsLoading ? (
            <MessageCard
              title='Ładujemy listę przeciwników'
              description='Pobieramy ostatnie kontakty z historii pojedynków.'
            />
          ) : lobby.opponents.length === 0 ? (
            <MessageCard
              title='Brak zapisanych przeciwników'
              description='Backend nie zwrócił jeszcze historii przeciwników dla tego ucznia.'
            />
          ) : (
            <View style={{ gap: 10 }}>
              {lobby.opponents.map((entry) => (
                <View
                  key={entry.learnerId}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {entry.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    Ostatnia gra {formatRelativeAge(entry.lastPlayedAt)}
                  </Text>
                  <ActionButton
                    disabled={lobby.isActionPending}
                    label='Wyzwij ponownie'
                    onPress={async () => {
                      const nextSessionId = await lobby.createPrivateChallenge(
                        entry.learnerId,
                      );
                      if (nextSessionId) {
                        openSession(nextSessionId);
                      }
                    }}
                    stretch
                  />
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            Wyniki dueli
          </Text>
          {lobby.leaderboardError ? (
            <MessageCard
              title='Ranking dueli jest niedostępny'
              description={lobby.leaderboardError}
              tone='error'
            />
          ) : lobby.leaderboardEntries.length === 0 ? (
            <MessageCard
              title='Brak rozegranych dueli'
              description='Ranking zapełni się po pierwszych zakończonych pojedynkach.'
            />
          ) : (
            <View style={{ gap: 10 }}>
              {lobby.leaderboardEntries.map((entry, index) => (
                <View
                  key={`${entry.learnerId}-${index}`}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    #{index + 1} {entry.displayName}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    Wygrane {entry.wins} · Porażki {entry.losses} · Remisy {entry.ties}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    Mecze {entry.matches} · Win rate {Math.round(entry.winRate * 100)}% · ostatnia gra{' '}
                    {formatRelativeAge(entry.lastPlayedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
