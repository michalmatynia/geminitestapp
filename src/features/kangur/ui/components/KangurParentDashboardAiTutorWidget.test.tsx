/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { kangurKeys } from '@/shared/lib/query-key-exports';

const {
  settingsStoreMock,
  apiPostMock,
  invalidateSettingsCacheMock,
  invalidateAllSettingsMock,
  runtimeState,
  queryClientMock,
  usageQueryState,
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
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => usageQueryState.value,
  useQueryClient: () => queryClientMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
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

import { KangurParentDashboardAiTutorWidget } from './KangurParentDashboardAiTutorWidget';

describe('KangurParentDashboardAiTutorWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('saves only learner guardrails from the parent dashboard', async () => {
    render(<KangurParentDashboardAiTutorWidget />);

    const lessonsToggle = screen.getByRole('checkbox', { name: /pokazuj tutora w lekcjach/i });
    expect(lessonsToggle.nextElementSibling).toHaveClass(
      'bg-gradient-to-r',
      'from-amber-400',
      'to-orange-400'
    );
    expect(lessonsToggle.parentElement?.parentElement).toHaveClass('border-amber-200', 'bg-amber-50/65');

    const enabledToggle = screen.getByRole('checkbox', { name: /ai tutor włączony/i });
    expect(enabledToggle.nextElementSibling).toHaveClass(
      'bg-gradient-to-r',
      'from-amber-400',
      'to-orange-400'
    );

    expect(screen.getByLabelText(/tryb interfejsu tutora/i)).toHaveClass(
      'focus:border-amber-300',
      'focus:ring-amber-200/70'
    );
    expect(screen.getByLabelText(/tryb pomocy w testach/i)).toHaveClass(
      'focus:border-amber-300',
      'focus:ring-amber-200/70'
    );

    fireEvent.click(lessonsToggle);
    fireEvent.change(screen.getByLabelText(/tryb interfejsu tutora/i), {
      target: { value: 'static' },
    });
    fireEvent.change(screen.getByLabelText(/tryb pomocy w testach/i), {
      target: { value: 'review_after_answer' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /pokazuj źródła odpowiedzi/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /pozwól pytać o zaznaczony fragment/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /zachowuj rozmowę po zmianie miejsca/i }));
    const saveButton = screen.getByRole('button', { name: /zapisz ustawienia ai tutora/i });
    expect(saveButton).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      'focus-visible:ring-amber-300/70'
    );

    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: KANGUR_AI_TUTOR_SETTINGS_KEY,
        value: JSON.stringify({
          'learner-1': {
            enabled: true,
            uiMode: 'static',
            allowCrossPagePersistence: false,
            allowLessons: false,
            testAccessMode: 'review_after_answer',
            showSources: false,
            allowSelectedTextSupport: false,
          },
        }),
      })
    );

    expect(invalidateSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(invalidateAllSettingsMock).toHaveBeenCalledWith(queryClientMock);
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: kangurKeys.aiTutor.usage('learner-1'),
    });
    expect(screen.getByText('Ustawienia AI Tutora zapisane.')).toBeInTheDocument();
  });

  it('renders live daily usage for the active learner when the tutor is enabled', () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            uiMode: 'anchored',
            allowCrossPagePersistence: true,
            allowLessons: true,
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

    expect(screen.getByText(/wykorzystanie dzisiaj/i)).toHaveClass('text-amber-700');
    expect(screen.getByText('Zużyto 4 z 12 wiadomości.')).toBeInTheDocument();
    expect(screen.getByText('Pozostało 8')).toHaveClass('text-amber-700');
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
      'Tutor podkresla postep'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toHaveTextContent(
      'Wspierajacy'
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
      'Wspierajacy'
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
      'Refleksyjny'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'reflective'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toHaveTextContent(
      'Cierpliwy'
    );
    expect(screen.getByTestId('parent-dashboard-ai-tutor-mood-confidence')).toHaveTextContent(
      '58%'
    );
  });

  it('shows a fallback message when live usage cannot be loaded', () => {
    usageQueryState.value = {
      data: undefined,
      isLoading: false,
      isError: true,
    };

    render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.getByText('Nie udało się odczytać bieżącego użycia.')).toBeInTheDocument();
  });

  it('does not show app-wide tutor controls in the parent dashboard', () => {
    render(<KangurParentDashboardAiTutorWidget />);

    expect(screen.queryByLabelText(/dzienny limit wiadomości/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/agent nauczający/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/persona \(charakter tutora\)/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/persona playwright/i)).not.toBeInTheDocument();
    expect(screen.getByText(/zarządzane w/i)).toHaveTextContent('Kangur Settings');
  });
});
