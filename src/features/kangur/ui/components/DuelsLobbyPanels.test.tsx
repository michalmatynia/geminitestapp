/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KangurDuelLobbyEntry } from '@/features/kangur/shared/contracts/kangur-duels';

const {
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => globalThis.__kangurClientErrorMocks());

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { DuelsLobbyPanels } from '@/features/kangur/ui/components/DuelsLobbyPanels';

const buildEntry = (overrides: Partial<KangurDuelLobbyEntry> = {}): KangurDuelLobbyEntry => ({
  sessionId: overrides.sessionId ?? 'duel-1',
  mode: overrides.mode ?? 'challenge',
  visibility: overrides.visibility ?? 'public',
  operation: overrides.operation ?? 'addition',
  difficulty: overrides.difficulty ?? 'easy',
  status: overrides.status ?? 'waiting',
  createdAt: overrides.createdAt ?? '2026-03-16T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-16T12:00:00.000Z',
  questionCount: overrides.questionCount ?? 5,
  timePerQuestionSec: overrides.timePerQuestionSec ?? 15,
  host: overrides.host ?? {
    learnerId: 'learner-1',
    displayName: 'Ada',
    status: 'ready',
    score: 0,
    joinedAt: '2026-03-16T10:00:00.000Z',
    lastAnswerAt: null,
    lastAnswerQuestionId: null,
    lastAnswerCorrect: null,
  },
  series: overrides.series ?? null,
});

