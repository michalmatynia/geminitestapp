/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { subscribeToTutorVisibilityChanges } from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const {
  settingsStoreMock,
  apiPostMock,
  invalidateSettingsCacheMock,
  invalidateAllSettingsMock,
  runtimeState,
  queryClientMock,
  usageQueryState,
  useKangurPageContentEntryMock,
  useQueryMock,
} = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  apiPostMock: vi.fn(),
  invalidateSettingsCacheMock: vi.fn(),
  invalidateAllSettingsMock: vi.fn(),
  runtimeState: {
    value: {
      activeLearner: {
        id: 'learner-1',
        displayName: 'Ada',
        aiTutor: {
          currentMoodId: 'supportive',
          baselineMoodId: 'calm',
          confidence: 0.67,
          lastComputedAt: '2026-03-08T08:00:00.000Z',
          lastReasonCode: 'steady_progress',
        },
      },
      activeTab: 'ai-tutor',
      canAccessDashboard: true,
    },
  },
  queryClientMock: {
    invalidateQueries: vi.fn(),
  },
  usageQueryState: {
    value: {
      data: {
        usage: {
          dateKey: '2026-03-07',
          messageCount: 0,
          dailyMessageLimit: null,
          remainingMessages: null,
        },
      },
      isLoading: false,
      isError: false,
    },
  },
  useKangurPageContentEntryMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useQueryClient: () => queryClientMock,
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/shared/api/settings-client', () => ({
  invalidateSettingsCache: invalidateSettingsCacheMock,
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAllSettings: invalidateAllSettingsMock,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: () => true,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurParentDashboardAiTutorWidget } from './KangurParentDashboardAiTutorWidget';

const flushDeferredUsageLoad = async (): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(900);
  });
};

function TutorVisibilityProbe(): React.JSX.Element {
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => subscribeToTutorVisibilityChanges(setHidden), []);

  return <div data-testid='tutor-visibility-probe'>{hidden ? 'hidden' : 'visible'}</div>;
}

describe('KangurParentDashboardAiTutorWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    useQueryMock.mockImplementation(() => usageQueryState.value);
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
        displayName: 'Ada',
        aiTutor: {
          currentMoodId: 'supportive',
          baselineMoodId: 'calm',
          confidence: 0.67,
          lastComputedAt: '2026-03-08T08:00:00.000Z',
          lastReasonCode: 'steady_progress',
        },
      },
      activeTab: 'ai-tutor',
      canAccessDashboard: true,
    };

    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            uiMode: 'anchored',
            allowCrossPagePersistence: true,
            allowLessons: true,
            allowGames: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: 'tablet',
          dailyMessageLimit: 12,
        });
      }
      return undefined;
    });
    usageQueryState.value = {
      data: {
        usage: {
          dateKey: '2026-03-07',
          messageCount: 0,
          dailyMessageLimit: null,
          remainingMessages: null,
        },
      },
      isLoading: false,
      isError: false,
    };

    apiPostMock.mockResolvedValue({});
    invalidateAllSettingsMock.mockResolvedValue(undefined);
    vi.mocked(queryClientMock.invalidateQueries).mockResolvedValue(undefined);
  });

  it('disables focus refetch for usage because polling already keeps it fresh', async () => {
    vi.useFakeTimers();

    try {
      render(<KangurParentDashboardAiTutorWidget />);
      await flushDeferredUsageLoad();

      expect(useQueryMock).toHaveBeenCalled();
      const lastCall = useQueryMock.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({
        refetchOnWindowFocus: false,
        refetchInterval: 30_000,
        staleTime: 10_000,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the AI Tutor tab helper state when no learner is active', () => {
    runtimeState.value = {
      activeLearner: null,
      activeTab: 'ai-tutor',
      canAccessDashboard: true,
    };

    render(<KangurParentDashboardAiTutorWidget />);

    expect(
      screen.getByText('Wybierz ucznia, aby skonfigurować AI Tutora.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/^AI Tutor dla /i)).not.toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-ai-tutor-enable')).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('enables AI Tutor controls in the parent dashboard when not disabled', async () => {
    render(<KangurParentDashboardAiTutorWidget />);
    const lessonsToggle = screen.getByRole('checkbox', { name: /pokazuj tutora w lekcjach/i });
    const saveButton = screen.getByRole('button', { name: /zapisz ustawienia ai tutora/i });
    const toggleButton = screen.getByRole('button', { name: /wyłącz ai-tutora/i });

    expect(lessonsToggle).not.toBeDisabled();
    expect(toggleButton).not.toBeDisabled();
    expect(saveButton).not.toBeDisabled();
    expect(toggleButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    expect(saveButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');

    fireEvent.click(saveButton);

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
  });

  it('hides live daily usage when the tutor is disabled for the learner', () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: false,
            uiMode: 'anchored',
            allowCrossPagePersistence: true,
            allowLessons: true,
            allowGames: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: 'tablet',
          dailyMessageLimit: 12,
        });
      }
      return undefined;
    });
    usageQueryState.value = {
      data: {
        usage: {
          dateKey: '2026-03-07',
          messageCount: 4,
          dailyMessageLimit: 12,
          remainingMessages: 8,
        },
      },
      isLoading: false,
      isError: false,
    };

    render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.getByText('Tutor-AI dla rodzica')).toBeInTheDocument();
    expect(screen.getByText('AI Tutor dla Ada')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Ustaw dostępność i guardrails pomocy AI dla tego ucznia')
    ).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.queryByText(/wykorzystanie dzisiaj/i)).not.toBeInTheDocument();
  });

  it('enables the tutor without triggering cross-component render updates', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: false,
            uiMode: 'anchored',
            allowCrossPagePersistence: true,
            allowLessons: true,
            allowGames: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: 'tablet',
          dailyMessageLimit: 12,
        });
      }
      return undefined;
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <>
        <TutorVisibilityProbe />
        <KangurParentDashboardAiTutorWidget />
      </>
    );

    expect(screen.getByTestId('tutor-visibility-probe')).toHaveTextContent('hidden');

    fireEvent.click(screen.getByRole('button', { name: /włącz ai-tutora/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tutor-visibility-probe')).toHaveTextContent('visible');
    });

    const hasRenderPhaseUpdateWarning = consoleErrorSpy.mock.calls.some((call) =>
      call.some(
        (value) =>
          typeof value === 'string' &&
          value.includes('Cannot update a component') &&
          value.includes('AiTutorConfigPanel')
      )
    );

    expect(hasRenderPhaseUpdateWarning).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('shows the learner-specific tutor mood summary for the active learner', () => {
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
        displayName: 'Ada',
        aiTutor: {
          currentMoodId: 'proud',
          baselineMoodId: 'supportive',
          confidence: 0.82,
          lastComputedAt: '2026-03-08T09:15:00.000Z',
          lastReasonCode: 'progress_gain',
        },
      },
      activeTab: 'ai-tutor',
      canAccessDashboard: true,
    };

    render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveTextContent(
      'Dumny'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'proud'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-description')).toHaveTextContent(
      /Tutor podkreśla postęp/i
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-description')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toHaveTextContent(
      repairKangurPolishCopy('Wspierajacy')
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-confidence')).toHaveTextContent(
      '82%'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-updated')).not.toHaveTextContent(
      'Jeszcze nie obliczono'
    );
  });

  it('updates the mood summary when the active learner changes', () => {
    const { rerender } = render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveTextContent(
      repairKangurPolishCopy('Wspierajacy')
    );

    runtimeState.value = {
      activeLearner: {
        id: 'learner-2',
        displayName: 'Ola',
        aiTutor: {
          currentMoodId: 'reflective',
          baselineMoodId: 'patient',
          confidence: 0.58,
          lastComputedAt: '2026-03-08T09:30:00.000Z',
          lastReasonCode: 'post_answer_review',
        },
      },
      activeTab: 'ai-tutor',
      canAccessDashboard: true,
    };

    rerender(<KangurParentDashboardAiTutorWidget />);

    expect(screen.getByText('AI Tutor dla Ola')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveTextContent(
      repairKangurPolishCopy('Refleksyjny')
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'reflective'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toHaveTextContent(
      repairKangurPolishCopy('Cierpliwy')
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-confidence')).toHaveTextContent(
      '58%'
    );
  });

  it('shows loading copy before deferred live usage becomes available', async () => {
    vi.useFakeTimers();

    try {
      render(<KangurParentDashboardAiTutorWidget />);

      expect(screen.getByText('Sprawdzam dzisiejsze wiadomości…')).toBeInTheDocument();
      expect(screen.queryByText('Wysłano 0 wiadomości.')).not.toBeInTheDocument();

      await flushDeferredUsageLoad();

      expect(screen.getByText('Wysłano 0 wiadomości.')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a fallback message when live usage cannot be loaded', async () => {
    vi.useFakeTimers();
    usageQueryState.value = {
      data: undefined,
      isLoading: false,
      isError: true,
    };

    try {
      render(<KangurParentDashboardAiTutorWidget />);

      expect(screen.queryByText('Nie udało się odczytać bieżącego użycia.')).not.toBeInTheDocument();

      await flushDeferredUsageLoad();

      expect(screen.getByText('Nie udało się odczytać bieżącego użycia.')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not show app-wide tutor controls in the parent dashboard', () => {
    render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.queryByLabelText(/dzienny limit wiadomości/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/agent nauczający/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/persona \(charakter tutora\)/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/persona playwright/i)).not.toBeInTheDocument();
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-ai-tutor',
        title: 'Tutor-AI dla rodzica',
        summary: 'Interpretuj dane ucznia i ustawiaj wsparcie AI z jednego miejsca.',
      },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });

    render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.getByText('Tutor-AI dla rodzica')).toBeInTheDocument();
    expect(
      screen.getByText('Interpretuj dane ucznia i ustawiaj wsparcie AI z jednego miejsca.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });
});
