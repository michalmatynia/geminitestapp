'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import QuestionCard, {
  type QuestionCardQuestion,
  type QuestionCardServerResult,
} from '@/features/kangur/ui/components/QuestionCard';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
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
  KangurStatusChip,
  KangurSelectField,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import type { KangurQuestionChoice } from '@/features/kangur/ui/types';
import type {
  KangurDuelMode,
  KangurDuelPlayer,
  KangurDuelPlayerStatus,
  KangurDuelQuestion,
  KangurDuelLobbyEntry,
  KangurDuelOpponentEntry,
  KangurDuelSearchEntry,
  KangurDuelStateResponse,
  KangurDuelStatus,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';

const kangurPlatform = getKangurPlatform();
const DUEL_POLL_INTERVAL_MS = 2500;
const LOBBY_POLL_INTERVAL_MS = 5000;
const LOBBY_FRESH_WINDOW_MS = 15_000;
const LOBBY_RELATIVE_TIME_TICK_MS = 10_000;
const DUEL_TIMEOUT_CHOICE = '__timeout__';
const DUEL_SEARCH_MIN_CHARS = 2;
const DUEL_SEARCH_DEBOUNCE_MS = 300;

const SESSION_STATUS_LABELS: Record<KangurDuelStatus, string> = {
  created: 'Utworzony',
  waiting: 'Czeka na gracza',
  ready: 'Gotowy do startu',
  in_progress: 'W trakcie',
  completed: 'Zakończony',
  aborted: 'Przerwany',
};

const PLAYER_STATUS_LABELS: Record<KangurDuelPlayerStatus, string> = {
  invited: 'Zaproszony',
  ready: 'Gotowy',
  playing: 'Gra',
  completed: 'Zakończono',
  left: 'Opuścił',
};

const LOBBY_MODE_LABELS: Record<KangurDuelMode, string> = {
  challenge: 'Wyzwanie',
  quick_match: 'Szybki pojedynek',
};

const LOBBY_MODE_ACCENTS: Record<KangurDuelMode, 'indigo' | 'sky'> = {
  challenge: 'indigo',
  quick_match: 'sky',
};

const resolveSessionAccent = (status: KangurDuelStatus): 'emerald' | 'amber' | 'rose' | 'slate' => {
  if (status === 'completed') return 'emerald';
  if (status === 'aborted') return 'rose';
  if (status === 'in_progress') return 'amber';
  if (status === 'ready') return 'amber';
  return 'slate';
};

const resolvePlayerAccent = (
  status: KangurDuelPlayerStatus
): 'emerald' | 'amber' | 'rose' | 'slate' => {
  if (status === 'completed') return 'emerald';
  if (status === 'left') return 'rose';
  if (status === 'playing') return 'amber';
  if (status === 'ready') return 'amber';
  return 'slate';
};

const toQuestionCardQuestion = (
  question: KangurDuelQuestion | null
): QuestionCardQuestion | null => {
  if (!question) return null;
  return {
    id: question.id,
    question: question.prompt,
    choices: question.choices,
  };
};

const buildWinnerSummary = (players: KangurDuelPlayer[]): string => {
  if (players.length === 0) return 'Pojedynek zakończony.';
  if (players.length === 1) {
    const onlyPlayer = players[0];
    return onlyPlayer ? `Wynik: ${onlyPlayer.displayName}` : 'Pojedynek zakończony.';
  }
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  if (!first || !second) {
    return 'Pojedynek zakończony.';
  }
  if (first.score === second.score) {
    return 'Remis!';
  }
  return `Wygrywa ${first.displayName}!`;
};

const resolveLobbyHostInitial = (name: string): string =>
  name.trim().charAt(0).toUpperCase() || '?';

const formatRelativeAge = (isoString: string | null, nowMs: number): string => {
  if (!isoString) {
    return 'brak danych';
  }
  const fromMs = Date.parse(isoString);
  if (!Number.isFinite(fromMs)) {
    return 'brak danych';
  }
  const diffMs = Math.max(0, nowMs - fromMs);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) {
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
};

function DuelsContent(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, isAuthenticated, logout } = useKangurAuth();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const [duelState, setDuelState] = useState<KangurDuelStateResponse | null>(null);
  const [action, setAction] = useState<
    'quick_match' | 'challenge' | 'private' | 'join' | 'leave' | 'answer' | null
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
  const [recentOpponents, setRecentOpponents] = useState<KangurDuelOpponentEntry[]>([]);
  const [opponentsError, setOpponentsError] = useState<string | null>(null);
  const [isOpponentsLoading, setIsOpponentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KangurDuelSearchEntry[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isPageActive, setIsPageActive] = useState(true);
  const [lobbyModeFilter, setLobbyModeFilter] = useState<'all' | KangurDuelMode>('all');
  const [lobbySort, setLobbySort] = useState<
    'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high'
  >('recent');
  const [lobbyLastUpdatedAt, setLobbyLastUpdatedAt] = useState<string | null>(null);
  const [relativeNow, setRelativeNow] = useState(() => Date.now());
  const duelPollingRef = useRef(false);
  const lobbyPollingRef = useRef(false);
  const duelAbortRef = useRef<AbortController | null>(null);
  const lobbyAbortRef = useRef<AbortController | null>(null);
  const opponentsAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const lastSessionUpdatedAtRef = useRef<string | null>(null);
  const lastLobbyHashRef = useRef('');
  const lobbySeenRef = useRef<Map<string, string>>(new Map());
  const lobbyFreshRef = useRef<Map<string, number>>(new Map());

  useKangurRoutePageReady({
    pageKey: 'Duels',
    ready: true,
  });

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
  const waitingHeadingId = useId();
  const duelHeadingId = useId();
  const duelSummaryId = useId();
  const duelScoreboardId = useId();

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

  const session = duelState?.session ?? null;
  const player = duelState?.player ?? null;
  const sessionId = session?.id ?? null;
  const sessionStatus = session?.status ?? null;
  const activeQuestion =
    session?.questions[session.currentQuestionIndex] ?? null;
  const questionCard = useMemo(() => toQuestionCardQuestion(activeQuestion), [activeQuestion]);
  const canPlay = Boolean(isAuthenticated && user?.activeLearner?.id);
  const canBrowseLobby = canPlay && !session;
  const isBusy = action !== null;
  const canLeaveSession = sessionStatus === 'ready' || sessionStatus === 'in_progress';
  const SearchField = KangurTextField;
  const waitingSession = sessionStatus === 'waiting' && session ? session : null;
  const activeSession =
    sessionStatus && sessionStatus !== 'waiting' && session ? session : null;
  const lobbyRefreshSeconds = Math.max(1, Math.round(LOBBY_POLL_INTERVAL_MS / 1000));
  const publicLobbyEntries = useMemo(
    () => lobbyEntries.filter((entry) => entry.visibility !== 'private'),
    [lobbyEntries]
  );
  const inviteLobbyEntries = useMemo(
    () => lobbyEntries.filter((entry) => entry.visibility === 'private'),
    [lobbyEntries]
  );
  const filteredPublicLobbyEntries = useMemo(() => {
    const base =
      lobbyModeFilter === 'all'
        ? publicLobbyEntries
        : publicLobbyEntries.filter((entry) => entry.mode === lobbyModeFilter);
    const withTimestamps = base.map((entry) => ({
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
  }, [lobbyModeFilter, lobbySort, publicLobbyEntries]);
  const trimmedSearchQuery = searchQuery.trim();
  const canShowSearchResults = trimmedSearchQuery.length >= DUEL_SEARCH_MIN_CHARS;
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
  const isLobbyFilterActive = lobbyModeFilter !== 'all';
  const lobbyCountLabel =
    publicLobbyEntries.length > 0
      ? isLobbyFilterActive
        ? `${filteredPublicLobbyEntries.length} z ${publicLobbyEntries.length} oczekujących`
        : `${publicLobbyEntries.length} oczekujących`
      : isLobbyLoading
        ? 'Ładowanie lobby'
        : 'Brak wyzwań';
  const hasAnyPublicLobbyEntries = publicLobbyEntries.length > 0;
  const hasVisiblePublicLobbyEntries = filteredPublicLobbyEntries.length > 0;
  const awaitingOpponent =
    Boolean(activeQuestion) &&
    pendingQuestionId === activeQuestion?.id &&
    (session?.status === 'ready' || session?.status === 'in_progress');
  const searchDescribedBy = searchError ? `${searchHintId} ${searchErrorId}` : searchHintId;

  useEffect(() => {
    setAnswerResult(null);
    lastAnswerMetaRef.current = null;
  }, [sessionId]);
  const activeServerResult = useMemo<QuestionCardServerResult | null>(() => {
    if (!activeQuestion || !answerResult) return null;
    if (answerResult.questionId !== activeQuestion.id) return null;
    return { correct: answerResult.correct, timedOut: answerResult.timedOut };
  }, [activeQuestion, answerResult]);

  const runAction = useCallback(
    async (nextAction: typeof action, task: () => Promise<KangurDuelStateResponse>) => {
      setAction(nextAction);
      setError(null);
      try {
        const response = await task();
        setDuelState(response);
        return response;
      } catch (err: unknown) {
        logClientError(err);
        setError('Nie udało się połączyć z pojedynkiem. Spróbuj ponownie.');
        return null;
      } finally {
        setAction(null);
      }
    },
    []
  );

  const handleQuickMatch = useCallback(async () => {
    await runAction('quick_match', () =>
      kangurPlatform.duels.join({ mode: 'quick_match' })
    );
  }, [runAction]);

  const handleCreateChallenge = useCallback(async () => {
    await runAction('challenge', () =>
      kangurPlatform.duels.create({ mode: 'challenge', visibility: 'public' })
    );
  }, [runAction]);

  const handleInviteByLearnerId = useCallback(
    async (learnerId: string) => {
      const response = await runAction('private', () =>
        kangurPlatform.duels.create({
          mode: 'challenge',
          visibility: 'private',
          opponentLearnerId: learnerId,
        })
      );
      if (response) {
        setError(null);
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(null);
      }
    },
    [runAction]
  );

  const handleInviteOpponent = useCallback(
    async (opponent: KangurDuelOpponentEntry) =>
      handleInviteByLearnerId(opponent.learnerId),
    [handleInviteByLearnerId]
  );

  const loadLobby = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
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
        setRelativeNow(Date.now());
        return;
      }

      if (lobbyPollingRef.current) {
        if (!showLoading) {
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
      try {
        const response = await kangurPlatform.duels.lobby({
          limit: 12,
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
      } catch (err: unknown) {
        if (isAbortLikeError(err, controller.signal)) {
          return;
        }
        logClientError(err);
        setLobbyError('Nie udało się pobrać lobby. Spróbuj ponownie.');
      } finally {
        if (lobbyAbortRef.current === controller) {
          lobbyAbortRef.current = null;
          lobbyPollingRef.current = false;
          if (showLoading) {
            setIsLobbyLoading(false);
          }
        }
      }
    },
    [canBrowseLobby]
  );

  const loadOpponents = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!canBrowseLobby) {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
        setRecentOpponents([]);
        setOpponentsError(null);
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
      try {
        const response = await kangurPlatform.duels.recentOpponents({
          limit: 8,
          signal: controller.signal,
        });
        setRecentOpponents(response.entries);
      } catch (err: unknown) {
        if (isAbortLikeError(err, controller.signal)) {
          return;
        }
        logClientError(err);
        setOpponentsError('Nie udało się pobrać listy rywali. Spróbuj ponownie.');
      } finally {
        if (opponentsAbortRef.current === controller) {
          opponentsAbortRef.current = null;
          if (showLoading) {
            setIsOpponentsLoading(false);
          }
        }
      }
    },
    [canBrowseLobby]
  );

  const handleLeave = useCallback(async () => {
    if (!session) return;
    await runAction('leave', () =>
      kangurPlatform.duels.leave({ sessionId: session.id, reason: 'user_exit' })
    );
  }, [runAction, session]);

  const handleJoinLobbySession = useCallback(
    async (sessionId: string) => {
      await runAction('join', () => kangurPlatform.duels.join({ sessionId }));
    },
    [runAction]
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
      const response = await runAction('answer', () =>
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
    const currentId = session.questions[session.currentQuestionIndex]?.id ?? null;
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
  }, [pendingQuestionId, session]);

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
    lastSessionUpdatedAtRef.current = session?.updatedAt ?? null;
  }, [session?.updatedAt]);

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
    if (!canBrowseLobby) {
      void loadLobby();
      return;
    }

    if (!isPageActive) {
      lobbyAbortRef.current?.abort();
      lobbyAbortRef.current = null;
      lobbyPollingRef.current = false;
      setIsLobbyLoading(false);
      return;
    }

    void loadLobby({ showLoading: true });
    const intervalId = window.setInterval(() => {
      void loadLobby();
    }, LOBBY_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      lobbyAbortRef.current?.abort();
      lobbyAbortRef.current = null;
      lobbyPollingRef.current = false;
    };
  }, [canBrowseLobby, isPageActive, loadLobby]);

  useEffect(() => {
    if (!canBrowseLobby) {
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
  }, [canBrowseLobby, isPageActive, loadOpponents]);

  useEffect(() => {
    if (!canBrowseLobby) {
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
    if (trimmed.length < DUEL_SEARCH_MIN_CHARS) {
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

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setSearchError(null);

    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const response = await kangurPlatform.duels.search(trimmed, {
          limit: 8,
          signal: controller.signal,
        });
        setSearchResults(response.entries);
      } catch (err: unknown) {
        if (isAbortLikeError(err, controller.signal)) {
          return;
        }
        logClientError(err);
        setSearchError('Nie udało się wyszukać uczniów. Spróbuj ponownie.');
      } finally {
        if (searchAbortRef.current === controller) {
          searchAbortRef.current = null;
          setIsSearching(false);
        }
      }
    }, DUEL_SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
    };
  }, [canBrowseLobby, searchQuery]);

  useEffect(() => {
    if (!sessionId) {
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
      return;
    }
    if (!['waiting', 'ready', 'in_progress'].includes(sessionStatus ?? '')) {
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
      return;
    }
    if (!isPageActive) {
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
      try {
        const nextState = await kangurPlatform.duels.state(sessionId, {
          signal: controller.signal,
        });
        const nextUpdatedAt = nextState.session.updatedAt ?? null;
        if (nextUpdatedAt && nextUpdatedAt === lastSessionUpdatedAtRef.current) {
          return;
        }
        lastSessionUpdatedAtRef.current = nextUpdatedAt;
        setDuelState(nextState);
      } catch (err: unknown) {
        if (isAbortLikeError(err, controller.signal)) {
          return;
        }
        logClientError(err);
      } finally {
        if (duelAbortRef.current === controller) {
          duelAbortRef.current = null;
          duelPollingRef.current = false;
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void pollDuelState();
    }, DUEL_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      duelAbortRef.current?.abort();
      duelAbortRef.current = null;
      duelPollingRef.current = false;
    };
  }, [isPageActive, sessionId, sessionStatus]);

  return (
    <KangurPageShell id='kangur-duels-page' skipLinkTargetId='kangur-duels-main'>
      <KangurTopNavigationController navigation={navigation} />
      <KangurPageContainer as='section' data-kangur-route-main='true' id='kangur-duels-main'>
        <div className='flex flex-col gap-6'>
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
              description='Zaloguj się jako uczeń, aby dołączyć do pojedynków.'
            >
              <div className='flex flex-wrap justify-center gap-3'>
                <KangurButton onClick={() => openLoginModal(null)} size='lg' variant='primary'>
                  Zaloguj się
                </KangurButton>
                <KangurButton
                  onClick={() => openLoginModal(null, { authMode: 'create-account' })}
                  size='lg'
                  variant='secondary'
                >
                  Utwórz konto
                </KangurButton>
              </div>
            </KangurEmptyState>
          ) : null}

          {canPlay && !session ? (
            <>
              <KangurGlassPanel
                className='flex flex-col gap-6'
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
                <div className='flex flex-wrap gap-3'>
                  <KangurButton
                    onClick={() => {
                      void handleQuickMatch();
                    }}
                    size='lg'
                    variant='primary'
                    disabled={isBusy}
                    aria-busy={action === 'quick_match'}
                    aria-live='polite'
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
                  >
                    {action === 'challenge' ? 'Tworzymy wyzwanie…' : 'Publiczne wyzwanie'}
                  </KangurButton>
                </div>
                <div
                  className='flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4'
                  role='region'
                  aria-labelledby={opponentsHeadingId}
                  aria-busy={isOpponentsLoading}
                >
                  <div className='flex flex-wrap items-center justify-between gap-3'>
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
                          >
                            Zaproś {opponent.displayName}
                          </KangurButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  className='flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4'
                  role='region'
                  aria-labelledby={searchHeadingId}
                  aria-busy={isSearching}
                  data-search-state={searchStateSignature}
                >
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div id={searchHeadingId} className='text-sm font-semibold text-slate-800'>
                      Znajdź ucznia
                    </div>
                    <KangurStatusChip accent='slate' size='sm'>
                      Min {DUEL_SEARCH_MIN_CHARS} znaki
                    </KangurStatusChip>
                  </div>
                  <SearchField
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder='Szukaj po loginie lub imieniu'
                    aria-label='Szukaj ucznia do prywatnego pojedynku'
                    aria-describedby={searchDescribedBy}
                    aria-controls={searchResultsListId}
                    autoComplete='off'
                  />
                  <div id={searchHintId} className='text-xs text-slate-500'>
                    Wpisz co najmniej {DUEL_SEARCH_MIN_CHARS} znaki, aby zobaczyć wyniki.
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
                      <ul className='grid gap-2 sm:grid-cols-2' role='list' aria-label='Wyniki wyszukiwania uczniów'>
                        {searchResults.map((entry) => (
                          <li key={entry.learnerId}>
                            <KangurInfoCard
                              accent='slate'
                              padding='md'
                              tone='neutral'
                              className='flex items-center justify-between gap-3'
                              role='group'
                              aria-label={`Zaproś ucznia ${entry.displayName} (${entry.loginName})`}
                            >
                              <div>
                                <div className='text-sm font-semibold text-slate-800'>
                                  {entry.displayName}
                                </div>
                                <div className='text-xs text-slate-500'>{entry.loginName}</div>
                              </div>
                      <KangurButton
                        onClick={() => {
                          void handleInviteByLearnerId(entry.learnerId);
                        }}
                        variant='secondary'
                        disabled={isBusy}
                        aria-label={`Zaproś ucznia ${entry.displayName}`}
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

              {inviteLobbyEntries.length > 0 ? (
                <KangurGlassPanel
                  className='flex flex-col gap-4'
                  padding='lg'
                  surface='solid'
                  role='region'
                  aria-labelledby={inviteHeadingId}
                >
                  <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div className='space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3
                          id={inviteHeadingId}
                          className='text-xl font-semibold text-slate-900'
                        >
                          Zaproszenia
                        </h3>
                        <KangurStatusChip accent='indigo' size='sm'>
                          {inviteLobbyEntries.length}
                        </KangurStatusChip>
                      </div>
                      <p className='text-sm text-slate-600'>
                        Prywatne pojedynki, do których zostałeś zaproszony.
                      </p>
                    </div>
                  </div>

                  <ul
                    className='grid gap-3 sm:grid-cols-2'
                    role='list'
                    aria-label='Zaproszenia prywatne'
                    id={inviteListId}
                  >
                    {inviteLobbyEntries.map((entry) => {
                      const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
                      const freshAt = lobbyFreshRef.current.get(entry.sessionId);
                      const isFresh =
                        typeof freshAt === 'number' &&
                        relativeNow - freshAt < LOBBY_FRESH_WINDOW_MS;
                      const updatedLabel = formatRelativeAge(entry.updatedAt, relativeNow);
                      return (
                        <li key={entry.sessionId}>
                          <KangurInfoCard
                            accent='indigo'
                            padding='md'
                            tone='accent'
                            className={cn(
                              'flex flex-col gap-3',
                              isFresh && 'ring-2 ring-emerald-200/70'
                            )}
                            role='group'
                            aria-label={`Prywatne zaproszenie od ${entry.host.displayName}. ${entry.questionCount} pytań, ${entry.timePerQuestionSec} sekund na pytanie.`}
                          >
                            <div className='flex flex-wrap items-start justify-between gap-3'>
                              <div className='flex items-center gap-3'>
                                <div
                                  className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-extrabold text-indigo-700'
                                  aria-hidden='true'
                                >
                                  {hostInitial}
                                </div>
                                <div>
                                  <div className='text-sm font-semibold text-slate-800'>
                                    {entry.host.displayName}
                                  </div>
                                  <div className='text-xs text-slate-500'>
                                    Zaproszenie prywatne • {updatedLabel}
                                  </div>
                                </div>
                              </div>
                              <KangurButton
                                onClick={() => {
                                  void handleJoinLobbySession(entry.sessionId);
                                }}
                                variant='primary'
                                disabled={isBusy}
                                aria-label={`Dołącz do prywatnego pojedynku z ${entry.host.displayName}`}
                              >
                                Dołącz
                              </KangurButton>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                              <KangurStatusChip
                                accent={resolveSessionAccent(entry.status)}
                                size='sm'
                              >
                                {SESSION_STATUS_LABELS[entry.status]}
                              </KangurStatusChip>
                              {isFresh ? (
                                <KangurStatusChip accent='emerald' size='sm'>
                                  Nowe
                                </KangurStatusChip>
                              ) : null}
                              <KangurStatusChip accent='indigo' size='sm'>
                                Prywatny
                              </KangurStatusChip>
                              <KangurStatusChip accent='slate' size='sm'>
                                {entry.questionCount} pytań
                              </KangurStatusChip>
                              <KangurStatusChip accent='slate' size='sm'>
                                {entry.timePerQuestionSec}s
                              </KangurStatusChip>
                            </div>
                          </KangurInfoCard>
                        </li>
                      );
                    })}
                  </ul>
                </KangurGlassPanel>
              ) : null}

              <KangurGlassPanel
                className='flex flex-col gap-4'
                padding='lg'
                surface='solid'
                role='region'
                aria-labelledby={lobbyHeadingId}
                aria-describedby={lobbyDescriptionId}
                aria-busy={isLobbyLoading}
              >
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <div className='space-y-1'>
                    <div
                      className='flex flex-wrap items-center gap-2'
                      aria-live='polite'
                      aria-atomic='true'
                    >
                      <h3
                        id={lobbyHeadingId}
                        className='text-xl font-semibold text-slate-900'
                      >
                        Lobby pojedynków
                      </h3>
                      <KangurStatusChip
                        accent={lobbyEntries.length > 0 ? 'emerald' : 'slate'}
                        size='sm'
                      >
                        {lobbyCountLabel}
                      </KangurStatusChip>
                    </div>
                    <p id={lobbyDescriptionId} className='text-sm text-slate-600'>
                      Wybierz ucznia, który czeka na pojedynek albo dodaj własne wyzwanie.
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {lobbyLastUpdatedAt ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        Aktualizacja {formatRelativeAge(lobbyLastUpdatedAt, relativeNow)}
                      </KangurStatusChip>
                    ) : null}
                    <KangurStatusChip accent='slate' size='sm'>
                      Auto co {lobbyRefreshSeconds}s
                    </KangurStatusChip>
                    <KangurButton
                      onClick={() => {
                        void loadLobby({ showLoading: true });
                      }}
                      variant='ghost'
                      disabled={isLobbyLoading}
                      aria-label='Odśwież lobby pojedynków'
                      aria-busy={isLobbyLoading}
                      aria-live='polite'
                    >
                      {isLobbyLoading ? 'Odświeżamy…' : 'Odśwież'}
                    </KangurButton>
                  </div>
                </div>

                <div className='flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-3'>
                  <div className='min-w-[180px] space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                      Tryb
                    </div>
                    <KangurSelectField
                      value={lobbyModeFilter}
                      onChange={(event) =>
                        setLobbyModeFilter(event.target.value as 'all' | KangurDuelMode)
                      }
                      aria-label='Filtruj lobby po trybie pojedynku'
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>Wszystkie tryby</option>
                      <option value='challenge'>Wyzwania</option>
                      <option value='quick_match'>Szybkie pojedynki</option>
                    </KangurSelectField>
                  </div>
                  <div className='min-w-[200px] space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                      Sortowanie
                    </div>
                    <KangurSelectField
                      value={lobbySort}
                      onChange={(event) =>
                        setLobbySort(
                          event.target.value as
                            | 'recent'
                            | 'time_fast'
                            | 'time_slow'
                            | 'questions_low'
                            | 'questions_high'
                        )
                      }
                      aria-label='Sortuj publiczne pojedynki'
                      size='sm'
                      accent='slate'
                    >
                      <option value='recent'>Najświeższe</option>
                      <option value='time_fast'>Najkrótszy czas</option>
                      <option value='time_slow'>Najdłuższy czas</option>
                      <option value='questions_low'>Najmniej pytań</option>
                      <option value='questions_high'>Najwięcej pytań</option>
                    </KangurSelectField>
                  </div>
                  {publicLobbyEntries.length > 0 ? (
                    <div className='text-xs text-slate-500'>
                      Widocznych: {filteredPublicLobbyEntries.length}
                    </div>
                  ) : null}
                </div>

                {lobbyError ? (
                  <KangurInfoCard
                    accent='rose'
                    padding='md'
                    tone='accent'
                    role='alert'
                    aria-live='assertive'
                  >
                    {lobbyError}
                  </KangurInfoCard>
                ) : null}

                {isLobbyLoading && !hasAnyPublicLobbyEntries ? (
                  <div className='grid gap-3 sm:grid-cols-2' role='status' aria-live='polite'>
                    <span className='sr-only'>Ładowanie lobby pojedynków…</span>
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={`lobby-skeleton-${index}`}
                        className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 animate-pulse'
                        aria-hidden='true'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='h-12 w-12 rounded-2xl bg-slate-200/70' />
                          <div className='space-y-2'>
                            <div className='h-4 w-28 rounded-full bg-slate-200/70' />
                            <div className='h-3 w-36 rounded-full bg-slate-200/60' />
                          </div>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <div className='h-6 w-20 rounded-full bg-slate-200/60' />
                          <div className='h-6 w-24 rounded-full bg-slate-200/60' />
                          <div className='h-6 w-16 rounded-full bg-slate-200/60' />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !hasAnyPublicLobbyEntries ? (
                  <KangurInfoCard
                    accent='slate'
                    padding='md'
                    tone='accent'
                    role='status'
                    aria-live='polite'
                  >
                    <div className='flex flex-col gap-3'>
                      <div className='text-sm text-slate-700'>
                        Brak uczniów oczekujących na pojedynek.
                      </div>
                      <KangurButton
                        onClick={() => {
                          void handleCreateChallenge();
                        }}
                        variant='secondary'
                        disabled={isBusy}
                      >
                        Stwórz własne wyzwanie
                      </KangurButton>
                    </div>
                  </KangurInfoCard>
                ) : !hasVisiblePublicLobbyEntries ? (
                  <KangurInfoCard
                    accent='slate'
                    padding='md'
                    tone='accent'
                    role='status'
                    aria-live='polite'
                  >
                    <div className='flex flex-col gap-3'>
                      <div className='text-sm text-slate-700'>
                        Brak wyzwań dla wybranego filtra.
                      </div>
                      <KangurButton
                        onClick={() => {
                          setLobbyModeFilter('all');
                          setLobbySort('recent');
                        }}
                        variant='ghost'
                        disabled={isBusy}
                      >
                        Pokaż wszystkie
                      </KangurButton>
                    </div>
                  </KangurInfoCard>
                ) : (
                  <ul
                    className='grid gap-3 sm:grid-cols-2'
                    role='list'
                    aria-label='Publiczne pojedynki'
                    id={lobbyListId}
                  >
                    {filteredPublicLobbyEntries.map((entry) => {
                      const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
                      const freshAt = lobbyFreshRef.current.get(entry.sessionId);
                      const isFresh =
                        typeof freshAt === 'number' &&
                        relativeNow - freshAt < LOBBY_FRESH_WINDOW_MS;
                      const updatedLabel = formatRelativeAge(entry.updatedAt, relativeNow);
                      return (
                        <li key={entry.sessionId}>
                          <KangurInfoCard
                            accent='slate'
                            padding='md'
                            tone='neutral'
                            className={cn(
                              'flex flex-col gap-3',
                              isFresh && 'ring-2 ring-emerald-200/70'
                            )}
                            role='group'
                            aria-label={`Publiczne wyzwanie od ${entry.host.displayName}. ${entry.questionCount} pytań, ${entry.timePerQuestionSec} sekund na pytanie.`}
                          >
                            <div className='flex flex-wrap items-start justify-between gap-3'>
                              <div className='flex items-center gap-3'>
                                <div
                                  className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-extrabold text-indigo-700'
                                  aria-hidden='true'
                                >
                                  {hostInitial}
                                </div>
                                <div>
                                  <div className='text-sm font-semibold text-slate-800'>
                                    {entry.host.displayName}
                                  </div>
                                  <div className='text-xs text-slate-500'>
                                    Czeka na przeciwnika • {updatedLabel}
                                  </div>
                                </div>
                              </div>
                              <KangurButton
                                onClick={() => {
                                  void handleJoinLobbySession(entry.sessionId);
                                }}
                                variant='secondary'
                                disabled={isBusy}
                                aria-label={`Dołącz do pojedynku z ${entry.host.displayName}`}
                              >
                                Dołącz
                              </KangurButton>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                              <KangurStatusChip
                                accent={resolveSessionAccent(entry.status)}
                                size='sm'
                              >
                                {SESSION_STATUS_LABELS[entry.status]}
                              </KangurStatusChip>
                              {isFresh ? (
                                <KangurStatusChip accent='emerald' size='sm'>
                                  Nowe
                                </KangurStatusChip>
                              ) : null}
                              <KangurStatusChip
                                accent={LOBBY_MODE_ACCENTS[entry.mode]}
                                size='sm'
                              >
                                {LOBBY_MODE_LABELS[entry.mode]}
                              </KangurStatusChip>
                              <KangurStatusChip accent='slate' size='sm'>
                                Publiczny
                              </KangurStatusChip>
                              <KangurStatusChip accent='slate' size='sm'>
                                {entry.questionCount} pytań
                              </KangurStatusChip>
                              <KangurStatusChip accent='slate' size='sm'>
                                {entry.timePerQuestionSec}s
                              </KangurStatusChip>
                            </div>
                          </KangurInfoCard>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </KangurGlassPanel>
            </>
          ) : null}

          {canPlay && waitingSession ? (
            <KangurGlassPanel
              className='flex flex-col gap-4'
              padding='lg'
              surface='solid'
              role='region'
              aria-labelledby={waitingHeadingId}
            >
              <div className='flex flex-wrap items-center justify-between gap-3'>
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
                <KangurStatusChip accent={resolveSessionAccent(waitingSession.status)} size='sm'>
                  {SESSION_STATUS_LABELS[waitingSession.status]}
                </KangurStatusChip>
              </div>
              <div className='flex flex-wrap gap-3'>
                <KangurButton
                  onClick={() => {
                    void handleLeave();
                  }}
                  variant='ghost'
                  disabled={isBusy}
                >
                  Anuluj pojedynek
                </KangurButton>
              </div>
            </KangurGlassPanel>
          ) : null}

          {canPlay && activeSession ? (
            <KangurGlassPanel
              className='flex flex-col gap-4'
              padding='lg'
              surface='solid'
              role='region'
              aria-labelledby={duelHeadingId}
              aria-describedby={duelSummaryId}
              aria-busy={awaitingOpponent}
            >
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h3 id={duelHeadingId} className='text-xl font-semibold text-slate-900'>
                    Pojedynek
                  </h3>
                  <p id={duelSummaryId} className='text-sm text-slate-600' aria-live='polite'>
                    Pytanie {activeSession.currentQuestionIndex + 1} z {activeSession.questionCount}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <KangurStatusChip accent={resolveSessionAccent(activeSession.status)} size='sm'>
                    {SESSION_STATUS_LABELS[activeSession.status]}
                  </KangurStatusChip>
                  <KangurStatusChip accent='slate' size='sm'>
                    ⏱ {activeSession.timePerQuestionSec}s
                  </KangurStatusChip>
                </div>
              </div>

              <div
                className='grid gap-3 sm:grid-cols-2'
                role='list'
                aria-label='Wyniki graczy'
                id={duelScoreboardId}
              >
                {activeSession.players.map((entry) => (
                  <div
                    key={entry.learnerId}
                    className={cn(
                      'rounded-2xl border border-slate-200 bg-white/70 p-4',
                      entry.learnerId === player?.learnerId && 'ring-2 ring-indigo-200'
                    )}
                    role='listitem'
                    aria-label={`${entry.displayName}, wynik ${entry.score}, status ${PLAYER_STATUS_LABELS[entry.status]}`}
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <div className='text-sm font-semibold text-slate-800'>
                          {entry.displayName}
                        </div>
                        <div className='text-xs text-slate-500'>Wynik: {entry.score}</div>
                      </div>
                      <KangurStatusChip accent={resolvePlayerAccent(entry.status)} size='sm'>
                        {PLAYER_STATUS_LABELS[entry.status]}
                      </KangurStatusChip>
                    </div>
                  </div>
                ))}
              </div>

              {activeSession.status === 'completed' || activeSession.status === 'aborted' ? (
                <KangurInfoCard
                  accent='indigo'
                  padding='md'
                  tone='accent'
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
                    <div className='flex flex-wrap gap-3'>
                      <KangurButton onClick={handleReset} variant='primary'>
                        Nowy pojedynek
                      </KangurButton>
                      <KangurButton onClick={handleReset} variant='ghost'>
                        Zakończ
                      </KangurButton>
                    </div>
                  </div>
                </KangurInfoCard>
              ) : (
                <div className='relative flex w-full justify-center'>
                  {questionCard ? (
                    <div className={cn('transition-opacity', awaitingOpponent && 'opacity-60')}>
                      <QuestionCard
                        question={questionCard}
                        questionNumber={activeSession.currentQuestionIndex + 1}
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
                    <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert'>
                      Nie udało się załadować pytania pojedynku.
                    </KangurInfoCard>
                  )}
                  {awaitingOpponent ? (
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div
                        className='rounded-2xl bg-white/90 px-6 py-4 text-sm font-semibold text-slate-700 shadow-lg'
                        role='status'
                        aria-live='polite'
                        aria-atomic='true'
                      >
                        Czekamy na odpowiedź przeciwnika…
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className='flex flex-wrap justify-between gap-3'>
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