describe('DuelsLobbyPanels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles refresh and filter controls', () => {
    const loadLobby = vi.fn().mockResolvedValue(undefined);
    const setLobbyModeFilter = vi.fn();
    const setLobbyOperationFilter = vi.fn();
    const setLobbyDifficultyFilter = vi.fn();
    const setLobbySort = vi.fn();

    render(
      <DuelsLobbyPanels
        inviteLobbyEntries={[]}
        inviteHeadingId='invite-heading'
        inviteListId='invite-list'
        lobbyHeadingId='lobby-heading'
        lobbyDescriptionId='lobby-description'
        lobbyListId='lobby-list'
        lobbyEntries={[buildEntry()]}
        lobbyCountLabel='1 aktywny'
        lobbyLastUpdatedAt='2026-03-16T12:00:00.000Z'
        relativeNow={Date.now()}
        lobbyRefreshSeconds={5}
        lobbyStreamStatus='connected'
        loadLobby={loadLobby}
        isLobbyLoading={false}
        lobbyModeFilter='all'
        setLobbyModeFilter={setLobbyModeFilter}
        lobbyOperationFilter='all'
        setLobbyOperationFilter={setLobbyOperationFilter}
        lobbyDifficultyFilter='all'
        setLobbyDifficultyFilter={setLobbyDifficultyFilter}
        lobbySort='recent'
        setLobbySort={setLobbySort}
        publicLobbyEntries={[buildEntry()]}
        filteredPublicLobbyEntries={[buildEntry()]}
        hasAnyPublicLobbyEntries
        hasVisiblePublicLobbyEntries
        lobbyError={null}
        isBusy={false}
        joiningSessionId={null}
        isPageActive
        isOnline
        isLobbyStale={false}
        canJoinLobby
        onRequireLogin={vi.fn()}
        handleJoinLobbySession={vi.fn().mockResolvedValue(undefined)}
        handleCreateChallenge={vi.fn().mockResolvedValue(undefined)}
        lobbyFreshRef={{ current: new Map() }}
        lobbyFreshWindowMs={15_000}
      />
    );

    fireEvent.change(screen.getByLabelText('Filtruj lobby po trybie pojedynku'), {
      target: { value: 'challenge' },
    });
    expect(setLobbyModeFilter).toHaveBeenCalledWith('challenge');

    fireEvent.change(screen.getByLabelText('Filtruj lobby po dzialaniu'), {
      target: { value: 'multiplication' },
    });
    expect(setLobbyOperationFilter).toHaveBeenCalledWith('multiplication');

    fireEvent.change(screen.getByLabelText('Filtruj lobby po poziomie'), {
      target: { value: 'hard' },
    });
    expect(setLobbyDifficultyFilter).toHaveBeenCalledWith('hard');

    fireEvent.change(screen.getByLabelText('Sortuj publiczne pojedynki'), {
      target: { value: 'time_fast' },
    });
    expect(setLobbySort).toHaveBeenCalledWith('time_fast');

    fireEvent.click(screen.getByRole('button', { name: 'Odswiez lobby pojedynkow' }));
    expect(loadLobby).toHaveBeenCalledWith({ showLoading: true });
  });

  it('marks fresh lobby entries with a Nowe chip', () => {
    const entry = buildEntry({ sessionId: 'duel-fresh' });
    const lobbyFreshRef = { current: new Map<string, number>([['duel-fresh', Date.now()]]) };

    render(
      <DuelsLobbyPanels
        inviteLobbyEntries={[]}
        inviteHeadingId='invite-heading'
        inviteListId='invite-list'
        lobbyHeadingId='lobby-heading'
        lobbyDescriptionId='lobby-description'
        lobbyListId='lobby-list'
        lobbyEntries={[entry]}
        lobbyCountLabel='1 aktywny'
        lobbyLastUpdatedAt={null}
        relativeNow={Date.now()}
        lobbyRefreshSeconds={5}
        lobbyStreamStatus='idle'
        loadLobby={vi.fn().mockResolvedValue(undefined)}
        isLobbyLoading={false}
        lobbyModeFilter='all'
        setLobbyModeFilter={vi.fn()}
        lobbyOperationFilter='all'
        setLobbyOperationFilter={vi.fn()}
        lobbyDifficultyFilter='all'
        setLobbyDifficultyFilter={vi.fn()}
        lobbySort='recent'
        setLobbySort={vi.fn()}
        publicLobbyEntries={[entry]}
        filteredPublicLobbyEntries={[entry]}
        hasAnyPublicLobbyEntries
        hasVisiblePublicLobbyEntries
        lobbyError={null}
        isBusy={false}
        joiningSessionId={null}
        isPageActive
        isOnline
        isLobbyStale={false}
        canJoinLobby
        onRequireLogin={vi.fn()}
        handleJoinLobbySession={vi.fn().mockResolvedValue(undefined)}
        handleCreateChallenge={vi.fn().mockResolvedValue(undefined)}
        lobbyFreshRef={lobbyFreshRef}
        lobbyFreshWindowMs={15_000}
      />
    );

    expect(screen.getAllByText('Nowe').length).toBeGreaterThan(0);
  });

  it('prompts guests to log in and tracks the click', () => {
    const onRequireLogin = vi.fn();

    render(
      <DuelsLobbyPanels
        inviteLobbyEntries={[]}
        inviteHeadingId='invite-heading'
        inviteListId='invite-list'
        lobbyHeadingId='lobby-heading'
        lobbyDescriptionId='lobby-description'
        lobbyListId='lobby-list'
        lobbyEntries={[]}
        lobbyCountLabel='0 aktywnych'
        lobbyLastUpdatedAt={null}
        relativeNow={Date.now()}
        lobbyRefreshSeconds={5}
        lobbyStreamStatus='idle'
        loadLobby={vi.fn().mockResolvedValue(undefined)}
        isLobbyLoading={false}
        lobbyModeFilter='all'
        setLobbyModeFilter={vi.fn()}
        lobbyOperationFilter='all'
        setLobbyOperationFilter={vi.fn()}
        lobbyDifficultyFilter='all'
        setLobbyDifficultyFilter={vi.fn()}
        lobbySort='recent'
        setLobbySort={vi.fn()}
        publicLobbyEntries={[]}
        filteredPublicLobbyEntries={[]}
        hasAnyPublicLobbyEntries={false}
        hasVisiblePublicLobbyEntries={false}
        lobbyError={null}
        isBusy={false}
        joiningSessionId={null}
        isPageActive
        isOnline
        isLobbyStale={false}
        canJoinLobby={false}
        onRequireLogin={onRequireLogin}
        handleJoinLobbySession={vi.fn().mockResolvedValue(undefined)}
        handleCreateChallenge={vi.fn().mockResolvedValue(undefined)}
        lobbyFreshRef={{ current: new Map() }}
        lobbyFreshWindowMs={15_000}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj sie, aby zagrac' }));
    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_duels_lobby_login_clicked',
      expect.objectContaining({ source: 'banner', isGuest: true })
    );
  });

  it('joins a public lobby entry when allowed', () => {
    const handleJoinLobbySession = vi.fn().mockResolvedValue(undefined);
    const entry = buildEntry({ sessionId: 'duel-join' });

    render(
      <DuelsLobbyPanels
        inviteLobbyEntries={[]}
        inviteHeadingId='invite-heading'
        inviteListId='invite-list'
        lobbyHeadingId='lobby-heading'
        lobbyDescriptionId='lobby-description'
        lobbyListId='lobby-list'
        lobbyEntries={[entry]}
        lobbyCountLabel='1 aktywny'
        lobbyLastUpdatedAt={null}
        relativeNow={Date.now()}
        lobbyRefreshSeconds={5}
        lobbyStreamStatus='idle'
        loadLobby={vi.fn().mockResolvedValue(undefined)}
        isLobbyLoading={false}
        lobbyModeFilter='all'
        setLobbyModeFilter={vi.fn()}
        lobbyOperationFilter='all'
        setLobbyOperationFilter={vi.fn()}
        lobbyDifficultyFilter='all'
        setLobbyDifficultyFilter={vi.fn()}
        lobbySort='recent'
        setLobbySort={vi.fn()}
        publicLobbyEntries={[entry]}
        filteredPublicLobbyEntries={[entry]}
        hasAnyPublicLobbyEntries
        hasVisiblePublicLobbyEntries
        lobbyError={null}
        isBusy={false}
        joiningSessionId={null}
        isPageActive
        isOnline
        isLobbyStale={false}
        canJoinLobby
        onRequireLogin={vi.fn()}
        handleJoinLobbySession={handleJoinLobbySession}
        handleCreateChallenge={vi.fn().mockResolvedValue(undefined)}
        lobbyFreshRef={{ current: new Map() }}
        lobbyFreshWindowMs={15_000}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dolacz do pojedynku z Ada' }));
    expect(handleJoinLobbySession).toHaveBeenCalledWith('duel-join');
  });

  it('clears filters when no public entries match', () => {
    const setLobbyModeFilter = vi.fn();
    const setLobbyOperationFilter = vi.fn();
    const setLobbyDifficultyFilter = vi.fn();
    const setLobbySort = vi.fn();

    render(
      <DuelsLobbyPanels
        inviteLobbyEntries={[]}
        inviteHeadingId='invite-heading'
        inviteListId='invite-list'
        lobbyHeadingId='lobby-heading'
        lobbyDescriptionId='lobby-description'
        lobbyListId='lobby-list'
        lobbyEntries={[]}
        lobbyCountLabel='0 aktywnych'
        lobbyLastUpdatedAt={null}
        relativeNow={Date.now()}
        lobbyRefreshSeconds={5}
        lobbyStreamStatus='idle'
        loadLobby={vi.fn().mockResolvedValue(undefined)}
        isLobbyLoading={false}
        lobbyModeFilter='challenge'
        setLobbyModeFilter={setLobbyModeFilter}
        lobbyOperationFilter='multiplication'
        setLobbyOperationFilter={setLobbyOperationFilter}
        lobbyDifficultyFilter='hard'
        setLobbyDifficultyFilter={setLobbyDifficultyFilter}
        lobbySort='time_fast'
        setLobbySort={setLobbySort}
        publicLobbyEntries={[buildEntry()]}
        filteredPublicLobbyEntries={[]}
        hasAnyPublicLobbyEntries
        hasVisiblePublicLobbyEntries={false}
        lobbyError={null}
        isBusy={false}
        joiningSessionId={null}
        isPageActive
        isOnline
        isLobbyStale={false}
        canJoinLobby
        onRequireLogin={vi.fn()}
        handleJoinLobbySession={vi.fn().mockResolvedValue(undefined)}
        handleCreateChallenge={vi.fn().mockResolvedValue(undefined)}
        lobbyFreshRef={{ current: new Map() }}
        lobbyFreshWindowMs={15_000}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pokaz wszystkie' }));
    expect(setLobbyModeFilter).toHaveBeenCalledWith('all');
    expect(setLobbyOperationFilter).toHaveBeenCalledWith('all');
    expect(setLobbyDifficultyFilter).toHaveBeenCalledWith('all');
    expect(setLobbySort).toHaveBeenCalledWith('recent');
  });

  it('lets authenticated users create a challenge from the empty state', () => {
    const handleCreateChallenge = vi.fn().mockResolvedValue(undefined);

    render(
      <DuelsLobbyPanels
        inviteLobbyEntries={[]}
        inviteHeadingId='invite-heading'
        inviteListId='invite-list'
        lobbyHeadingId='lobby-heading'
        lobbyDescriptionId='lobby-description'
        lobbyListId='lobby-list'
        lobbyEntries={[]}
        lobbyCountLabel='0 aktywnych'
        lobbyLastUpdatedAt={null}
        relativeNow={Date.now()}
        lobbyRefreshSeconds={5}
        lobbyStreamStatus='idle'
        loadLobby={vi.fn().mockResolvedValue(undefined)}
        isLobbyLoading={false}
        lobbyModeFilter='all'
        setLobbyModeFilter={vi.fn()}
        lobbyOperationFilter='all'
        setLobbyOperationFilter={vi.fn()}
        lobbyDifficultyFilter='all'
        setLobbyDifficultyFilter={vi.fn()}
        lobbySort='recent'
        setLobbySort={vi.fn()}
        publicLobbyEntries={[]}
        filteredPublicLobbyEntries={[]}
        hasAnyPublicLobbyEntries={false}
        hasVisiblePublicLobbyEntries={false}
        lobbyError={null}
        isBusy={false}
        joiningSessionId={null}
        isPageActive
        isOnline
        isLobbyStale={false}
        canJoinLobby
        onRequireLogin={vi.fn()}
        handleJoinLobbySession={vi.fn().mockResolvedValue(undefined)}
        handleCreateChallenge={handleCreateChallenge}
        lobbyFreshRef={{ current: new Map() }}
        lobbyFreshWindowMs={15_000}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stworz wlasne wyzwanie' }));
    expect(handleCreateChallenge).toHaveBeenCalledTimes(1);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_duels_lobby_create_clicked',
      expect.objectContaining({ source: 'empty_state', isGuest: false })
    );
  });
});
