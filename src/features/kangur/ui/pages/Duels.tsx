'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import QuestionCard, {
  type QuestionCardServerResult,
} from '@/features/kangur/ui/components/QuestionCard';
import { DuelsLobbyChatPanel } from '@/features/kangur/ui/components/DuelsLobbyChatPanel';
import { DuelsLobbyPanels } from '@/features/kangur/ui/components/DuelsLobbyPanels';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import {
  trackKangurClientEvent,
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPageContainer,
  KangurPageShell,
  KangurSelectField,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import type { KangurQuestionChoice } from '@/features/kangur/ui/types';
import {
  KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
  KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
  KANGUR_DUELS_DEFAULT_SEARCH_LIMIT,
  KANGUR_DUELS_SEARCH_MIN_CHARS,
} from '@/features/kangur/shared/duels-config';
import type {
  KangurDuelDifficulty,
  KangurDuelMode,
  KangurDuelLobbyEntry,
  KangurDuelLobbyPresenceEntry,
  KangurDuelLeaderboardEntry,
  KangurDuelOperation,
  KangurDuelOpponentEntry,
  KangurDuelReactionType,
  KangurDuelSearchEntry,
  KangurDuelSpectatorStateResponse,
  KangurDuelStateResponse,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { KANGUR_DUELS_SETTINGS_KEY } from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import {
  KANGUR_DUELS_LOBBY_STREAM_ENDPOINT,
  KANGUR_DUELS_LOBBY_WS_ENDPOINT,
} from '@/features/kangur/services/local-kangur-platform-endpoints';
import {
  DUEL_DIFFICULTY_EMOJIS,
  DUEL_DIFFICULTY_LABELS,
  DUEL_OPERATION_LABELS,
  DUEL_OPERATION_SYMBOLS,
  LOBBY_MODE_LABELS,
  PLAYER_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  buildWinnerSummary,
  formatElapsedTime,
  formatDurationLabel,
  formatDuelDifficultyLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
  resolveLobbyHostInitial,
  resolvePlayerAccent,
  resolveSessionAccent,
  toQuestionCardQuestion,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

const kangurPlatform = getKangurPlatform();
const DUEL_POLL_INTERVAL_MS = 2500;
const DUEL_POLL_MAX_INTERVAL_MS = 20_000;
const DUEL_HEARTBEAT_INTERVAL_MS = 20_000;
const LOBBY_POLL_INTERVAL_MS = 5000;
const LOBBY_POLL_MAX_INTERVAL_MS = 30_000;
const LOBBY_POLL_SAFETY_INTERVAL_MS = 30_000;
const LOBBY_FRESH_WINDOW_MS = 15_000;
const LOBBY_RELATIVE_TIME_TICK_MS = 10_000;
const LOBBY_PRESENCE_POLL_INTERVAL_MS = 20_000;
const DUEL_SPECTATOR_POLL_INTERVAL_MS = 4000;
const DUEL_LEADERBOARD_LIMIT = 8;
const DUEL_TIMEOUT_CHOICE = '__timeout__';
const DUEL_SEARCH_DEBOUNCE_MS = 300;
const LOBBY_STREAM_DEBOUNCE_MS = 600;
const ENABLE_DUELS_LOBBY_SSE = process.env['NEXT_PUBLIC_KANGUR_DUELS_LOBBY_SSE'] !== 'false';
const ENABLE_DUELS_LOBBY_WS = process.env['NEXT_PUBLIC_KANGUR_DUELS_LOBBY_WS'] !== 'false';
const MOTION_PANEL_CLASSNAME =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';
const MOTION_ENTRY_CLASSNAME =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';
const DUEL_QUESTION_COUNT_OPTIONS = [3, 5, 8, 10, 12, 15, 20] as const;
const DUEL_TIME_PER_QUESTION_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
const DUEL_BEST_OF_OPTIONS = [1, 3, 5, 7] as const;
const DUEL_OPERATION_OPTIONS: Array<{
  value: KangurDuelOperation;
  label: string;
  symbol: string;
}> = [
  { value: 'addition', label: DUEL_OPERATION_LABELS.addition, symbol: DUEL_OPERATION_SYMBOLS.addition },
  { value: 'subtraction', label: DUEL_OPERATION_LABELS.subtraction, symbol: DUEL_OPERATION_SYMBOLS.subtraction },
  { value: 'multiplication', label: DUEL_OPERATION_LABELS.multiplication, symbol: DUEL_OPERATION_SYMBOLS.multiplication },
  { value: 'division', label: DUEL_OPERATION_LABELS.division, symbol: DUEL_OPERATION_SYMBOLS.division },
];
const DUEL_DIFFICULTY_OPTIONS: Array<{
  value: KangurDuelDifficulty;
  label: string;
  emoji: string;
}> = [
  { value: 'easy', label: DUEL_DIFFICULTY_LABELS.easy, emoji: DUEL_DIFFICULTY_EMOJIS.easy },
  { value: 'medium', label: DUEL_DIFFICULTY_LABELS.medium, emoji: DUEL_DIFFICULTY_EMOJIS.medium },
  { value: 'hard', label: DUEL_DIFFICULTY_LABELS.hard, emoji: DUEL_DIFFICULTY_EMOJIS.hard },
];
const DUEL_OPERATION_VALUES = new Set<KangurDuelOperation>(
  DUEL_OPERATION_OPTIONS.map((option) => option.value)
);
const DUEL_DIFFICULTY_VALUES = new Set<KangurDuelDifficulty>(
  DUEL_DIFFICULTY_OPTIONS.map((option) => option.value)
);
const DUEL_REACTION_OPTIONS: Array<{
  type: KangurDuelReactionType;
  label: string;
  ariaLabel: string;
}> = [
  { type: 'cheer', label: '👏', ariaLabel: 'Brawa' },
  { type: 'wow', label: '😮', ariaLabel: 'Wow' },
  { type: 'gg', label: '🤝', ariaLabel: 'Dobra gra' },
  { type: 'fire', label: '🔥', ariaLabel: 'Ogień' },
  { type: 'clap', label: '🙌', ariaLabel: 'Super' },
  { type: 'rocket', label: '🚀', ariaLabel: 'Rakieta' },
  { type: 'thumbs_up', label: '👍', ariaLabel: 'Kciuk w górę' },
] as const;


function DuelsContent(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, isAuthenticated, logout } = useKangurAuth();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const [duelState, setDuelState] = useState<KangurDuelStateResponse | null>(null);
  const [action, setAction] = useState<
    | 'quick_match'
    | 'challenge'
    | 'private'
    | 'join'
    | 'leave'
    | 'answer'
    | 'rematch'
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const lastAnswerMetaRef = useRef<{ questionId: string; timedOut: boolean } | null>(null);
  const [answerResult, setAnswerResult] = useState<
    (QuestionCardServerResult & { questionId: string }) | null
  >(null);
  const [lobbyEntries, setLobbyEntries] = useState<KangurDuelLobbyEntry[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [isLobbyLoading, setIsLobbyLoading] = useState(false);
  const [lobbyPresenceEntries, setLobbyPresenceEntries] = useState<KangurDuelLobbyPresenceEntry[]>([]);
  const [lobbyPresenceError, setLobbyPresenceError] = useState<string | null>(null);
  const [isLobbyPresenceLoading, setIsLobbyPresenceLoading] = useState(false);
  const [lobbyPresenceLastUpdatedAt, setLobbyPresenceLastUpdatedAt] = useState<string | null>(null);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [lobbyFailureCount, setLobbyFailureCount] = useState(0);
  const [recentOpponents, setRecentOpponents] = useState<KangurDuelOpponentEntry[]>([]);
  const [opponentsError, setOpponentsError] = useState<string | null>(null);
  const [isOpponentsLoading, setIsOpponentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KangurDuelSearchEntry[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<KangurDuelLeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [spectatorState, setSpectatorState] = useState<KangurDuelSpectatorStateResponse | null>(
    null
  );
  const [spectatorError, setSpectatorError] = useState<string | null>(null);
  const [isSpectatorLoading, setIsSpectatorLoading] = useState(false);
  const [spectateSessionId, setSpectateSessionId] = useState<string | null>(null);
  const [autoJoinSessionId, setAutoJoinSessionId] = useState<string | null>(null);
  const [isReactionSending, setIsReactionSending] = useState(false);
  const [isPageActive, setIsPageActive] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine)
  );
  const [duelRelativeNow, setDuelRelativeNow] = useState(() => Date.now());
  const [lobbyModeFilter, setLobbyModeFilter] = useState<'all' | KangurDuelMode>('all');
  const [lobbyOperationFilter, setLobbyOperationFilter] = useState<
    'all' | KangurDuelOperation
  >('all');
  const [lobbyDifficultyFilter, setLobbyDifficultyFilter] = useState<
    'all' | KangurDuelDifficulty
  >('all');
  const [lobbySort, setLobbySort] = useState<
    'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high'
  >('recent');
  const [lobbyStreamStatus, setLobbyStreamStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'fallback'
  >('idle');
  const [lobbyRealtimeSource, setLobbyRealtimeSource] = useState<'ws' | 'sse' | null>(null);
  const [lobbyLastUpdatedAt, setLobbyLastUpdatedAt] = useState<string | null>(null);
  const [relativeNow, setRelativeNow] = useState(() => Date.now());
  const [duelOperation, setDuelOperation] = useState<KangurDuelOperation>('addition');
  const [duelDifficulty, setDuelDifficulty] = useState<KangurDuelDifficulty>('easy');
  const [duelSettingsHydrated, setDuelSettingsHydrated] = useState(false);
  const [challengeQuestionCount, setChallengeQuestionCount] = useState(8);
  const [challengeTimePerQuestionSec, setChallengeTimePerQuestionSec] = useState(20);
  const [challengeBestOf, setChallengeBestOf] = useState(1);
  const [inviteCopyStatus, setInviteCopyStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [spectateCopyStatus, setSpectateCopyStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const duelPollingRef = useRef(false);
  const lobbyPollingRef = useRef(false);
  const duelAbortRef = useRef<AbortController | null>(null);
  const lobbyAbortRef = useRef<AbortController | null>(null);
  const duelHeartbeatRef = useRef(false);
  const duelHeartbeatAbortRef = useRef<AbortController | null>(null);
  const opponentsAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const leaderboardAbortRef = useRef<AbortController | null>(null);
  const spectatorAbortRef = useRef<AbortController | null>(null);
  const spectatorPollingRef = useRef(false);
  const spectatorIdRef = useRef<string | null>(null);
  const autoJoinAttemptedRef = useRef(false);
  const lastSessionUpdatedAtRef = useRef<string | null>(null);
  const lastLobbyHashRef = useRef('');
  const lastLobbyPresenceHashRef = useRef('');
  const lobbyPresenceAbortRef = useRef<AbortController | null>(null);
  const lobbyPresencePollingRef = useRef(false);
  const lobbySeenRef = useRef<Map<string, string>>(new Map());
  const lobbyFreshRef = useRef<Map<string, number>>(new Map());
  const lobbyViewTrackedRef = useRef(false);
  const lobbyPollPrimedRef = useRef(false);
  const lobbyRefreshQueuedRef = useRef(false);
  const lobbyRealtimeSourceRef = useRef<'ws' | 'sse' | null>(null);
  const lobbyStreamRef = useRef<EventSource | null>(null);
  const lobbyStreamRetryRef = useRef<number | null>(null);
  const lobbyStreamRefreshRef = useRef<number | null>(null);
  const lobbyStreamLastEventRef = useRef(0);
  const lobbyWsRef = useRef<WebSocket | null>(null);
  const lobbyWsRetryRef = useRef<number | null>(null);
  const lobbyWsRefreshRef = useRef<number | null>(null);
  const lobbyWsLastEventRef = useRef(0);
  const [duelFailureCount, setDuelFailureCount] = useState(0);

  useKangurRoutePageReady({
    pageKey: 'Duels',
    ready: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join')?.trim() ?? '';
    const spectateParam = params.get('spectate')?.trim() ?? '';
    if (joinParam) {
      setAutoJoinSessionId(joinParam);
    }
    if (spectateParam) {
      setSpectateSessionId(spectateParam);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    withKangurClientErrorSync(
      {
        source: 'kangur-duels',
        action: 'load-settings',
        description: 'Load duel settings from local storage.',
        context: {
          storageKey: KANGUR_DUELS_SETTINGS_KEY,
        },
      },
      () => {
        const stored = window.localStorage.getItem(KANGUR_DUELS_SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { operation?: unknown; difficulty?: unknown };
          const storedOperation =
            typeof parsed?.operation === 'string' &&
            DUEL_OPERATION_VALUES.has(parsed.operation as KangurDuelOperation)
              ? (parsed.operation as KangurDuelOperation)
              : null;
          const storedDifficulty =
            typeof parsed?.difficulty === 'string' &&
            DUEL_DIFFICULTY_VALUES.has(parsed.difficulty as KangurDuelDifficulty)
              ? (parsed.difficulty as KangurDuelDifficulty)
              : null;
          if (storedOperation) {
            setDuelOperation(storedOperation);
          }
          if (storedDifficulty) {
            setDuelDifficulty(storedDifficulty);
          }
        }
      },
      { fallback: undefined }
    );
    setDuelSettingsHydrated(true);
  }, []);

  useEffect(() => {
    if (!duelSettingsHydrated || typeof window === 'undefined') {
      return;
    }
    withKangurClientErrorSync(
      {
        source: 'kangur-duels',
        action: 'persist-settings',
        description: 'Persist duel settings to local storage.',
        context: {
          storageKey: KANGUR_DUELS_SETTINGS_KEY,
        },
      },
      () => {
        window.localStorage.setItem(
          KANGUR_DUELS_SETTINGS_KEY,
          JSON.stringify({ operation: duelOperation, difficulty: duelDifficulty })
        );
      },
      { fallback: undefined }
    );
  }, [duelDifficulty, duelOperation, duelSettingsHydrated]);

  const errorMessageId = useId();
  const inviteNoticeId = useId();
  const playPanelHeadingId = useId();
  const playPanelDescriptionId = useId();
  const opponentsHeadingId = useId();
  const searchHeadingId = useId();
  const searchHintId = useId();
  const searchErrorId = useId();
  const recentOpponentsListId = useId();
  const searchResultsListId = useId();
  const inviteListId = useId();
  const lobbyListId = useId();
  const inviteHeadingId = useId();
  const lobbyHeadingId = useId();
  const lobbyDescriptionId = useId();
  const lobbyPresenceHeadingId = useId();
  const lobbyPresenceListId = useId();
  const challengeSettingsHeadingId = useId();
  const challengeSettingsHintId = useId();
  const challengeOperationLabelId = useId();
  const challengeDifficultyLabelId = useId();
  const challengeQuestionsSelectId = useId();
  const challengeTimeSelectId = useId();
  const challengeBestOfSelectId = useId();
  const leaderboardHeadingId = useId();
  const leaderboardListId = useId();
  const waitingHeadingId = useId();
  const duelHeadingId = useId();
  const duelSummaryId = useId();
  const duelScoreboardId = useId();

  const resolveActionErrorMessage = useCallback(
    (nextAction: typeof action, err: unknown): string => {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : null;

      if (nextAction === 'join') {
        switch (status) {
          case 400:
            return 'To wyzwanie nie jest już dostępne.';
          case 403:
            return 'Nie masz dostępu do tego prywatnego pojedynku.';
          case 404:
            return 'To wyzwanie już nie istnieje.';
          case 409:
            return 'To wyzwanie ma już komplet graczy.';
          default:
            break;
        }
      }

      if (nextAction === 'answer') {
        if (status === 400 || status === 409) {
          return 'Pojedynek został zakończony. Odśwież widok.';
        }
      }

      if (
        status === 400 &&
        (nextAction === 'quick_match' ||
          nextAction === 'challenge' ||
          nextAction === 'private' ||
          nextAction === 'rematch')
      ) {
        return 'Nieprawidłowe ustawienia pojedynku. Zmień działanie lub poziom i spróbuj ponownie.';
      }

      return 'Nie udało się połączyć z pojedynkiem. Spróbuj ponownie.';
    },
    []
  );

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Duels' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated,
      onCreateAccount: () => openLoginModal(null, { authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [
      basePath,
      guestPlayerName,
      isAuthenticated,
      logout,
      openLoginModal,
      setGuestPlayerName,
      user,
    ]
  );

  const duelsPath = useMemo(() => `${basePath.replace(/\/$/, '')}/duels`, [basePath]);
  const buildDuelsLink = useCallback(
    (params: Record<string, string>): string => {
      if (typeof window === 'undefined') {
        return '';
      }
      const url = new URL(duelsPath, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return url.toString();
    },
    [duelsPath]
  );

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (!text) {
      return false;
    }
    return withKangurClientError(
      {
        source: 'kangur-duels',
        action: 'copy-invite-link',
        description: 'Copy duels invite link to the clipboard.',
      },
      async () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        if (typeof document !== 'undefined') {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', 'true');
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return true;
        }
        return false;
      },
      { fallback: false }
    );
  }, []);

  const clearUrlParam = useCallback((param: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleExitSpectate = useCallback(() => {
    setSpectateSessionId(null);
    setSpectatorState(null);
    setSpectatorError(null);
    setIsSpectatorLoading(false);
    clearUrlParam('spectate');
  }, [clearUrlParam]);

  const resolveSpectatorId = useCallback((): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    const key = 'kangur_duels_spectator_id';
    const existing = window.localStorage.getItem(key);
    if (existing) {
      return existing;
    }
    const generated = `spectator_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, generated);
    return generated;
  }, []);

  const session = duelState?.session ?? null;
  const player = duelState?.player ?? null;
  const spectatorSession = spectatorState?.session ?? null;
  const sessionId = session?.id ?? null;
  const sessionStatus = session?.status ?? null;
  const playerQuestionIndex = useMemo(() => {
    if (!session || !player) {
      return null;
    }
    const fromPlayer =
      typeof player.currentQuestionIndex === 'number' && Number.isFinite(player.currentQuestionIndex)
        ? player.currentQuestionIndex
        : null;
    if (fromPlayer !== null) {
      return Math.max(0, fromPlayer);
    }
    return session.currentQuestionIndex ?? null;
  }, [player, session]);
  const activeQuestion =
    session &&
    playerQuestionIndex !== null &&
    playerQuestionIndex >= 0 &&
    playerQuestionIndex < session.questionCount
      ? session.questions[playerQuestionIndex] ?? null
      : null;
  const questionCard = useMemo(() => toQuestionCardQuestion(activeQuestion), [activeQuestion]);
  const isGuest = !isAuthenticated;
  const isSpectatorMode = Boolean(spectateSessionId && !session);
  const canPlay = Boolean(isAuthenticated && user?.activeLearner?.id);
  const canPlayTools = canPlay && !session && !isSpectatorMode;
  const canBrowseLobby = !session && !isSpectatorMode && (canPlay || !isAuthenticated);
  const isBusy = action !== null;
  const canLeaveSession = sessionStatus === 'ready' || sessionStatus === 'in_progress';
  const duelPollIntervalMs = useMemo(() => {
    if (duelFailureCount <= 0) {
      return DUEL_POLL_INTERVAL_MS;
    }
    const backoff = DUEL_POLL_INTERVAL_MS * Math.pow(2, Math.min(duelFailureCount, 4));
    return Math.min(backoff, DUEL_POLL_MAX_INTERVAL_MS);
  }, [duelFailureCount]);
  const isDuelReconnecting = useMemo(
    () => duelFailureCount > 0 && isPageActive && isOnline,
    [duelFailureCount, isOnline, isPageActive]
  );
  const SearchField = KangurTextField;
  const waitingSession = sessionStatus === 'waiting' && session ? session : null;
  const activeSession =
    sessionStatus && sessionStatus !== 'waiting' && session ? session : null;
  const opponentsInSession = useMemo(() => {
    if (!activeSession?.players?.length || !player?.learnerId) {
      return [];
    }
    return activeSession.players.filter((entry) => entry.learnerId !== player.learnerId);
  }, [activeSession?.players, player?.learnerId]);
  const canRematch =
    Boolean(
      activeSession &&
        opponentsInSession.length === 1 &&
        canPlay &&
        (activeSession.status === 'completed' || activeSession.status === 'aborted')
    );
  const lobbyPollIntervalMs = useMemo(() => {
    if (lobbyFailureCount <= 0) {
      return lobbyStreamStatus === 'connected'
        ? Math.max(LOBBY_POLL_INTERVAL_MS, LOBBY_POLL_SAFETY_INTERVAL_MS)
        : LOBBY_POLL_INTERVAL_MS;
    }
    const backoff = LOBBY_POLL_INTERVAL_MS * Math.pow(2, Math.min(lobbyFailureCount, 4));
    const capped = Math.min(backoff, LOBBY_POLL_MAX_INTERVAL_MS);
    return lobbyStreamStatus === 'connected'
      ? Math.max(capped, LOBBY_POLL_SAFETY_INTERVAL_MS)
      : capped;
  }, [lobbyFailureCount, lobbyStreamStatus]);
  const lobbyRefreshSeconds = Math.max(1, Math.round(lobbyPollIntervalMs / 1000));
  const lobbyLastUpdatedAtMs = useMemo(
    () => (lobbyLastUpdatedAt ? Date.parse(lobbyLastUpdatedAt) : null),
    [lobbyLastUpdatedAt]
  );
  const lobbyStaleThresholdMs = useMemo(() => lobbyPollIntervalMs * 3, [lobbyPollIntervalMs]);
  const isLobbyStale = useMemo(() => {
    if (!lobbyLastUpdatedAtMs || !Number.isFinite(lobbyLastUpdatedAtMs)) {
      return false;
    }
    return relativeNow - lobbyLastUpdatedAtMs > lobbyStaleThresholdMs;
  }, [lobbyLastUpdatedAtMs, lobbyStaleThresholdMs, relativeNow]);
  const publicLobbyEntries = useMemo(
    () => lobbyEntries.filter((entry) => entry.visibility !== 'private'),
    [lobbyEntries]
  );
  const inviteLobbyEntries = useMemo(
    () => lobbyEntries.filter((entry) => entry.visibility === 'private'),
    [lobbyEntries]
  );
  const filteredPublicLobbyEntries = useMemo(() => {
    const withMode =
      lobbyModeFilter === 'all'
        ? publicLobbyEntries
        : publicLobbyEntries.filter((entry) => entry.mode === lobbyModeFilter);
    const withOperation =
      lobbyOperationFilter === 'all'
        ? withMode
        : withMode.filter((entry) => entry.operation === lobbyOperationFilter);
    const withDifficulty =
      lobbyDifficultyFilter === 'all'
        ? withOperation
        : withOperation.filter((entry) => entry.difficulty === lobbyDifficultyFilter);
    const withTimestamps = withDifficulty.map((entry) => ({
      entry,
      updatedAtMs: Date.parse(entry.updatedAt),
      createdAtMs: Date.parse(entry.createdAt),
    }));
    withTimestamps.sort((left, right) => {
      switch (lobbySort) {
        case 'time_fast':
          return left.entry.timePerQuestionSec - right.entry.timePerQuestionSec;
        case 'time_slow':
          return right.entry.timePerQuestionSec - left.entry.timePerQuestionSec;
        case 'questions_low':
          return left.entry.questionCount - right.entry.questionCount;
        case 'questions_high':
          return right.entry.questionCount - left.entry.questionCount;
        case 'recent':
        default:
          return (
            (Number.isFinite(right.updatedAtMs) ? right.updatedAtMs : 0) -
              (Number.isFinite(left.updatedAtMs) ? left.updatedAtMs : 0) ||
            (Number.isFinite(right.createdAtMs) ? right.createdAtMs : 0) -
              (Number.isFinite(left.createdAtMs) ? left.createdAtMs : 0)
          );
      }
    });
    return withTimestamps.map(({ entry }) => entry);
  }, [lobbyDifficultyFilter, lobbyModeFilter, lobbyOperationFilter, lobbySort, publicLobbyEntries]);
  const trimmedSearchQuery = searchQuery.trim();
  const canShowSearchResults = trimmedSearchQuery.length >= KANGUR_DUELS_SEARCH_MIN_CHARS;
  const searchStateSignature = useMemo(
    () =>
      [
        searchHeadingId,
        searchResults.length,
        isSearching ? '1' : '0',
        searchError ? '1' : '0',
        canShowSearchResults ? '1' : '0',
      ].join(':'),
    [canShowSearchResults, isSearching, searchError, searchHeadingId, searchResults.length]
  );
  const isLobbyFilterActive =
    lobbyModeFilter !== 'all' ||
    lobbyOperationFilter !== 'all' ||
    lobbyDifficultyFilter !== 'all';
  const lobbyCountLabel =
    publicLobbyEntries.length > 0
      ? isLobbyFilterActive
        ? `${filteredPublicLobbyEntries.length} z ${publicLobbyEntries.length} oczekujących`
        : `${publicLobbyEntries.length} oczekujących`
      : isLobbyLoading
        ? 'Ładowanie lobby'
        : 'Brak wyzwań';
  const lobbyPresenceCountLabel =
    lobbyPresenceEntries.length > 0
      ? lobbyPresenceEntries.length === 1
        ? '1 uczeń'
        : `${lobbyPresenceEntries.length} uczniów`
      : isLobbyPresenceLoading
        ? 'Ładowanie uczniów'
        : 'Brak uczniów';
  const hasAnyPublicLobbyEntries = publicLobbyEntries.length > 0;
  const hasVisiblePublicLobbyEntries = filteredPublicLobbyEntries.length > 0;
  const searchDescribedBy = searchError ? `${searchHintId} ${searchErrorId}` : searchHintId;
  const duelEstimatedDurationSec = session
    ? session.questionCount * session.timePerQuestionSec
    : null;
  const duelStartedAtMs = useMemo(() => {
    if (!session?.startedAt) {
      return null;
    }
    const parsed = Date.parse(session.startedAt);
    return Number.isFinite(parsed) ? parsed : null;
  }, [session?.startedAt]);
  const duelElapsedSec = useMemo(() => {
    if (!duelStartedAtMs) {
      return null;
    }
    const diffMs = Math.max(0, duelRelativeNow - duelStartedAtMs);
    return Math.floor(diffMs / 1000);
  }, [duelRelativeNow, duelStartedAtMs]);
  const duelRemainingSec = useMemo(() => {
    if (!Number.isFinite(duelEstimatedDurationSec ?? NaN) || duelElapsedSec === null) {
      return null;
    }
    return Math.max(0, Math.round((duelEstimatedDurationSec ?? 0) - duelElapsedSec));
  }, [duelEstimatedDurationSec, duelElapsedSec]);
  const duelProgressPct = useMemo(() => {
    if (!activeSession?.questionCount || playerQuestionIndex === null) {
      return null;
    }
    const answeredCount = Math.min(
      activeSession.questionCount,
      Math.max(0, playerQuestionIndex)
    );
    const progress = (answeredCount / activeSession.questionCount) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }, [activeSession?.questionCount, playerQuestionIndex]);
  const playerQuestionNumber = useMemo(() => {
    if (!activeSession || playerQuestionIndex === null) {
      return null;
    }
    if (playerQuestionIndex >= activeSession.questionCount) {
      return null;
    }
    return playerQuestionIndex + 1;
  }, [activeSession, playerQuestionIndex]);
  const hasFinishedQuestions = useMemo(
    () =>
      Boolean(
        activeSession &&
          playerQuestionIndex !== null &&
          playerQuestionIndex >= activeSession.questionCount
      ),
    [activeSession, playerQuestionIndex]
  );
  const duelTopScore = useMemo(() => {
    if (!activeSession?.players?.length) {
      return null;
    }
    const topScore = Math.max(
      ...activeSession.players.map((entry) => entry.score + (entry.bonusPoints ?? 0))
    );
    return Number.isFinite(topScore) ? topScore : null;
  }, [activeSession?.players]);
  const spectateLink = useMemo(() => {
    if (activeSession?.visibility !== 'public') {
      return '';
    }
    return buildDuelsLink({ spectate: activeSession.id });
  }, [activeSession, buildDuelsLink]);
  const inviteLink = useMemo(() => {
    if (!waitingSession) {
      return '';
    }
    return buildDuelsLink({ join: waitingSession.id });
  }, [buildDuelsLink, waitingSession]);
  const spectatorQuestion = useMemo(() => {
    if (!spectatorSession) {
      return null;
    }
    const question = spectatorSession.questions[spectatorSession.currentQuestionIndex] ?? null;
    return toQuestionCardQuestion(question);
  }, [spectatorSession]);
  const spectatorTopScore = useMemo(() => {
    if (!spectatorSession?.players?.length) {
      return null;
    }
    const topScore = Math.max(
      ...spectatorSession.players.map((entry) => entry.score + (entry.bonusPoints ?? 0))
    );
    return Number.isFinite(topScore) ? topScore : null;
  }, [spectatorSession?.players]);

  useEffect(() => {
    setAnswerResult(null);
    lastAnswerMetaRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!canBrowseLobby || lobbyViewTrackedRef.current) {
      return;
    }
    if (!lobbyLastUpdatedAt) {
      return;
    }
    lobbyViewTrackedRef.current = true;
    trackKangurClientEvent('kangur_duels_lobby_viewed', {
      isGuest: !isAuthenticated,
      entryCount: lobbyEntries.length,
      publicCount: publicLobbyEntries.length,
      inviteCount: inviteLobbyEntries.length,
    });
  }, [
    canBrowseLobby,
    lobbyLastUpdatedAt,
    lobbyEntries.length,
    publicLobbyEntries.length,
    inviteLobbyEntries.length,
    isAuthenticated,
  ]);
  const activeServerResult = useMemo<QuestionCardServerResult | null>(() => {
    if (!activeQuestion || !answerResult) return null;
    if (answerResult.questionId !== activeQuestion.id) return null;
    return { correct: answerResult.correct, timedOut: answerResult.timedOut };
  }, [activeQuestion, answerResult]);

  const runAction = useCallback(
    async (
      nextAction: typeof action,
      task: () => Promise<KangurDuelStateResponse>
    ): Promise<{ response: KangurDuelStateResponse | null; errorStatus: number | null }> => {
      const startedAt = Date.now();
      setAction(nextAction);
      setError(null);
      trackKangurClientEvent('kangur_duels_action_started', {
        action: nextAction,
        isGuest,
      });
      if (!isOnline) {
        setError('Brak połączenia z internetem.');
        setAction(null);
        trackKangurClientEvent('kangur_duels_action_failed', {
          action: nextAction,
          reason: 'offline',
          durationMs: Date.now() - startedAt,
          isGuest,
        });
        return { response: null, errorStatus: null };
      }
      let resolvedStatus: number | null = null;
      const result = await withKangurClientError<{
        response: KangurDuelStateResponse | null;
        errorStatus: number | null;
      }>(
        {
          source: 'kangur-duels',
          action: 'run-action',
          description: 'Execute a duels action.',
          context: {
            action: nextAction,
            isGuest,
          },
        },
        async () => {
          const response = await task();
          setDuelState(response);
          trackKangurClientEvent('kangur_duels_action_succeeded', {
            action: nextAction,
            durationMs: Date.now() - startedAt,
            isGuest,
            mode: response.session.mode,
            visibility: response.session.visibility,
            status: response.session.status,
            operation: response.session.operation,
            difficulty: response.session.difficulty,
          });
          return { response, errorStatus: null };
        },
        {
          fallback: () => ({ response: null, errorStatus: resolvedStatus }),
          onError: (err) => {
            setError(resolveActionErrorMessage(nextAction, err));
            resolvedStatus =
              typeof err === 'object' &&
              err !== null &&
              'status' in err &&
              typeof (err as { status?: unknown }).status === 'number'
                ? (err as { status: number }).status
                : null;
            trackKangurClientEvent('kangur_duels_action_failed', {
              action: nextAction,
              durationMs: Date.now() - startedAt,
              isGuest,
              status: resolvedStatus,
            });
          },
        }
      );
      setAction(null);
      return result;
    },
    [isGuest, isOnline, resolveActionErrorMessage]
  );

  const handleQuickMatch = useCallback(async () => {
    trackKangurClientEvent('kangur_duels_quick_match_clicked', {
      isGuest,
      operation: duelOperation,
      difficulty: duelDifficulty,
    });
    await runAction('quick_match', () =>
      kangurPlatform.duels.join({
        mode: 'quick_match',
        operation: duelOperation,
        difficulty: duelDifficulty,
      })
    );
  }, [duelDifficulty, duelOperation, isGuest, runAction]);

  const handleCreateChallenge = useCallback(async () => {
    trackKangurClientEvent('kangur_duels_challenge_create_clicked', {
      isGuest,
      operation: duelOperation,
      difficulty: duelDifficulty,
    });
    await runAction('challenge', () =>
      kangurPlatform.duels.create({
        mode: 'challenge',
        visibility: 'public',
        operation: duelOperation,
        difficulty: duelDifficulty,
        questionCount: challengeQuestionCount,
        timePerQuestionSec: challengeTimePerQuestionSec,
        seriesBestOf: challengeBestOf > 1 ? challengeBestOf : undefined,
      })
    );
  }, [
    challengeBestOf,
    challengeQuestionCount,
    challengeTimePerQuestionSec,
    duelDifficulty,
    duelOperation,
    isGuest,
    runAction,
  ]);

  const handleInviteByLearnerId = useCallback(
    async (learnerId: string) => {
      trackKangurClientEvent('kangur_duels_private_invite_clicked', {
        isGuest,
        operation: duelOperation,
        difficulty: duelDifficulty,
      });
      const { response } = await runAction('private', () =>
        kangurPlatform.duels.create({
          mode: 'challenge',
          visibility: 'private',
          opponentLearnerId: learnerId,
          operation: duelOperation,
          difficulty: duelDifficulty,
          questionCount: challengeQuestionCount,
          timePerQuestionSec: challengeTimePerQuestionSec,
          seriesBestOf: challengeBestOf > 1 ? challengeBestOf : undefined,
        })
      );
      if (response) {
        setError(null);
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(null);
      }
    },
    [
      challengeBestOf,
      challengeQuestionCount,
      challengeTimePerQuestionSec,
      duelDifficulty,
      duelOperation,
      isGuest,
      runAction,
    ]
  );

  const handleInviteOpponent = useCallback(
    async (opponent: KangurDuelOpponentEntry) =>
      handleInviteByLearnerId(opponent.learnerId),
    [handleInviteByLearnerId]
  );

  const handleRematch = useCallback(async () => {
    const opponent = opponentsInSession[0];
    if (!activeSession || !opponent) {
      return;
    }
    trackKangurClientEvent('kangur_duels_rematch_clicked', {
      isGuest,
      opponentLearnerId: opponent.learnerId,
      mode: activeSession.mode,
      visibility: activeSession.visibility,
      operation: activeSession.operation,
      difficulty: activeSession.difficulty,
    });
    await runAction('rematch', () =>
      kangurPlatform.duels.create({
        mode: 'challenge',
        visibility: 'private',
        opponentLearnerId: opponent.learnerId,
        operation: activeSession.operation,
        difficulty: activeSession.difficulty,
        questionCount: activeSession.questionCount,
        timePerQuestionSec: activeSession.timePerQuestionSec,
        seriesId: activeSession.series?.id ?? undefined,
        seriesBestOf: activeSession.series?.bestOf ?? undefined,
      })
    );
  }, [activeSession, isGuest, opponentsInSession, runAction]);

  const handleReaction = useCallback(
    async (type: KangurDuelReactionType) => {
      if (!activeSession || !player || isReactionSending) {
        return;
      }
      setIsReactionSending(true);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'send-reaction',
          description: 'Send a duel reaction emoji.',
          context: {
            sessionId: activeSession.id,
            type,
            isGuest,
          },
        },
        async () => {
          trackKangurClientEvent('kangur_duels_reaction_sent', {
            type,
            sessionId: activeSession.id,
            isGuest,
          });
          const response = await kangurPlatform.duels.reaction({
            sessionId: activeSession.id,
            type,
          });
          setDuelState((current) => {
            if (current?.session.id !== activeSession.id) {
              return current;
            }
            const existing = current.session.recentReactions ?? [];
            const nextReactions = [...existing, response.reaction].slice(-6);
            return {
              ...current,
              session: {
                ...current.session,
                recentReactions: nextReactions,
              },
            };
          });
        },
        { fallback: undefined }
      );
      setIsReactionSending(false);
    },
    [activeSession, isGuest, isReactionSending, player, setDuelState]
  );

  useEffect(() => {
    if (!autoJoinSessionId || autoJoinAttemptedRef.current) {
      return;
    }
    if (!canPlay || session) {
      return;
    }
    autoJoinAttemptedRef.current = true;
    void (async () => {
      const { response } = await runAction('join', () =>
        kangurPlatform.duels.join({ sessionId: autoJoinSessionId })
      );
      if (response) {
        setAutoJoinSessionId(null);
        clearUrlParam('join');
      }
    })();
  }, [autoJoinSessionId, canPlay, clearUrlParam, runAction, session]);

  useEffect(() => {
    if (session && spectateSessionId) {
      setSpectateSessionId(null);
      clearUrlParam('spectate');
    }
  }, [clearUrlParam, session, spectateSessionId]);

  useEffect(() => {
    if (!spectateSessionId || session) {
      spectatorAbortRef.current?.abort();
      spectatorAbortRef.current = null;
      spectatorPollingRef.current = false;
      setSpectatorState(null);
      setSpectatorError(null);
      setIsSpectatorLoading(false);
      return;
    }
    if (!isOnline || !isPageActive || typeof window === 'undefined') {
      return;
    }

    if (!spectatorIdRef.current) {
      spectatorIdRef.current = resolveSpectatorId();
    }

    const fetchSpectatorState = async (showLoading = false): Promise<void> => {
      if (spectatorPollingRef.current) {
        return;
      }
      spectatorAbortRef.current?.abort();
      const controller = new AbortController();
      spectatorAbortRef.current = controller;
      spectatorPollingRef.current = true;
      if (showLoading) {
        setIsSpectatorLoading(true);
      }
      setSpectatorError(null);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'spectate',
          description: 'Fetch duel spectator state.',
          context: {
            sessionId: spectateSessionId,
          },
        },
        async () => {
          const response = await kangurPlatform.duels.spectate(spectateSessionId, {
            spectatorId: spectatorIdRef.current ?? undefined,
            signal: controller.signal,
          });
          setSpectatorState(response);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setSpectatorError('Nie udało się pobrać podglądu pojedynku.');
          },
        }
      );
      if (spectatorAbortRef.current === controller) {
        spectatorAbortRef.current = null;
        spectatorPollingRef.current = false;
        if (showLoading) {
          setIsSpectatorLoading(false);
        }
      }
    };

    void fetchSpectatorState(true);
    const intervalId = window.setInterval(() => {
      void fetchSpectatorState();
    }, DUEL_SPECTATOR_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      spectatorAbortRef.current?.abort();
      spectatorAbortRef.current = null;
      spectatorPollingRef.current = false;
    };
  }, [isOnline, isPageActive, resolveSpectatorId, session, spectateSessionId]);

  const loadLobby = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      const startedAt = Date.now();
      if (!canBrowseLobby) {
        lobbyAbortRef.current?.abort();
        lobbyAbortRef.current = null;
        lobbyPollingRef.current = false;
        lastLobbyHashRef.current = '';
        lobbySeenRef.current.clear();
        lobbyFreshRef.current.clear();
        setLobbyEntries([]);
        setLobbyError(null);
        setIsLobbyLoading(false);
        setLobbyLastUpdatedAt(null);
        setLobbyFailureCount(0);
        setRelativeNow(Date.now());
        trackKangurClientEvent('kangur_duels_lobby_fetch_skipped', {
          reason: 'disabled',
          durationMs: Date.now() - startedAt,
          isGuest,
        });
        return;
      }

      if (!isOnline) {
        lobbyAbortRef.current?.abort();
        lobbyAbortRef.current = null;
        lobbyPollingRef.current = false;
        setIsLobbyLoading(false);
        setLobbyError('Brak połączenia z internetem.');
        trackKangurClientEvent('kangur_duels_lobby_fetch_failed', {
          reason: 'offline',
          durationMs: Date.now() - startedAt,
          isGuest,
        });
        return;
      }

      if (lobbyPollingRef.current) {
        if (!showLoading) {
          lobbyRefreshQueuedRef.current = true;
          return;
        }
        lobbyAbortRef.current?.abort();
      }

      const controller = new AbortController();
      lobbyAbortRef.current = controller;
      lobbyPollingRef.current = true;
      if (showLoading) {
        setIsLobbyLoading(true);
      }
      setLobbyError(null);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'lobby-fetch',
          description: 'Fetch duels lobby entries.',
          context: {
            limit: KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
            isGuest,
          },
        },
        async () => {
          const response = await kangurPlatform.duels.lobby({
            limit: KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
            signal: controller.signal,
          });
          const nextEntries = response.entries;
          const nowMs = Date.now();
          setLobbyLastUpdatedAt(response.serverTime ?? new Date(nowMs).toISOString());
          setRelativeNow(nowMs);
          const activeIds = new Set<string>();
          nextEntries.forEach((entry) => {
            activeIds.add(entry.sessionId);
            const prevUpdatedAt = lobbySeenRef.current.get(entry.sessionId);
            if (!prevUpdatedAt || prevUpdatedAt !== entry.updatedAt) {
              lobbyFreshRef.current.set(entry.sessionId, nowMs);
            }
            lobbySeenRef.current.set(entry.sessionId, entry.updatedAt);
          });
          [...lobbySeenRef.current.keys()].forEach((sessionId) => {
            if (!activeIds.has(sessionId)) {
              lobbySeenRef.current.delete(sessionId);
              lobbyFreshRef.current.delete(sessionId);
            }
          });
          const nextHash = `${nextEntries.length}:${nextEntries
            .map((entry) => `${entry.sessionId}:${entry.updatedAt}`)
            .join('|')}`;
          if (nextHash !== lastLobbyHashRef.current) {
            lastLobbyHashRef.current = nextHash;
            setLobbyEntries(nextEntries);
          }
          setLobbyFailureCount(0);
          trackKangurClientEvent('kangur_duels_lobby_fetch_succeeded', {
            durationMs: Date.now() - startedAt,
            isGuest,
            entryCount: nextEntries.length,
            inviteCount: nextEntries.filter((entry) => entry.visibility === 'private').length,
          });
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              trackKangurClientEvent('kangur_duels_lobby_fetch_skipped', {
                reason: 'aborted',
                durationMs: Date.now() - startedAt,
                isGuest,
              });
              return;
            }
            setLobbyError('Nie udało się pobrać lobby. Spróbuj ponownie.');
            setLobbyFailureCount((current) => Math.min(current + 1, 4));
            const status =
              typeof err === 'object' &&
              err !== null &&
              'status' in err &&
              typeof (err as { status?: unknown }).status === 'number'
                ? (err as { status: number }).status
                : null;
            trackKangurClientEvent('kangur_duels_lobby_fetch_failed', {
              durationMs: Date.now() - startedAt,
              isGuest,
              status,
            });
          },
        }
      );
      if (lobbyAbortRef.current === controller) {
        lobbyAbortRef.current = null;
        lobbyPollingRef.current = false;
        if (showLoading) {
          setIsLobbyLoading(false);
        }
      }
      if (lobbyRefreshQueuedRef.current) {
        lobbyRefreshQueuedRef.current = false;
        void loadLobby();
      }
    },
    [canBrowseLobby, isGuest, isOnline]
  );

  const loadLobbyPresence = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!canBrowseLobby || !canPlay) {
        lobbyPresenceAbortRef.current?.abort();
        lobbyPresenceAbortRef.current = null;
        lobbyPresencePollingRef.current = false;
        lastLobbyPresenceHashRef.current = '';
        setLobbyPresenceEntries([]);
        setLobbyPresenceError(null);
        setIsLobbyPresenceLoading(false);
        setLobbyPresenceLastUpdatedAt(null);
        return;
      }

      if (!isOnline) {
        lobbyPresenceAbortRef.current?.abort();
        lobbyPresenceAbortRef.current = null;
        lobbyPresencePollingRef.current = false;
        setIsLobbyPresenceLoading(false);
        setLobbyPresenceError('Brak połączenia z internetem.');
        return;
      }

      if (lobbyPresencePollingRef.current) {
        if (!showLoading) {
          return;
        }
        lobbyPresenceAbortRef.current?.abort();
      }

      const controller = new AbortController();
      lobbyPresenceAbortRef.current = controller;
      lobbyPresencePollingRef.current = true;
      if (showLoading) {
        setIsLobbyPresenceLoading(true);
      }
      setLobbyPresenceError(null);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'lobby-presence',
          description: 'Fetch duels lobby presence.',
          context: {
            canPlay,
          },
        },
        async () => {
          const response = canPlay
            ? await kangurPlatform.duels.lobbyPresencePing({
                limit: 40,
                signal: controller.signal,
              })
            : await kangurPlatform.duels.lobbyPresence({
                limit: 40,
                signal: controller.signal,
              });
          const nextEntries = response.entries;
          const nextHash = `${nextEntries.length}:${nextEntries
            .map((entry) => `${entry.learnerId}:${entry.lastSeenAt}`)
            .join('|')}`;
          if (nextHash !== lastLobbyPresenceHashRef.current) {
            lastLobbyPresenceHashRef.current = nextHash;
            setLobbyPresenceEntries(nextEntries);
          }
          setLobbyPresenceLastUpdatedAt(response.serverTime ?? new Date().toISOString());
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setLobbyPresenceError('Nie udało się pobrać listy uczniów.');
          },
        }
      );
      if (lobbyPresenceAbortRef.current === controller) {
        lobbyPresenceAbortRef.current = null;
        lobbyPresencePollingRef.current = false;
        if (showLoading) {
          setIsLobbyPresenceLoading(false);
        }
      }
    },
    [canBrowseLobby, canPlay, isOnline]
  );

  const loadOpponents = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!canPlayTools) {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
        setRecentOpponents([]);
        setOpponentsError(null);
        setIsOpponentsLoading(false);
        return;
      }

      if (!isOnline) {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
        setOpponentsError('Brak połączenia z internetem.');
        setIsOpponentsLoading(false);
        return;
      }

      if (opponentsAbortRef.current) {
        if (!showLoading) {
          return;
        }
        opponentsAbortRef.current.abort();
      }

      const controller = new AbortController();
      opponentsAbortRef.current = controller;
      if (showLoading) {
        setIsOpponentsLoading(true);
      }
      setOpponentsError(null);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'recent-opponents',
          description: 'Fetch recent duel opponents.',
          context: {
            limit: KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
          },
        },
        async () => {
          const response = await kangurPlatform.duels.recentOpponents({
            limit: KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
            signal: controller.signal,
          });
          setRecentOpponents(response.entries);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setOpponentsError('Nie udało się pobrać listy rywali. Spróbuj ponownie.');
          },
        }
      );
      if (opponentsAbortRef.current === controller) {
        opponentsAbortRef.current = null;
        if (showLoading) {
          setIsOpponentsLoading(false);
        }
      }
    },
    [canPlayTools, isOnline]
  );

  const loadLeaderboard = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!isOnline) {
        leaderboardAbortRef.current?.abort();
        leaderboardAbortRef.current = null;
        setLeaderboardError('Brak połączenia z internetem.');
        setIsLeaderboardLoading(false);
        return;
      }

      if (leaderboardAbortRef.current) {
        if (!showLoading) {
          return;
        }
        leaderboardAbortRef.current.abort();
      }

      const controller = new AbortController();
      leaderboardAbortRef.current = controller;
      if (showLoading) {
        setIsLeaderboardLoading(true);
      }
      setLeaderboardError(null);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'leaderboard',
          description: 'Fetch duel leaderboard entries.',
          context: {
            limit: DUEL_LEADERBOARD_LIMIT,
          },
        },
        async () => {
          const response = await kangurPlatform.duels.leaderboard({
            limit: DUEL_LEADERBOARD_LIMIT,
            signal: controller.signal,
          });
          setLeaderboardEntries(response.entries);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setLeaderboardError('Nie udało się pobrać rankingu.');
          },
        }
      );
      if (leaderboardAbortRef.current === controller) {
        leaderboardAbortRef.current = null;
        if (showLoading) {
          setIsLeaderboardLoading(false);
        }
      }
    },
    [isOnline]
  );

  const handleLeave = useCallback(async () => {
    if (!session) return;
    await runAction('leave', () =>
      kangurPlatform.duels.leave({ sessionId: session.id, reason: 'user_exit' })
    );
  }, [runAction, session]);

  const handleJoinLobbySession = useCallback(
    async (sessionId: string) => {
      setJoiningSessionId(sessionId);
      try {
        const { response, errorStatus } = await runAction('join', () =>
          kangurPlatform.duels.join({ sessionId })
        );
        if (!response && errorStatus && [400, 403, 404, 409].includes(errorStatus)) {
          void loadLobby({ showLoading: true });
        }
      } finally {
        setJoiningSessionId((current) => (current === sessionId ? null : current));
      }
    },
    [loadLobby, runAction]
  );

  const handleReset = useCallback(() => {
    setDuelState(null);
    setPendingQuestionId(null);
    lastAnswerMetaRef.current = null;
    setAnswerResult(null);
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const handleAnswerChoice = useCallback(
    async (choice: KangurQuestionChoice | null) => {
      if (!session || !activeQuestion) return;
      if (pendingQuestionId === activeQuestion.id) return;
      const timedOut = choice === null;
      lastAnswerMetaRef.current = { questionId: activeQuestion.id, timedOut };
      setAnswerResult(null);
      setPendingQuestionId(activeQuestion.id);
      const { response } = await runAction('answer', () =>
        kangurPlatform.duels.answer({
          sessionId: session.id,
          questionId: activeQuestion.id,
          choice: choice ?? DUEL_TIMEOUT_CHOICE,
        })
      );
      if (!response) {
        setPendingQuestionId(null);
        lastAnswerMetaRef.current = null;
      }
    },
    [activeQuestion, pendingQuestionId, runAction, session]
  );

  useEffect(() => {
    const questionId = player?.lastAnswerQuestionId;
    const correct = player?.lastAnswerCorrect;
    if (!questionId || typeof correct !== 'boolean') {
      return;
    }
    const timedOut =
      lastAnswerMetaRef.current?.questionId === questionId
        ? lastAnswerMetaRef.current.timedOut
        : false;
    setAnswerResult((current) => {
      if (
        current &&
        current.questionId === questionId &&
        current.correct === correct &&
        current.timedOut === timedOut
      ) {
        return current;
      }
      return { questionId, correct, timedOut };
    });
  }, [player?.lastAnswerQuestionId, player?.lastAnswerCorrect]);

  useEffect(() => {
    if (!session) {
      setPendingQuestionId(null);
      lastAnswerMetaRef.current = null;
      return;
    }
    const currentId = activeQuestion?.id ?? null;
    if (!currentId || session.status === 'completed' || session.status === 'aborted') {
      setPendingQuestionId(null);
      lastAnswerMetaRef.current = null;
      return;
    }
    if (pendingQuestionId && pendingQuestionId !== currentId) {
      setPendingQuestionId(null);
    }
    if (lastAnswerMetaRef.current && lastAnswerMetaRef.current.questionId !== currentId) {
      lastAnswerMetaRef.current = null;
    }
  }, [activeQuestion?.id, pendingQuestionId, session]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      const isVisible =
        typeof document === 'undefined' || document.visibilityState === 'visible';
      const isFocused = typeof document === 'undefined' || document.hasFocus();
      setIsPageActive(isVisible && isFocused);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleOnline = (): void => {
      setIsOnline(true);
    };
    const handleOffline = (): void => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!canBrowseLobby || !isOnline || !isPageActive) {
      lobbyWsRef.current?.close();
      lobbyWsRef.current = null;
      if (lobbyWsRetryRef.current) {
        window.clearTimeout(lobbyWsRetryRef.current);
        lobbyWsRetryRef.current = null;
      }
      if (lobbyWsRefreshRef.current) {
        window.clearTimeout(lobbyWsRefreshRef.current);
        lobbyWsRefreshRef.current = null;
      }
      if (lobbyRealtimeSourceRef.current === 'ws') {
        lobbyRealtimeSourceRef.current = null;
        setLobbyRealtimeSource(null);
        setLobbyStreamStatus('idle');
      }
      return;
    }

    if (!ENABLE_DUELS_LOBBY_WS || typeof WebSocket === 'undefined') {
      if (lobbyRealtimeSourceRef.current === 'ws') {
        lobbyRealtimeSourceRef.current = null;
        setLobbyRealtimeSource(null);
        setLobbyStreamStatus('fallback');
      }
      return;
    }

    let cancelled = false;

    const closeWs = (): void => {
      if (lobbyWsRef.current) {
        lobbyWsRef.current.close();
        lobbyWsRef.current = null;
      }
    };

    const scheduleRefresh = (): void => {
      if (lobbyWsRefreshRef.current) {
        return;
      }
      lobbyWsRefreshRef.current = window.setTimeout(() => {
        lobbyWsRefreshRef.current = null;
        void loadLobby();
      }, LOBBY_STREAM_DEBOUNCE_MS);
    };

    const scheduleReconnect = (delayMs: number): void => {
      if (lobbyWsRetryRef.current) {
        window.clearTimeout(lobbyWsRetryRef.current);
      }
      lobbyWsRetryRef.current = window.setTimeout(() => {
        lobbyWsRetryRef.current = null;
        if (cancelled) return;
        connect();
      }, delayMs);
    };

    const handleMessage = (rawData: string): void => {
      const payload = withKangurClientErrorSync(
        {
          source: 'kangur-duels',
          action: 'parse-lobby-ws-message',
          description: 'Parse lobby WebSocket event payload.',
        },
        () => JSON.parse(rawData) as { type?: string },
        { fallback: null }
      );
      if (payload?.type === 'heartbeat' || payload?.type === 'ready') {
        return;
      }
      if (payload?.type === 'fallback') {
        closeWs();
        if (lobbyRealtimeSourceRef.current === 'ws') {
          lobbyRealtimeSourceRef.current = null;
          setLobbyRealtimeSource(null);
        }
        setLobbyStreamStatus('fallback');
        scheduleReconnect(5000);
        return;
      }
      const nowMs = Date.now();
      if (nowMs - lobbyWsLastEventRef.current < LOBBY_STREAM_DEBOUNCE_MS) {
        scheduleRefresh();
        return;
      }
      lobbyWsLastEventRef.current = nowMs;
      scheduleRefresh();
    };

    const connect = (): void => {
      if (cancelled) return;
      if (lobbyRealtimeSourceRef.current === 'sse') {
        return;
      }
      closeWs();
      lobbyRealtimeSourceRef.current = 'ws';
      setLobbyRealtimeSource('ws');
      setLobbyStreamStatus('connecting');
      withKangurClientErrorSync(
        {
          source: 'kangur-duels',
          action: 'connect-lobby-ws',
          description: 'Connect the lobby WebSocket stream.',
          context: {
            endpoint: KANGUR_DUELS_LOBBY_WS_ENDPOINT,
          },
        },
        () => {
          const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
          const wsUrl = `${protocol}://${window.location.host}${KANGUR_DUELS_LOBBY_WS_ENDPOINT}`;
          const socket = new WebSocket(wsUrl);
          lobbyWsRef.current = socket;

          socket.onopen = () => {
            if (cancelled || lobbyWsRef.current !== socket) {
              socket.close();
              return;
            }
            lobbyStreamRef.current?.close();
            lobbyStreamRef.current = null;
            lobbyRealtimeSourceRef.current = 'ws';
            setLobbyRealtimeSource('ws');
            setLobbyStreamStatus('connected');
          };

          socket.onmessage = (event: MessageEvent<string>) => {
            if (cancelled || lobbyWsRef.current !== socket) {
              return;
            }
            handleMessage(event.data);
          };

          socket.onerror = () => {
            if (cancelled || lobbyWsRef.current !== socket) {
              return;
            }
            closeWs();
            if (lobbyRealtimeSourceRef.current === 'ws') {
              lobbyRealtimeSourceRef.current = null;
              setLobbyRealtimeSource(null);
            }
            setLobbyStreamStatus('fallback');
            scheduleReconnect(5000);
          };

          socket.onclose = () => {
            if (cancelled || lobbyWsRef.current !== socket) {
              return;
            }
            closeWs();
            if (lobbyRealtimeSourceRef.current === 'ws') {
              lobbyRealtimeSourceRef.current = null;
              setLobbyRealtimeSource(null);
            }
            setLobbyStreamStatus('fallback');
            scheduleReconnect(5000);
          };
        },
        {
          fallback: () => {
            if (lobbyRealtimeSourceRef.current === 'ws') {
              lobbyRealtimeSourceRef.current = null;
              setLobbyRealtimeSource(null);
            }
            setLobbyStreamStatus('fallback');
            scheduleReconnect(5000);
          },
        }
      );
    };

    connect();

    return () => {
      cancelled = true;
      closeWs();
      if (lobbyWsRetryRef.current) {
        window.clearTimeout(lobbyWsRetryRef.current);
        lobbyWsRetryRef.current = null;
      }
      if (lobbyWsRefreshRef.current) {
        window.clearTimeout(lobbyWsRefreshRef.current);
        lobbyWsRefreshRef.current = null;
      }
    };
  }, [canBrowseLobby, isOnline, isPageActive, loadLobby]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!canBrowseLobby || !isOnline || !isPageActive) {
      lobbyStreamRef.current?.close();
      lobbyStreamRef.current = null;
      if (lobbyStreamRetryRef.current) {
        window.clearTimeout(lobbyStreamRetryRef.current);
        lobbyStreamRetryRef.current = null;
      }
      if (lobbyStreamRefreshRef.current) {
        window.clearTimeout(lobbyStreamRefreshRef.current);
        lobbyStreamRefreshRef.current = null;
      }
      if (lobbyRealtimeSourceRef.current === 'sse') {
        lobbyRealtimeSourceRef.current = null;
        setLobbyRealtimeSource(null);
        setLobbyStreamStatus('idle');
      }
      return;
    }

    if (lobbyRealtimeSource === 'ws') {
      return;
    }

    if (!ENABLE_DUELS_LOBBY_SSE || typeof EventSource === 'undefined') {
      if (lobbyRealtimeSourceRef.current !== 'ws') {
        setLobbyStreamStatus('fallback');
      }
      return;
    }

    let cancelled = false;

    const closeStream = (): void => {
      if (lobbyStreamRef.current) {
        lobbyStreamRef.current.close();
        lobbyStreamRef.current = null;
      }
    };

    const scheduleRefresh = (): void => {
      if (lobbyStreamRefreshRef.current) {
        return;
      }
      lobbyStreamRefreshRef.current = window.setTimeout(() => {
        lobbyStreamRefreshRef.current = null;
        void loadLobby();
      }, LOBBY_STREAM_DEBOUNCE_MS);
    };

    const scheduleReconnect = (delayMs: number): void => {
      if (lobbyStreamRetryRef.current) {
        window.clearTimeout(lobbyStreamRetryRef.current);
      }
      lobbyStreamRetryRef.current = window.setTimeout(() => {
        lobbyStreamRetryRef.current = null;
        if (cancelled) return;
        connect();
      }, delayMs);
    };

    const handleMessage = (rawData: string): void => {
      const payload = withKangurClientErrorSync(
        {
          source: 'kangur-duels',
          action: 'parse-lobby-sse-message',
          description: 'Parse lobby SSE event payload.',
        },
        () => JSON.parse(rawData) as { type?: string },
        { fallback: null }
      );
      if (payload?.type === 'heartbeat' || payload?.type === 'ready') {
        return;
      }
      if (payload?.type === 'fallback') {
        closeStream();
        if (lobbyRealtimeSourceRef.current === 'sse') {
          lobbyRealtimeSourceRef.current = null;
          setLobbyRealtimeSource(null);
        }
        setLobbyStreamStatus('fallback');
        scheduleReconnect(5000);
        return;
      }
      const nowMs = Date.now();
      if (nowMs - lobbyStreamLastEventRef.current < LOBBY_STREAM_DEBOUNCE_MS) {
        scheduleRefresh();
        return;
      }
      lobbyStreamLastEventRef.current = nowMs;
      scheduleRefresh();
    };

    const connect = (): void => {
      if (cancelled) return;
      closeStream();
      setLobbyStreamStatus('connecting');
      withKangurClientErrorSync(
        {
          source: 'kangur-duels',
          action: 'connect-lobby-sse',
          description: 'Connect the lobby SSE stream.',
          context: {
            endpoint: KANGUR_DUELS_LOBBY_STREAM_ENDPOINT,
          },
        },
        () => {
          const source = new EventSource(KANGUR_DUELS_LOBBY_STREAM_ENDPOINT);
          lobbyStreamRef.current = source;

          source.onopen = () => {
            if (cancelled || lobbyStreamRef.current !== source) {
              source.close();
              return;
            }
            lobbyRealtimeSourceRef.current = 'sse';
            setLobbyRealtimeSource('sse');
            setLobbyStreamStatus('connected');
          };

          source.onmessage = (event: MessageEvent<string>) => {
            if (cancelled || lobbyStreamRef.current !== source) {
              return;
            }
            handleMessage(event.data);
          };

          source.onerror = () => {
            if (cancelled || lobbyStreamRef.current !== source) {
              return;
            }
            closeStream();
            if (lobbyRealtimeSourceRef.current === 'sse') {
              lobbyRealtimeSourceRef.current = null;
              setLobbyRealtimeSource(null);
            }
            setLobbyStreamStatus('fallback');
            scheduleReconnect(5000);
          };
        },
        {
          fallback: () => {
            if (lobbyRealtimeSourceRef.current === 'sse') {
              lobbyRealtimeSourceRef.current = null;
              setLobbyRealtimeSource(null);
            }
            setLobbyStreamStatus('fallback');
            scheduleReconnect(5000);
          },
        }
      );
    };

    connect();

    return () => {
      cancelled = true;
      closeStream();
      if (lobbyStreamRetryRef.current) {
        window.clearTimeout(lobbyStreamRetryRef.current);
        lobbyStreamRetryRef.current = null;
      }
      if (lobbyStreamRefreshRef.current) {
        window.clearTimeout(lobbyStreamRefreshRef.current);
        lobbyStreamRefreshRef.current = null;
      }
    };
  }, [canBrowseLobby, isOnline, isPageActive, loadLobby, lobbyRealtimeSource]);

  useEffect(() => {
    if (!isOnline || !isPageActive) {
      return;
    }
    if (lobbyError) {
      void loadLobby({ showLoading: true });
    }
  }, [isOnline, isPageActive, lobbyError, loadLobby]);

  useEffect(() => {
    lastSessionUpdatedAtRef.current = session?.updatedAt ?? null;
  }, [session?.updatedAt]);

  useEffect(() => {
    setDuelFailureCount(0);
  }, [sessionId]);

  useEffect(() => {
    if (!canBrowseLobby || !isPageActive) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setRelativeNow(Date.now());
    }, LOBBY_RELATIVE_TIME_TICK_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [canBrowseLobby, isPageActive]);

  useEffect(() => {
    if (!session || !isPageActive) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setDuelRelativeNow(Date.now());
    }, 5000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPageActive, session?.id]);

  useEffect(() => {
    if (!canBrowseLobby || !isOnline) {
      void loadLobby();
      lobbyPollPrimedRef.current = false;
      return;
    }

    if (!isPageActive) {
      lobbyAbortRef.current?.abort();
      lobbyAbortRef.current = null;
      lobbyPollingRef.current = false;
      setIsLobbyLoading(false);
      lobbyPollPrimedRef.current = false;
      return;
    }

    if (!lobbyPollPrimedRef.current) {
      lobbyPollPrimedRef.current = true;
      void loadLobby({ showLoading: true });
    }
    const intervalId = window.setInterval(() => {
      void loadLobby();
    }, lobbyPollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      lobbyAbortRef.current?.abort();
      lobbyAbortRef.current = null;
      lobbyPollingRef.current = false;
    };
  }, [canBrowseLobby, isOnline, isPageActive, loadLobby, lobbyPollIntervalMs]);

  useEffect(() => {
    if (!canBrowseLobby || !canPlay || !isOnline) {
      void loadLobbyPresence();
      return () => {
        lobbyPresenceAbortRef.current?.abort();
        lobbyPresenceAbortRef.current = null;
        lobbyPresencePollingRef.current = false;
      };
    }

    if (!isPageActive) {
      lobbyPresenceAbortRef.current?.abort();
      lobbyPresenceAbortRef.current = null;
      lobbyPresencePollingRef.current = false;
      setIsLobbyPresenceLoading(false);
      return () => {
        lobbyPresenceAbortRef.current?.abort();
        lobbyPresenceAbortRef.current = null;
        lobbyPresencePollingRef.current = false;
      };
    }

    void loadLobbyPresence({ showLoading: true });
    const intervalId = window.setInterval(() => {
      void loadLobbyPresence();
    }, LOBBY_PRESENCE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      lobbyPresenceAbortRef.current?.abort();
      lobbyPresenceAbortRef.current = null;
      lobbyPresencePollingRef.current = false;
    };
  }, [canBrowseLobby, canPlay, isOnline, isPageActive, loadLobbyPresence]);

  useEffect(() => {
    if (!canPlayTools || !isOnline) {
      void loadOpponents();
      return () => {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
      };
    }

    if (!isPageActive) {
      opponentsAbortRef.current?.abort();
      opponentsAbortRef.current = null;
      setIsOpponentsLoading(false);
      return () => {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
      };
    }

    void loadOpponents({ showLoading: true });
    return () => {
      opponentsAbortRef.current?.abort();
      opponentsAbortRef.current = null;
    };
  }, [canPlayTools, isOnline, isPageActive, loadOpponents]);

  useEffect(() => {
    if (!isOnline || !isPageActive) {
      void loadLeaderboard();
      return () => {
        leaderboardAbortRef.current?.abort();
        leaderboardAbortRef.current = null;
      };
    }

    void loadLeaderboard({ showLoading: true });
    return () => {
      leaderboardAbortRef.current?.abort();
      leaderboardAbortRef.current = null;
    };
  }, [isOnline, isPageActive, loadLeaderboard]);

  useEffect(() => {
    if (!canPlayTools) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < KANGUR_DUELS_SEARCH_MIN_CHARS) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    if (!isOnline) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      setSearchResults([]);
      setSearchError('Brak połączenia z internetem.');
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setSearchError(null);

    searchDebounceRef.current = window.setTimeout(() => {
      void (async () => {
        await withKangurClientError(
          {
            source: 'kangur-duels',
            action: 'search-opponents',
            description: 'Search duel opponents.',
            context: {
              query: trimmed,
              limit: KANGUR_DUELS_DEFAULT_SEARCH_LIMIT,
            },
          },
          async () => {
            const response = await kangurPlatform.duels.search(trimmed, {
              limit: KANGUR_DUELS_DEFAULT_SEARCH_LIMIT,
              signal: controller.signal,
            });
            setSearchResults(response.entries);
          },
          {
            fallback: undefined,
            shouldReport: (err) => !isAbortLikeError(err, controller.signal),
            onError: (err) => {
              if (isAbortLikeError(err, controller.signal)) {
                return;
              }
              setSearchError('Nie udało się wyszukać uczniów. Spróbuj ponownie.');
            },
          }
        );
        if (searchAbortRef.current === controller) {
          searchAbortRef.current = null;
          setIsSearching(false);
        }
      })();
    }, DUEL_SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
    };
  }, [canPlayTools, isOnline, searchQuery]);

  useEffect(() => {
    if (!sessionId) {
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
      setDuelFailureCount(0);
      return;
    }
    if (!['waiting', 'ready', 'in_progress'].includes(sessionStatus ?? '')) {
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
      setDuelFailureCount(0);
      return;
    }
    if (!isPageActive || !isOnline) {
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
      return;
    }

    const pollDuelState = async (): Promise<void> => {
      if (duelPollingRef.current) {
        return;
      }

      duelAbortRef.current?.abort();
      const controller = new AbortController();
      duelAbortRef.current = controller;
      duelPollingRef.current = true;
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'poll-duel-state',
          description: 'Poll duel session state.',
          context: {
            sessionId,
          },
        },
        async () => {
          const nextState = await kangurPlatform.duels.state(sessionId, {
            signal: controller.signal,
          });
          const nextUpdatedAt = nextState.session.updatedAt ?? null;
          if (nextUpdatedAt && nextUpdatedAt === lastSessionUpdatedAtRef.current) {
            return;
          }
          lastSessionUpdatedAtRef.current = nextUpdatedAt;
          setDuelState(nextState);
          setDuelFailureCount(0);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setDuelFailureCount((current) => Math.min(current + 1, 4));
          },
        }
      );
      if (duelAbortRef.current === controller) {
        duelAbortRef.current = null;
        duelPollingRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void pollDuelState();
    }, duelPollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
    };
  }, [duelPollIntervalMs, isOnline, isPageActive, sessionId, sessionStatus]);

  useEffect(() => {
    if (!sessionId) {
      duelHeartbeatAbortRef.current?.abort();
      duelHeartbeatAbortRef.current = null;
      duelHeartbeatRef.current = false;
      return;
    }
    if (!['waiting', 'ready', 'in_progress'].includes(sessionStatus ?? '')) {
      duelHeartbeatAbortRef.current?.abort();
      duelHeartbeatAbortRef.current = null;
      duelHeartbeatRef.current = false;
      return;
    }
    if (!isPageActive || !isOnline || typeof window === 'undefined') {
      duelHeartbeatAbortRef.current?.abort();
      duelHeartbeatAbortRef.current = null;
      duelHeartbeatRef.current = false;
      return;
    }

    const sendHeartbeat = async (): Promise<void> => {
      if (duelHeartbeatRef.current) {
        return;
      }
      duelHeartbeatAbortRef.current?.abort();
      const controller = new AbortController();
      duelHeartbeatAbortRef.current = controller;
      duelHeartbeatRef.current = true;
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'heartbeat',
          description: 'Send duel heartbeat ping.',
          context: {
            sessionId,
          },
        },
        async () => {
          await kangurPlatform.duels.heartbeat(
            { sessionId, clientTimestamp: new Date().toISOString() },
            { signal: controller.signal }
          );
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
          },
        }
      );
      if (duelHeartbeatAbortRef.current === controller) {
        duelHeartbeatAbortRef.current = null;
        duelHeartbeatRef.current = false;
      }
    };

    void sendHeartbeat();
    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, DUEL_HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      duelHeartbeatAbortRef.current?.abort();
      duelHeartbeatAbortRef.current = null;
      duelHeartbeatRef.current = false;
    };
  }, [isOnline, isPageActive, sessionId, sessionStatus]);

  return (
    <KangurPageShell id='kangur-duels-page' skipLinkTargetId='kangur-duels-main'>
      <KangurTopNavigationController navigation={navigation} />
      <KangurPageContainer as='section' data-kangur-route-main='true' id='kangur-duels-main'>
        <div className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
          {error ? (
            <KangurInfoCard
              accent='rose'
              padding='md'
              tone='accent'
              role='alert'
              aria-live='assertive'
              id={errorMessageId}
            >
              {error}
            </KangurInfoCard>
          ) : null}

          {autoJoinSessionId && !canPlay && !session ? (
            <KangurInfoCard accent='indigo' padding='md' tone='accent' role='status'>
              Zaloguj się, aby dołączyć do zaproszonego pojedynku.
            </KangurInfoCard>
          ) : null}

          {isSpectatorMode ? (
            <KangurGlassPanel
              className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
              padding='lg'
              surface='solid'
              role='region'
              aria-labelledby={duelHeadingId}
            >
              <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
                <div className='space-y-1'>
                  <h3 id={duelHeadingId} className='text-xl font-semibold text-slate-900'>
                    Podgląd pojedynku
                  </h3>
                  <p className='text-sm text-slate-600'>
                    Oglądasz pojedynek na żywo.
                  </p>
                </div>
                <KangurButton
                  onClick={handleExitSpectate}
                  variant='ghost'
                  className='w-full sm:w-auto'
                >
                  Zakończ podgląd
                </KangurButton>
              </div>

              {spectatorError ? (
                <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert'>
                  {spectatorError}
                </KangurInfoCard>
              ) : null}

              {isSpectatorLoading && !spectatorSession ? (
                <KangurInfoCard accent='slate' padding='md' tone='accent' role='status'>
                  Ładujemy podgląd pojedynku…
                </KangurInfoCard>
              ) : null}

              {spectatorSession ? (
                <>
                  <div className='flex flex-wrap items-center gap-2'>
                    <KangurStatusChip accent={resolveSessionAccent(spectatorSession.status)} size='sm'>
                      {SESSION_STATUS_LABELS[spectatorSession.status]}
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      {formatDuelOperationLabel(spectatorSession.operation)}
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      {formatDuelDifficultyLabel(spectatorSession.difficulty)}
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      ⏱ {spectatorSession.timePerQuestionSec}s / pytanie
                    </KangurStatusChip>
                    {spectatorSession.series ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        Seria: BO{spectatorSession.series.bestOf} · Mecz{' '}
                        {spectatorSession.series.gameIndex}
                      </KangurStatusChip>
                    ) : null}
                    {typeof spectatorSession.spectatorCount === 'number' ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        👀 {spectatorSession.spectatorCount}
                      </KangurStatusChip>
                    ) : null}
                  </div>

                  <div className='grid kangur-panel-gap sm:grid-cols-2' role='list'>
                    {spectatorSession.players.map((entry) => {
                      const bonusPoints = entry.bonusPoints ?? 0;
                      const totalScore = entry.score + bonusPoints;
                      const scoreLabel =
                        bonusPoints > 0 ? `${entry.score} (+${bonusPoints} czas)` : `${entry.score}`;
                      const isLeader =
                        spectatorTopScore !== null && totalScore === spectatorTopScore;
                      return (
                        <div
                          key={entry.learnerId}
                          className='rounded-2xl border border-slate-200 bg-white/70 p-4'
                          role='listitem'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='space-y-1'>
                              <div className='text-sm font-semibold text-slate-800'>
                                {entry.displayName}
                              </div>
                              <div className='text-xs text-slate-500'>
                                Wynik: {scoreLabel}
                              </div>
                            </div>
                            {isLeader ? (
                              <KangurStatusChip accent='emerald' size='sm'>
                                Prowadzi
                              </KangurStatusChip>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {spectatorSession.recentReactions &&
                  spectatorSession.recentReactions.length > 0 ? (
                    <div className='flex flex-wrap gap-2 text-xs text-slate-600'>
                      {spectatorSession.recentReactions.slice(-6).map((reaction) => (
                        <span
                          key={reaction.id}
                          className='flex items-center gap-1 rounded-full bg-white/80 px-3 py-1'
                        >
                          <span className='text-sm'>
                            {DUEL_REACTION_OPTIONS.find((option) => option.type === reaction.type)
                              ?.label ?? '✨'}
                          </span>
                          <span>{reaction.displayName}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {spectatorQuestion ? (
                    <div className='pointer-events-none opacity-80'>
                      <QuestionCard
                        question={spectatorQuestion}
                        questionNumber={spectatorSession.currentQuestionIndex + 1}
                        total={spectatorSession.questionCount}
                        timeLimit={spectatorSession.timePerQuestionSec}
                        onAnswer={() => undefined}
                        onAnswerChoice={() => undefined}
                        answerMode='server'
                        serverResult={null}
                      />
                    </div>
                  ) : (
                    <KangurInfoCard accent='rose' padding='md' tone='accent'>
                      Brak aktywnego pytania do podglądu.
                    </KangurInfoCard>
                  )}
                </>
              ) : null}
            </KangurGlassPanel>
          ) : null}

          <KangurGlassPanel
            className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
            padding='lg'
            surface='solid'
            role='region'
            aria-labelledby={leaderboardHeadingId}
          >
            <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
              <div className='space-y-1'>
                <h3 id={leaderboardHeadingId} className='text-xl font-semibold text-slate-900'>
                  Ranking pojedynków
                </h3>
                <p className='text-sm text-slate-600'>Najaktywniejsi gracze z ostatnich tygodni.</p>
              </div>
              <KangurButton
                onClick={() => {
                  void loadLeaderboard({ showLoading: true });
                }}
                variant='ghost'
                disabled={isLeaderboardLoading}
                className='w-full sm:w-auto'
              >
                {isLeaderboardLoading ? 'Odświeżamy…' : 'Odśwież'}
              </KangurButton>
            </div>

            {leaderboardError ? (
              <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert'>
                {leaderboardError}
              </KangurInfoCard>
            ) : null}

            {isLeaderboardLoading && leaderboardEntries.length === 0 ? (
              <KangurInfoCard accent='slate' padding='md' tone='accent' role='status'>
                Ładujemy ranking…
              </KangurInfoCard>
            ) : null}

            {leaderboardEntries.length > 0 ? (
              <ol
                className='grid kangur-panel-gap sm:grid-cols-2'
                role='list'
                id={leaderboardListId}
                aria-label='Ranking pojedynków'
              >
                {leaderboardEntries.map((entry, index) => (
                  <li
                    key={entry.learnerId}
                    className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-4'
                  >
                    <div className='space-y-1'>
                      <div className='text-sm font-semibold text-slate-800'>
                        {index + 1}. {entry.displayName}
                      </div>
                      <div className='text-xs text-slate-500'>
                        Wygrane: {entry.wins} • Przegrane: {entry.losses} • Remisy: {entry.ties}
                      </div>
                    </div>
                    <KangurStatusChip accent='indigo' size='sm'>
                      {Math.round(entry.winRate * 100)}%
                    </KangurStatusChip>
                  </li>
                ))}
              </ol>
            ) : null}

            {!leaderboardError && !isLeaderboardLoading && leaderboardEntries.length === 0 ? (
              <KangurInfoCard accent='slate' padding='md' tone='accent'>
                Brak danych rankingowych.
              </KangurInfoCard>
            ) : null}
          </KangurGlassPanel>

          {canPlay && !session && inviteLobbyEntries.length > 0 ? (
            <KangurInfoCard
              accent='indigo'
              padding='md'
              tone='accent'
              role='status'
              aria-live='polite'
              id={inviteNoticeId}
            >
              Masz {inviteLobbyEntries.length} zaproszeń do pojedynku.
            </KangurInfoCard>
          ) : null}

          {!canPlay ? (
            <KangurEmptyState
              title='Pojedynki matematyczne'
              description='Możesz przeglądać lobby jako gość, ale dołączenie do pojedynków wymaga logowania.'
            >
              <div className='flex flex-col sm:flex-row sm:flex-wrap justify-center kangur-panel-gap'>
                <KangurButton
                  onClick={() => openLoginModal(null)}
                  size='lg'
                  variant='primary'
                  className='w-full sm:w-auto'
                >
                  Zaloguj się
                </KangurButton>
                <KangurButton
                  onClick={() => openLoginModal(null, { authMode: 'create-account' })}
                  size='lg'
                  variant='secondary'
                  className='w-full sm:w-auto'
                >
                  Utwórz konto
                </KangurButton>
              </div>
            </KangurEmptyState>
          ) : null}

          {canPlayTools ? (
            <>
              <KangurGlassPanel
                className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
                id='kangur-duels-invite'
                padding='lg'
                surface='solid'
                role='region'
                aria-labelledby={playPanelHeadingId}
                aria-describedby={playPanelDescriptionId}
              >
                <div className='space-y-2'>
                  <h2
                    id={playPanelHeadingId}
                    className='text-2xl font-semibold text-slate-900'
                  >
                    Zagraj pojedynek
                  </h2>
                  <p id={playPanelDescriptionId} className='text-sm text-slate-600'>
                    Wybierz szybki pojedynek, utwórz publiczne wyzwanie albo zaproś rywala.
                  </p>
                </div>
                <div className='flex flex-col sm:flex-row sm:flex-wrap kangur-panel-gap'>
                  <KangurButton
                    onClick={() => {
                      void handleQuickMatch();
                    }}
                    size='lg'
                    variant='primary'
                    disabled={isBusy}
                    aria-busy={action === 'quick_match'}
                    aria-live='polite'
                    className='w-full sm:w-auto'
                  >
                    {action === 'quick_match' ? 'Szukamy przeciwnika…' : 'Szybki pojedynek'}
                  </KangurButton>
                  <KangurButton
                    onClick={() => {
                      void handleCreateChallenge();
                    }}
                    size='lg'
                    variant='secondary'
                    disabled={isBusy}
                    aria-busy={action === 'challenge'}
                    aria-live='polite'
                    className='w-full sm:w-auto'
                  >
                    {action === 'challenge' ? 'Tworzymy wyzwanie…' : 'Publiczne wyzwanie'}
                  </KangurButton>
                </div>
                <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                  <KangurStatusChip accent='slate' size='sm'>
                    {formatDuelOperationLabel(duelOperation)}
                  </KangurStatusChip>
                  <KangurStatusChip accent='slate' size='sm'>
                    {formatDuelDifficultyLabel(duelDifficulty)}
                  </KangurStatusChip>
                </div>
                <div
                  className='flex flex-col kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-4'
                  role='group'
                  aria-labelledby={challengeSettingsHeadingId}
                  aria-describedby={challengeSettingsHintId}
                >
                  <div className='space-y-1'>
                    <div
                      id={challengeSettingsHeadingId}
                      className='text-sm font-semibold text-slate-800'
                    >
                      Ustawienia wyzwań
                    </div>
                    <p id={challengeSettingsHintId} className='text-xs text-slate-500'>
                      Dotyczy szybkich pojedynków oraz publicznych i prywatnych wyzwań.
                    </p>
                  </div>
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div
                      className='space-y-2'
                      role='group'
                      aria-labelledby={challengeOperationLabelId}
                    >
                      <div
                        id={challengeOperationLabelId}
                        className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'
                      >
                        Działanie
                      </div>
                      <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap`}>
                        {DUEL_OPERATION_OPTIONS.map((option) => (
                          <KangurButton
                            key={option.value}
                            onClick={() => setDuelOperation(option.value)}
                            variant={duelOperation === option.value ? 'segmentActive' : 'segment'}
                            size='sm'
                            aria-pressed={duelOperation === option.value}
                            className='flex-1 min-w-[120px] text-xs sm:text-sm'
                          >
                            <span className='text-base'>{option.symbol}</span>
                            <span>{option.label}</span>
                          </KangurButton>
                        ))}
                      </div>
                    </div>
                    <div
                      className='space-y-2'
                      role='group'
                      aria-labelledby={challengeDifficultyLabelId}
                    >
                      <div
                        id={challengeDifficultyLabelId}
                        className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'
                      >
                        Poziom
                      </div>
                      <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap`}>
                        {DUEL_DIFFICULTY_OPTIONS.map((option) => (
                          <KangurButton
                            key={option.value}
                            onClick={() => setDuelDifficulty(option.value)}
                            variant={duelDifficulty === option.value ? 'segmentActive' : 'segment'}
                            size='sm'
                            aria-pressed={duelDifficulty === option.value}
                            className='flex-1 min-w-[110px] text-xs sm:text-sm'
                          >
                            <span>{option.emoji}</span>
                            <span>{option.label}</span>
                          </KangurButton>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-col sm:flex-row sm:flex-wrap gap-3'>
                    <label className='flex flex-col gap-2 text-xs font-semibold text-slate-600'>
                      <span>Pytania</span>
                      <KangurSelectField
                        id={challengeQuestionsSelectId}
                        name='challengeQuestionCount'
                        className='min-w-[140px]'
                        accent='indigo'
                        size='md'
                        value={String(challengeQuestionCount)}
                        onChange={(event) => {
                          const nextValue = Number.parseInt(event.target.value, 10);
                          if (Number.isFinite(nextValue)) {
                            setChallengeQuestionCount(nextValue);
                          }
                        }}
                      >
                        {DUEL_QUESTION_COUNT_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </KangurSelectField>
                    </label>
                    <label className='flex flex-col gap-2 text-xs font-semibold text-slate-600'>
                      <span>Czas na pytanie</span>
                      <KangurSelectField
                        id={challengeTimeSelectId}
                        name='challengeTimePerQuestion'
                        className='min-w-[160px]'
                        accent='indigo'
                        size='md'
                        value={String(challengeTimePerQuestionSec)}
                        onChange={(event) => {
                          const nextValue = Number.parseInt(event.target.value, 10);
                          if (Number.isFinite(nextValue)) {
                            setChallengeTimePerQuestionSec(nextValue);
                          }
                        }}
                      >
                        {DUEL_TIME_PER_QUESTION_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value} s
                          </option>
                        ))}
                      </KangurSelectField>
                    </label>
                    <label className='flex flex-col gap-2 text-xs font-semibold text-slate-600'>
                      <span>Seria</span>
                      <KangurSelectField
                        id={challengeBestOfSelectId}
                        name='challengeBestOf'
                        className='min-w-[140px]'
                        accent='indigo'
                        size='md'
                        value={String(challengeBestOf)}
                        onChange={(event) => {
                          const nextValue = Number.parseInt(event.target.value, 10);
                          if (Number.isFinite(nextValue)) {
                            setChallengeBestOf(nextValue);
                          }
                        }}
                      >
                        {DUEL_BEST_OF_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value === 1 ? 'Pojedynek' : `Best of ${value}`}
                          </option>
                        ))}
                      </KangurSelectField>
                    </label>
                  </div>
                </div>
                <div
                  className='flex flex-col kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-4'
                  role='region'
                  aria-labelledby={opponentsHeadingId}
                  aria-busy={isOpponentsLoading}
                >
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between kangur-panel-gap'>
                    <div
                      id={opponentsHeadingId}
                      className='text-sm font-semibold text-slate-800'
                    >
                      Zaproś ostatniego rywala
                    </div>
                    <KangurButton
                      onClick={() => {
                        void loadOpponents({ showLoading: true });
                      }}
                      variant='ghost'
                      disabled={isOpponentsLoading}
                      aria-label='Odśwież listę ostatnich rywali'
                      aria-busy={isOpponentsLoading}
                      aria-live='polite'
                      className='w-full sm:w-auto'
                    >
                      {isOpponentsLoading ? 'Odświeżamy…' : 'Odśwież'}
                    </KangurButton>
                  </div>

                  {opponentsError ? (
                    <KangurInfoCard
                      accent='rose'
                      padding='md'
                      tone='accent'
                      role='alert'
                      aria-live='assertive'
                    >
                      {opponentsError}
                    </KangurInfoCard>
                  ) : null}

                  {isOpponentsLoading && recentOpponents.length === 0 ? (
                    <div className='flex flex-wrap gap-2' role='status' aria-live='polite'>
                      <span className='sr-only'>Ładowanie listy ostatnich rywali…</span>
                      {Array.from({ length: 3 }, (_, index) => (
                        <div
                          key={`opponent-skeleton-${index}`}
                          className='h-9 w-28 rounded-full bg-slate-200/70 animate-pulse'
                          aria-hidden='true'
                        />
                      ))}
                    </div>
                  ) : recentOpponents.length === 0 ? (
                    <div className='text-sm text-slate-600' role='status' aria-live='polite'>
                      Brak ostatnich rywali. Zagraj publiczny pojedynek, aby pojawili się tutaj.
                    </div>
                  ) : (
                    <ul
                      className='flex flex-wrap gap-2'
                      role='list'
                      aria-label='Ostatni rywale'
                      id={recentOpponentsListId}
                    >
                      {recentOpponents.map((opponent) => (
                        <li key={opponent.learnerId}>
                          <KangurButton
                            onClick={() => {
                              void handleInviteOpponent(opponent);
                            }}
                            variant='secondary'
                            disabled={isBusy}
                            className='w-full sm:w-auto'
                          >
                            Zaproś {opponent.displayName}
                          </KangurButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  className='flex flex-col kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-4'
                  role='region'
                  aria-labelledby={searchHeadingId}
                  aria-busy={isSearching}
                  data-search-state={searchStateSignature}
                >
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between kangur-panel-gap'>
                    <div id={searchHeadingId} className='text-sm font-semibold text-slate-800'>
                      Znajdź gracza
                    </div>
                    <KangurStatusChip accent='slate' size='sm'>
                      Min {KANGUR_DUELS_SEARCH_MIN_CHARS} znaki
                    </KangurStatusChip>
                  </div>
                  <SearchField
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder='Szukaj po nicku'
                    aria-label='Szukaj gracza do prywatnego pojedynku'
                    aria-describedby={searchDescribedBy}
                    aria-controls={searchResultsListId}
                    autoComplete='off'
                  />
                  <div id={searchHintId} className='text-xs text-slate-500'>
                    Wpisz co najmniej {KANGUR_DUELS_SEARCH_MIN_CHARS} znaki, aby zobaczyć wyniki.
                  </div>

                  {searchError ? (
                    <KangurInfoCard
                      accent='rose'
                      padding='md'
                      tone='accent'
                      role='alert'
                      aria-live='assertive'
                      id={searchErrorId}
                    >
                      {searchError}
                    </KangurInfoCard>
                  ) : null}

                  <div id={searchResultsListId}>
                    {isSearching && searchResults.length === 0 ? (
                      <div className='flex flex-col gap-2' role='status' aria-live='polite'>
                        <span className='sr-only'>Wyszukiwanie uczniów…</span>
                        {Array.from({ length: 2 }, (_, index) => (
                          <div
                            key={`search-skeleton-${index}`}
                            className='h-12 rounded-2xl bg-slate-200/70 animate-pulse'
                            aria-hidden='true'
                          />
                        ))}
                      </div>
                    ) : canShowSearchResults && searchResults.length === 0 ? (
                      <div className='text-sm text-slate-600' role='status' aria-live='polite'>
                        Brak wyników.
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ul className='grid gap-2 sm:grid-cols-2' role='list' aria-label='Wyniki wyszukiwania graczy'>
                        {searchResults.map((entry) => (
                          <li key={entry.learnerId}>
                            <KangurInfoCard
                              accent='slate'
                              padding='md'
                              tone='neutral'
                              className='flex flex-col sm:flex-row sm:items-center sm:justify-between kangur-panel-gap'
                              role='group'
                              aria-label={`Zaproś gracza ${entry.displayName}`}
                            >
                              <div>
                                <div className='text-sm font-semibold text-slate-800'>
                                  {entry.displayName}
                                </div>
                              </div>
                              <KangurButton
                                onClick={() => {
                                  void handleInviteByLearnerId(entry.learnerId);
                                }}
                                variant='secondary'
                                disabled={isBusy}
                                aria-label={`Zaproś gracza ${entry.displayName}`}
                                className='w-full sm:w-auto'
                              >
                                Zaproś
                              </KangurButton>
                            </KangurInfoCard>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className='sr-only' aria-live='polite'>
                        Wpisz więcej znaków, aby zobaczyć wyniki wyszukiwania.
                      </div>
                    )}
                  </div>
                </div>
              </KangurGlassPanel>
            </>
          ) : null}

          {canBrowseLobby ? (
            <>
              <DuelsLobbyPanels
                inviteLobbyEntries={inviteLobbyEntries}
                inviteHeadingId={inviteHeadingId}
                inviteListId={inviteListId}
                lobbyHeadingId={lobbyHeadingId}
                lobbyDescriptionId={lobbyDescriptionId}
                lobbyListId={lobbyListId}
                lobbyEntries={lobbyEntries}
                lobbyCountLabel={lobbyCountLabel}
                lobbyLastUpdatedAt={lobbyLastUpdatedAt}
                relativeNow={relativeNow}
                lobbyRefreshSeconds={lobbyRefreshSeconds}
                lobbyStreamStatus={lobbyStreamStatus}
                loadLobby={loadLobby}
                isLobbyLoading={isLobbyLoading}
                lobbyModeFilter={lobbyModeFilter}
                setLobbyModeFilter={setLobbyModeFilter}
                lobbyOperationFilter={lobbyOperationFilter}
                setLobbyOperationFilter={setLobbyOperationFilter}
                lobbyDifficultyFilter={lobbyDifficultyFilter}
                setLobbyDifficultyFilter={setLobbyDifficultyFilter}
                lobbySort={lobbySort}
                setLobbySort={setLobbySort}
                publicLobbyEntries={publicLobbyEntries}
                filteredPublicLobbyEntries={filteredPublicLobbyEntries}
                hasAnyPublicLobbyEntries={hasAnyPublicLobbyEntries}
                hasVisiblePublicLobbyEntries={hasVisiblePublicLobbyEntries}
                lobbyError={lobbyError}
                isBusy={isBusy}
                joiningSessionId={joiningSessionId}
                isPageActive={isPageActive}
                isOnline={isOnline}
                isLobbyStale={isLobbyStale}
                canJoinLobby={canPlay}
                onRequireLogin={() => openLoginModal(null)}
                handleJoinLobbySession={handleJoinLobbySession}
                handleCreateChallenge={handleCreateChallenge}
                lobbyFreshRef={lobbyFreshRef}
                lobbyFreshWindowMs={LOBBY_FRESH_WINDOW_MS}
              />
              {canPlay ? (
                <KangurGlassPanel
                  className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
                  padding='lg'
                  surface='solid'
                  role='region'
                  aria-labelledby={lobbyPresenceHeadingId}
                >
                  <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
                    <div className='space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3
                          id={lobbyPresenceHeadingId}
                          className='text-xl font-semibold text-slate-900'
                        >
                          Uczniowie w lobby
                        </h3>
                        <KangurStatusChip
                          accent={lobbyPresenceEntries.length > 0 ? 'emerald' : 'slate'}
                          size='sm'
                        >
                          {lobbyPresenceCountLabel}
                        </KangurStatusChip>
                      </div>
                      <p className='text-sm text-slate-600'>
                        Lista uczniów, którzy aktywnie przeglądają lobby.
                      </p>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      {!isPageActive ? (
                        <KangurStatusChip accent='amber' size='sm'>
                          Wstrzymane
                        </KangurStatusChip>
                      ) : null}
                      {!isOnline ? (
                        <KangurStatusChip accent='rose' size='sm'>
                          Offline
                        </KangurStatusChip>
                      ) : null}
                      {lobbyPresenceLastUpdatedAt ? (
                        <KangurStatusChip accent='slate' size='sm'>
                          Aktualizacja {formatRelativeAge(lobbyPresenceLastUpdatedAt, relativeNow)}
                        </KangurStatusChip>
                      ) : null}
                      <KangurButton
                        onClick={() => {
                          void loadLobbyPresence({ showLoading: true });
                        }}
                        variant='ghost'
                        disabled={isLobbyPresenceLoading || !isOnline}
                        aria-busy={isLobbyPresenceLoading}
                        aria-label='Odśwież listę uczniów w lobby'
                        className='w-full sm:w-auto'
                      >
                        {isLobbyPresenceLoading ? 'Odświeżamy…' : 'Odśwież'}
                      </KangurButton>
                    </div>
                  </div>

                  {lobbyPresenceError ? (
                    <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert'>
                      {lobbyPresenceError}
                    </KangurInfoCard>
                  ) : null}

                  {isLobbyPresenceLoading && lobbyPresenceEntries.length === 0 ? (
                    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status'>
                      Ładujemy listę uczniów…
                    </KangurInfoCard>
                  ) : null}

                  {lobbyPresenceEntries.length > 0 ? (
                    <ul
                      className='grid kangur-panel-gap sm:grid-cols-2'
                      role='list'
                      aria-label='Uczniowie w lobby'
                      id={lobbyPresenceListId}
                    >
                      {lobbyPresenceEntries.map((entry) => (
                        <li
                          key={entry.learnerId}
                          className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-4'
                        >
                          <div className='flex items-center kangur-panel-gap'>
                            <div
                              className='flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700'
                              aria-hidden='true'
                            >
                              {resolveLobbyHostInitial(entry.displayName)}
                            </div>
                            <div>
                              <div className='text-sm font-semibold text-slate-800'>
                                {entry.displayName}
                              </div>
                              <div className='text-xs text-slate-500'>
                                Aktywny {formatRelativeAge(entry.lastSeenAt, relativeNow)}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {!lobbyPresenceError &&
                  !isLobbyPresenceLoading &&
                  lobbyPresenceEntries.length === 0 ? (
                    <KangurInfoCard accent='slate' padding='md' tone='accent'>
                      Brak aktywnych uczniów w lobby.
                    </KangurInfoCard>
                  ) : null}
                </KangurGlassPanel>
              ) : null}
              <DuelsLobbyChatPanel
                enabled={isPageActive}
                isOnline={isOnline}
                canPost={canPlay}
                relativeNow={relativeNow}
                activeLearnerId={user?.activeLearner?.id ?? null}
                onRequireLogin={() => openLoginModal(null)}
              />
            </>
          ) : null}

          {canPlay && waitingSession ? (
            <KangurGlassPanel
              className={cn('flex flex-col kangur-panel-gap', MOTION_PANEL_CLASSNAME)}
              padding='lg'
              surface='solid'
              role='region'
              aria-labelledby={waitingHeadingId}
            >
              <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
                <div className='space-y-1'>
                  <h3
                    id={waitingHeadingId}
                    className='text-xl font-semibold text-slate-900'
                  >
                    Czekamy na przeciwnika
                  </h3>
                  <p className='text-sm text-slate-600' aria-live='polite'>
                    {waitingSession.visibility === 'private'
                      ? `Zaproszenie wysłane${
                          waitingSession.invitedLearnerName
                            ? ` do ${waitingSession.invitedLearnerName}`
                            : ''
                        }.`
                      : 'Twój pojedynek jest widoczny w lobby.'}
                  </p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  {!isOnline ? (
                    <KangurStatusChip accent='rose' size='sm'>
                      Offline
                    </KangurStatusChip>
                  ) : isDuelReconnecting ? (
                    <KangurStatusChip accent='amber' size='sm'>
                      Wznawiamy połączenie
                    </KangurStatusChip>
                  ) : null}
                  <KangurStatusChip accent={resolveSessionAccent(waitingSession.status)} size='sm'>
                    {SESSION_STATUS_LABELS[waitingSession.status]}
                  </KangurStatusChip>
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <KangurStatusChip accent='slate' size='sm'>
                  Tryb: {LOBBY_MODE_LABELS[waitingSession.mode]}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {formatDuelOperationLabel(waitingSession.operation)}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {formatDuelDifficultyLabel(waitingSession.difficulty)}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  Pytania: {waitingSession.questionCount}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  ⏱ {waitingSession.timePerQuestionSec}s / pytanie
                </KangurStatusChip>
                {waitingSession.series ? (
                  <KangurStatusChip accent='slate' size='sm'>
                    Seria: BO{waitingSession.series.bestOf} · Mecz {waitingSession.series.gameIndex}
                  </KangurStatusChip>
                ) : null}
                {Number.isFinite(duelEstimatedDurationSec ?? NaN) ? (
                  <KangurStatusChip accent='slate' size='sm'>
                    ≈ {formatDurationLabel(duelEstimatedDurationSec ?? 0)}
                  </KangurStatusChip>
                ) : null}
              </div>
              <div className='flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500'>
                <span>
                  Utworzono {formatRelativeAge(waitingSession.createdAt, duelRelativeNow)}
                </span>
                <span>
                  Aktualizacja {formatRelativeAge(waitingSession.updatedAt, duelRelativeNow)}
                </span>
              </div>
              <div className='flex flex-col sm:flex-row sm:flex-wrap kangur-panel-gap'>
                {inviteLink ? (
                  <KangurButton
                    onClick={() => {
                      void (async () => {
                        const ok = await copyToClipboard(inviteLink);
                        setInviteCopyStatus(ok ? 'success' : 'error');
                        window.setTimeout(() => setInviteCopyStatus('idle'), 2000);
                      })();
                    }}
                    variant='secondary'
                    className='w-full sm:w-auto'
                    disabled={inviteCopyStatus === 'success'}
                  >
                    {inviteCopyStatus === 'success'
                      ? 'Skopiowano link'
                      : inviteCopyStatus === 'error'
                        ? 'Nie udało się skopiować'
                        : 'Kopiuj link zaproszenia'}
                  </KangurButton>
                ) : null}
                <KangurButton
                  onClick={() => {
                    void handleLeave();
                  }}
                  variant='ghost'
                  disabled={isBusy}
                  className='w-full sm:w-auto'
                >
                  Anuluj pojedynek
                </KangurButton>
              </div>
            </KangurGlassPanel>
          ) : null}

          {canPlay && activeSession ? (
            <KangurGlassPanel
              className={cn('flex flex-col kangur-panel-gap', MOTION_PANEL_CLASSNAME)}
              padding='lg'
              surface='solid'
              role='region'
              aria-labelledby={duelHeadingId}
              aria-describedby={duelSummaryId}
            >
              <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
                <div>
                  <h3 id={duelHeadingId} className='text-xl font-semibold text-slate-900'>
                    Pojedynek
                  </h3>
                  <p id={duelSummaryId} className='text-sm text-slate-600' aria-live='polite'>
                    {playerQuestionNumber !== null
                      ? `Pytanie ${playerQuestionNumber} z ${activeSession.questionCount}`
                      : 'Ukończono wszystkie pytania'}
                  </p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  {!isOnline ? (
                    <KangurStatusChip accent='rose' size='sm'>
                      Offline
                    </KangurStatusChip>
                  ) : isDuelReconnecting ? (
                    <KangurStatusChip accent='amber' size='sm'>
                      Wznawiamy połączenie
                    </KangurStatusChip>
                  ) : null}
                  <KangurStatusChip accent={resolveSessionAccent(activeSession.status)} size='sm'>
                    {SESSION_STATUS_LABELS[activeSession.status]}
                  </KangurStatusChip>
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <KangurStatusChip accent='slate' size='sm'>
                  Tryb: {LOBBY_MODE_LABELS[activeSession.mode]}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {formatDuelOperationLabel(activeSession.operation)}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {formatDuelDifficultyLabel(activeSession.difficulty)}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  ⏱ {activeSession.timePerQuestionSec}s / pytanie
                </KangurStatusChip>
                {activeSession.series ? (
                  <KangurStatusChip accent='slate' size='sm'>
                    Seria: BO{activeSession.series.bestOf} · Mecz {activeSession.series.gameIndex}
                  </KangurStatusChip>
                ) : null}
                {typeof activeSession.spectatorCount === 'number' ? (
                  <KangurStatusChip accent='slate' size='sm'>
                    👀 {activeSession.spectatorCount}
                  </KangurStatusChip>
                ) : null}
                {Number.isFinite(duelEstimatedDurationSec ?? NaN) ? (
                  <KangurStatusChip accent='slate' size='sm'>
                    ≈ {formatDurationLabel(duelEstimatedDurationSec ?? 0)}
                  </KangurStatusChip>
                ) : null}
              </div>
              <div className='rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 text-xs text-slate-600'>
                <div className='flex flex-wrap items-center gap-3'>
                  {activeSession.startedAt ? (
                    <span>
                      Rozpoczęto {formatRelativeAge(activeSession.startedAt, duelRelativeNow)}
                    </span>
                  ) : (
                    <span>Rozpoczęcie wkrótce</span>
                  )}
                  <span>
                    Ostatnia aktywność{' '}
                    {formatRelativeAge(activeSession.updatedAt ?? null, duelRelativeNow)}
                  </span>
                  {Number.isFinite(duelRemainingSec ?? NaN) ? (
                    <span>Pozostało ≈ {formatDurationLabel(duelRemainingSec ?? 0)}</span>
                  ) : null}
                </div>
                {duelProgressPct !== null ? (
                  <div className='mt-2 h-2 rounded-full bg-slate-200/80'>
                    <div
                      className='h-2 rounded-full bg-indigo-400 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none'
                      style={{ width: `${duelProgressPct}%` }}
                    />
                  </div>
                ) : null}
              </div>

              <div
                className='grid kangur-panel-gap sm:grid-cols-2'
                role='list'
                aria-label='Wyniki graczy'
                id={duelScoreboardId}
              >
                {activeSession.players.map((entry, index) => {
                  const lastAnswerAt = entry.lastAnswerAt ?? null;
                  const lastAnswerAge = formatRelativeAge(lastAnswerAt, duelRelativeNow);
                  const lastAnswerStatus =
                    entry.lastAnswerCorrect === true
                      ? 'poprawna'
                      : entry.lastAnswerCorrect === false
                        ? 'błędna'
                        : 'udzielona';
                  const lastAnswerLabel =
                    lastAnswerAt && lastAnswerAge !== 'brak danych'
                      ? `${lastAnswerStatus} • ${lastAnswerAge}`
                      : lastAnswerAt
                      ? lastAnswerAge
                      : 'brak odpowiedzi';
                  const bonusPoints = entry.bonusPoints ?? 0;
                  const totalScore = entry.score + bonusPoints;
                  const scoreDelta =
                    typeof duelTopScore === 'number' ? totalScore - duelTopScore : null;
                  const scoreDeltaLabel =
                    scoreDelta === null
                      ? null
                      : scoreDelta === 0
                        ? 'Remis'
                        : scoreDelta > 0
                          ? `Przewaga: +${scoreDelta}`
                          : `Strata: ${Math.abs(scoreDelta)}`;
                  const seriesWins =
                    activeSession.series?.winsByPlayer?.[entry.learnerId] ?? null;
                  const seriesLabel =
                    activeSession.series ? `Wygrane w serii: ${seriesWins ?? 0}` : null;
                  const connectionStatusLabel =
                    entry.isConnected === true
                      ? 'Online'
                      : entry.isConnected === false
                        ? 'Offline'
                        : 'Brak danych';
                  const joinedLabel = formatRelativeAge(entry.joinedAt, duelRelativeNow);
                  const elapsedLabel = formatElapsedTime(
                    activeSession.startedAt ?? null,
                    entry.completedAt ?? null
                  );
                  const scoreLabel =
                    bonusPoints > 0 ? `${entry.score} (+${bonusPoints} czas)` : `${entry.score}`;
                  const isLeader = duelTopScore !== null && totalScore === duelTopScore;

                  return (
                    <div
                      key={entry.learnerId}
                      className={cn(
                        'rounded-2xl border border-slate-200 bg-white/70 p-4 transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-md focus-within:-translate-y-1 focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none',
                        MOTION_ENTRY_CLASSNAME,
                        entry.learnerId === player?.learnerId && 'ring-2 ring-indigo-200'
                      )}
                      style={{ animationDelay: `${index * 80}ms` }}
                      role='listitem'
                      aria-label={`${entry.displayName}, wynik ${entry.score}, status ${PLAYER_STATUS_LABELS[entry.status]}`}
                    >
                      <div className='flex items-center justify-between kangur-panel-gap'>
                        <div className='space-y-1'>
                          <div className='text-sm font-semibold text-slate-800'>
                            {entry.displayName}
                          </div>
                          <div className='flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500'>
                            <span>Wynik: {scoreLabel}</span>
                            {scoreDeltaLabel ? <span>{scoreDeltaLabel}</span> : null}
                            <span>Ostatnia: {lastAnswerLabel}</span>
                            {elapsedLabel ? <span>Czas: {elapsedLabel}</span> : null}
                            <span>Połączenie: {connectionStatusLabel}</span>
                            <span>Dołączył {joinedLabel}</span>
                            {seriesLabel ? <span>{seriesLabel}</span> : null}
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          {isLeader ? (
                            <KangurStatusChip accent='emerald' size='sm'>
                              Prowadzi
                            </KangurStatusChip>
                          ) : null}
                          <KangurStatusChip accent={resolvePlayerAccent(entry.status)} size='sm'>
                            {PLAYER_STATUS_LABELS[entry.status]}
                          </KangurStatusChip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {player ? (
                <div className='flex flex-col gap-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-xs font-semibold text-slate-500'>Reakcje:</span>
                    {DUEL_REACTION_OPTIONS.map((reaction) => (
                      <KangurButton
                        key={reaction.type}
                        onClick={() => {
                          void handleReaction(reaction.type);
                        }}
                        variant='ghost'
                        size='sm'
                        disabled={isReactionSending}
                        aria-label={reaction.ariaLabel}
                        className='h-9 w-9 rounded-full p-0'
                      >
                        <span className='text-lg'>{reaction.label}</span>
                      </KangurButton>
                    ))}
                  </div>
                  {activeSession.recentReactions && activeSession.recentReactions.length > 0 ? (
                    <div className='flex flex-wrap gap-2 text-xs text-slate-600'>
                      {activeSession.recentReactions.slice(-6).map((reaction) => (
                        <span
                          key={reaction.id}
                          className='flex items-center gap-1 rounded-full bg-white/80 px-3 py-1'
                        >
                          <span className='text-sm'>
                            {DUEL_REACTION_OPTIONS.find((option) => option.type === reaction.type)
                              ?.label ?? '✨'}
                          </span>
                          <span>{reaction.displayName}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeSession.status === 'completed' || activeSession.status === 'aborted' ? (
                <KangurInfoCard
                  accent='indigo'
                  padding='md'
                  tone='accent'
                  className={MOTION_PANEL_CLASSNAME}
                  role='status'
                  aria-live='polite'
                  aria-atomic='true'
                >
                  <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold text-slate-900'>
                      {buildWinnerSummary(activeSession.players)}
                    </div>
                    <div className='text-sm text-slate-600'>
                      {activeSession.status === 'aborted'
                        ? 'Pojedynek został przerwany.'
                        : 'Brawo! Zakończyliście pojedynek.'}
                    </div>
                    {activeSession.series ? (
                      <div className='text-xs text-slate-500'>
                        Seria do {Math.floor(activeSession.series.bestOf / 2) + 1} wygranych •
                        Mecz {activeSession.series.gameIndex} •
                        Rozegrane: {activeSession.series.completedGames}
                      </div>
                    ) : null}
                    <div className='flex flex-col sm:flex-row sm:flex-wrap kangur-panel-gap'>
                      <KangurButton
                        onClick={handleReset}
                        variant='primary'
                        className='w-full sm:w-auto'
                      >
                        Nowy pojedynek
                      </KangurButton>
                      {canRematch ? (
                        <KangurButton
                          onClick={() => {
                            void handleRematch();
                          }}
                          variant='secondary'
                          className='w-full sm:w-auto'
                          disabled={isBusy}
                        >
                          Rewanż
                        </KangurButton>
                      ) : null}
                      <KangurButton
                        onClick={handleReset}
                        variant='ghost'
                        className='w-full sm:w-auto'
                      >
                        Zakończ
                      </KangurButton>
                    </div>
                  </div>
                </KangurInfoCard>
              ) : (
                <div className='relative flex w-full justify-center'>
                  {hasFinishedQuestions ? (
                    <KangurInfoCard
                      accent='indigo'
                      padding='md'
                      tone='accent'
                      className={MOTION_PANEL_CLASSNAME}
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'
                    >
                      Ukończyłeś wszystkie pytania. Twój wynik jest zapisany, pojedynek trwa.
                    </KangurInfoCard>
                  ) : questionCard ? (
                    <div className='transition-opacity motion-safe:duration-300 motion-safe:ease-out'>
                      <QuestionCard
                        question={questionCard}
                        questionNumber={playerQuestionNumber ?? activeSession.currentQuestionIndex + 1}
                        total={activeSession.questionCount}
                        timeLimit={activeSession.timePerQuestionSec}
                        onAnswer={() => undefined}
                        onAnswerChoice={(choice) => {
                          void handleAnswerChoice(choice);
                        }}
                        answerMode='server'
                        serverResult={activeServerResult}
                      />
                    </div>
                  ) : (
                    <KangurInfoCard
                      accent='rose'
                      padding='md'
                      tone='accent'
                      className={MOTION_PANEL_CLASSNAME}
                      role='alert'
                    >
                      Nie udało się załadować pytania pojedynku.
                    </KangurInfoCard>
                  )}
                </div>
              )}

              <div className='flex flex-wrap justify-between kangur-panel-gap'>
                <div className='flex flex-wrap gap-2'>
                  {canLeaveSession ? (
                    <KangurButton
                      onClick={() => {
                        void handleLeave();
                      }}
                      variant='ghost'
                      disabled={isBusy}
                      aria-label='Opuść pojedynek'
                    >
                      Opuść pojedynek
                    </KangurButton>
                  ) : null}
                  {spectateLink ? (
                    <KangurButton
                      onClick={() => {
                        void (async () => {
                          const ok = await copyToClipboard(spectateLink);
                          setSpectateCopyStatus(ok ? 'success' : 'error');
                          window.setTimeout(() => setSpectateCopyStatus('idle'), 2000);
                        })();
                      }}
                      variant='secondary'
                      disabled={spectateCopyStatus === 'success'}
                    >
                      {spectateCopyStatus === 'success'
                        ? 'Skopiowano link'
                        : spectateCopyStatus === 'error'
                          ? 'Nie udało się skopiować'
                          : 'Udostępnij podgląd'}
                    </KangurButton>
                  ) : null}
                </div>
              </div>
            </KangurGlassPanel>
          ) : null}
        </div>
      </KangurPageContainer>
    </KangurPageShell>
  );
}

export default function Duels(): React.JSX.Element {
  return <DuelsContent />;
}
