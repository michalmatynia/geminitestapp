/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_AI_TUTOR_SETTINGS_KEY } from '@/features/kangur/settings-ai-tutor';
import { kangurKeys } from '@/shared/lib/query-key-exports';

const {
  settingsStoreMock,
  apiPostMock,
  invalidateSettingsCacheMock,
  invalidateAllSettingsMock,
  useAgentPersonasMock,
  usePlaywrightPersonasMock,
  runtimeState,
  queryClientMock,
  teachingAgentsQueryState,
  usageQueryState,
} = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  apiPostMock: vi.fn(),
  invalidateSettingsCacheMock: vi.fn(),
  invalidateAllSettingsMock: vi.fn(),
  useAgentPersonasMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
  runtimeState: {
    value: {
      activeLearner: { id: 'learner-1', displayName: 'Ada' },
      activeTab: 'ai-tutor',
      canAccessDashboard: true,
    },
  },
  queryClientMock: {
    invalidateQueries: vi.fn(),
  },
  teachingAgentsQueryState: {
    value: {
      data: [{ id: 'teacher-1', name: 'Teacher 1' }],
      isLoading: false,
      isError: false,
    },
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
  useQuery: ({ queryKey }: { queryKey: unknown }) => {
    const isAiTutorUsageQuery =
      Array.isArray(queryKey) &&
      queryKey[0] === 'kangur' &&
      queryKey[1] === 'ai-tutor' &&
      queryKey[2] === 'usage';
    return isAiTutorUsageQuery
      ? usageQueryState.value
      : teachingAgentsQueryState.value;
  },
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

vi.mock('@/features/ai/agentcreator/hooks/useAgentPersonas', () => ({
  useAgentPersonas: useAgentPersonasMock,
}));

vi.mock('@/features/playwright/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: usePlaywrightPersonasMock,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: () => true,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

import { KangurParentDashboardAiTutorWidget } from './KangurParentDashboardAiTutorWidget';

describe('KangurParentDashboardAiTutorWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'teacher-1',
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
        });
      }
      return undefined;
    });
    teachingAgentsQueryState.value = {
      data: [{ id: 'teacher-1', name: 'Teacher 1' }],
      isLoading: false,
      isError: false,
    };
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
    useAgentPersonasMock.mockReturnValue({
      data: [{ id: 'persona-1', name: 'Mila', role: 'Math coach' }],
    });
    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'pw-1', name: 'Tablet', settings: { emulateDevice: true, deviceName: 'iPad' } }],
    });
  });

  it('saves learner guardrails together with tutor agent settings', async () => {
    render(<KangurParentDashboardAiTutorWidget />);

    fireEvent.click(screen.getByRole('checkbox', { name: /pokazuj tutora w lekcjach/i }));
    fireEvent.change(screen.getByLabelText(/tryb pomocy w testach/i), {
      target: { value: 'review_after_answer' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /pokazuj źródła odpowiedzi/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /pozwól pytać o zaznaczony fragment/i }));
    fireEvent.change(screen.getByLabelText(/dzienny limit wiadomości/i), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /zapisz ustawienia ai tutora/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: KANGUR_AI_TUTOR_SETTINGS_KEY,
        value: JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'teacher-1',
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowLessons: false,
            testAccessMode: 'review_after_answer',
            showSources: false,
            allowSelectedTextSupport: false,
            dailyMessageLimit: 12,
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
            teachingAgentId: 'teacher-1',
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: 12,
          },
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

    expect(screen.getByText(/wykorzystanie dzisiaj/i)).toBeInTheDocument();
    expect(screen.getByText('Zużyto 4 z 12 wiadomości.')).toBeInTheDocument();
    expect(screen.getByText('Pozostało 8')).toBeInTheDocument();
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
});
