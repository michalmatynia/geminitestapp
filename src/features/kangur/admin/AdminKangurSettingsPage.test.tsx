/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  settingsStoreMock,
  mutateMock,
  mutateAsyncMock,
  toastMock,
  useAgentPersonasMock,
  apiGetMock,
  apiPostMock,
  useUserPreferencesMock,
  updateUserPreferencesMutateMock,
  useCmsThemesMock,
  queryClientMock,
} =
  vi.hoisted(() => ({
    settingsStoreMock: {
      get: vi.fn<(key: string) => string | undefined>(),
    },
    mutateMock: vi.fn(),
    mutateAsyncMock: vi.fn(),
    toastMock: vi.fn(),
    useAgentPersonasMock: vi.fn(),
    apiGetMock: vi.fn(),
    apiPostMock: vi.fn(),
    useUserPreferencesMock: vi.fn(),
    updateUserPreferencesMutateMock: vi.fn(),
    useCmsThemesMock: vi.fn(),
    queryClientMock: {
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
    },
  }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useQueryClient: () => queryClientMock,
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    reset: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutate: mutateMock,
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => useUserPreferencesMock(),
  useUpdateUserPreferences: () => ({
    mutate: updateUserPreferencesMutateMock,
  }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

vi.mock('@/shared/hooks/useAgentPersonas', () => ({
  useAgentPersonas: useAgentPersonasMock,
}));

vi.mock('@/features/cms/hooks/useCmsQueries', () => ({
  useCmsThemes: () => useCmsThemesMock(),
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    AgentPersonaMoodAvatar: () => null,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import { AdminKangurSettingsPage } from '@/features/kangur/admin/AdminKangurSettingsPage';
import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import {
  KANGUR_HELP_SETTINGS_KEY,
  KANGUR_NARRATOR_SETTINGS_KEY,
  KANGUR_PHONE_SIMULATION_SETTINGS_KEY,
  KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
} from '@/features/kangur/settings';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { DEFAULT_KANGUR_PAGE_CONTENT_STORE } from '@/features/kangur/page-content-catalog';

const expectInitialNarratorProbe = async (): Promise<void> => {
  await waitFor(() =>
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/tts/probe',
      {
        voice: 'coral',
        locale: 'pl-PL',
        text: 'To jest krótki test narratora Kangur.',
      },
      { logError: false }
    )
  );
};

describe('AdminKangurSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateMock.mockImplementation(() => undefined);
    mutateAsyncMock.mockResolvedValue({});
    useUserPreferencesMock.mockReturnValue({
      data: { cmsThemeOpenSections: [] },
      isFetched: true,
    });
    useCmsThemesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/kangur/ai-tutor/page-content?locale=')) {
        return DEFAULT_KANGUR_PAGE_CONTENT_STORE;
      }
      if (path.startsWith('/api/kangur/ai-tutor/native-guide?locale=')) {
        return DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE;
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    apiPostMock.mockResolvedValue({
      ok: true,
      stage: 'ready',
      voice: 'coral',
      model: 'gpt-4o-mini-tts',
      checkedAt: '2026-03-08T06:00:00.000Z',
      message: 'Server narrator is ready to generate neural audio.',
      errorName: null,
      errorStatus: null,
      errorCode: null,
    });
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_NARRATOR_SETTINGS_KEY) {
        return JSON.stringify({ engine: 'client', voice: 'coral' });
      }
      if (key === KANGUR_HELP_SETTINGS_KEY) {
        return JSON.stringify({
          docsTooltips: {
            enabled: true,
            homeEnabled: true,
            lessonsEnabled: true,
            testsEnabled: true,
            profileEnabled: true,
            parentDashboardEnabled: true,
            adminEnabled: true,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'legacy-persona',
            motionPresetId: 'legacy-motion',
            dailyMessageLimit: 5,
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
          guestIntroMode: 'first_visit',
          homeOnboardingMode: 'first_visit',
        });
      }
      if (key === KANGUR_PARENT_VERIFICATION_SETTINGS_KEY) {
        return JSON.stringify({ resendCooldownSeconds: 90 });
      }
      return undefined;
    });
    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Mila',
          role: 'Math coach',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#ffffff" /></svg>',
            },
          ],
        },
      ],
    });
  });

  it('loads the persisted narrator engine and saves the updated global selection', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Settings'
    );

    const clientRadio = screen.getByRole('radio', {
      name: /^Client narrator$/i,
    });
    const serverRadio = screen.getByRole('radio', {
      name: /^Server narrator$/i,
    });

    expect(clientRadio).toBeChecked();
    expect(serverRadio).not.toBeChecked();

    fireEvent.click(serverRadio);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_NARRATOR_SETTINGS_KEY,
        value: JSON.stringify({ engine: 'server', voice: 'coral' }),
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur narrator settings saved.', {
      variant: 'success',
    });
  });

  it('saves the phone simulation toggle', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    const phoneSimulationSwitch = screen.getByRole('switch', {
      name: 'Phone simulation',
    });

    expect(phoneSimulationSwitch).toHaveAttribute('data-state', 'checked');

    fireEvent.click(phoneSimulationSwitch);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_PHONE_SIMULATION_SETTINGS_KEY,
        value: JSON.stringify({ enabled: false }),
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur phone simulation settings saved.', {
      variant: 'success',
    });
  });

  it('renders the storefront theme editor shortcut and phone simulation section', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    expect(screen.getByText('Storefront Theme')).toBeInTheDocument();
    expect(
      screen.getByText(/only active kangur styling source at runtime/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open theme editor/i })).toHaveAttribute(
      'href',
      '/admin/kangur/appearance'
    );
    expect(
      screen.getByRole('switch', { name: 'Phone simulation' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/full-width controls appear above and below the game viewport/i)
    ).toBeInTheDocument();
  });

  it(
    'loads and saves global AI Tutor settings from the admin page',
    async () => {
      render(<AdminKangurSettingsPage />);
      await expectInitialNarratorProbe();

      expect(screen.queryByLabelText(/agent nauczający/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/persona \(charakter tutora\)/i)).toHaveTextContent('Mila');
      expect(screen.getByLabelText(/preset ruchu tutora/i)).toHaveTextContent('Tablet');
      expect(screen.getByLabelText(/dzienny limit wiadomości/i)).toHaveValue(12);
      expect(screen.getByLabelText(/anonimowy onboarding ai tutora/i)).toHaveTextContent(
        'Pierwsza wizyta'
      );
      expect(screen.getByLabelText(/onboarding pierwszej strony/i)).toHaveTextContent(
        'Pierwsza wizyta'
      );

      fireEvent.change(screen.getByLabelText(/dzienny limit wiadomości/i), {
        target: { value: '20' },
      });
      fireEvent.click(screen.getByLabelText(/anonimowy onboarding ai tutora/i));
      fireEvent.click(screen.getByRole('option', { name: /Każde wejście/i }));
      fireEvent.click(screen.getByLabelText(/onboarding pierwszej strony/i));
      fireEvent.click(screen.getAllByRole('option', { name: /Tylko ręcznie/i })[0]!);
      fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

      await waitFor(() =>
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
          value: JSON.stringify({
            agentPersonaId: 'persona-1',
            motionPresetId: 'tablet',
            dailyMessageLimit: 20,
            guestIntroMode: 'every_visit',
            homeOnboardingMode: 'off',
          }),
        })
      );

      expect(toastMock).toHaveBeenCalledWith('Kangur AI Tutor settings saved.', {
        variant: 'success',
      });
    },
    60_000
  );

  it('links to the dedicated AI Tutor content editor', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    const aiTutorContentLink = screen.getByRole('link', { name: /open ai tutor content/i });
    expect(aiTutorContentLink).toHaveAttribute(
      'href',
      '/admin/kangur/settings/ai-tutor-content'
    );
    expect(screen.queryByLabelText(/tutor content json/i)).not.toBeInTheDocument();
  });

  it('loads and saves parent verification email settings from the admin page', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    const cooldownInput = screen.getByLabelText(
      /czas oczekiwania na ponowne wysłanie e-maila \(sekundy\)/i
    );

    expect(cooldownInput).toHaveValue(90);

    fireEvent.change(cooldownInput, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
        value: JSON.stringify({
          resendCooldownSeconds: 120,
          notificationsEnabled: true,
          notificationsDisabledUntil: null,
          requireEmailVerification: true,
          requireCaptcha: true,
        }),
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur parent verification email settings saved.', {
      variant: 'success',
    });
  });

  it('keeps tooltip management on the dedicated documentation page', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    expect(screen.queryByText('Docs & Tooltips')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /enable kangur docs tooltips/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute(
      'href',
      '/admin/kangur/documentation'
    );
    expect(mutateAsyncMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        key: KANGUR_HELP_SETTINGS_KEY,
      })
    );
  });

  it('renders observability shortcuts for Kangur operations', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    expect(screen.getByText('Operations & Observability')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open observability dashboard/i })).toHaveAttribute(
      'href',
      '/admin/kangur/observability'
    );
    expect(screen.getByRole('link', { name: /open kangur logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?query=kangur.'
    );
    expect(screen.getByRole('link', { name: /open 24h summary json/i })).toHaveAttribute(
      'href',
      '/api/kangur/observability/summary?range=24h'
    );
    expect(
      screen.getByText('docs/kangur/observability-and-operations.md')
    ).toBeInTheDocument();
  });

  it('runs the narrator próbę automatically without showing próbę toasts', async () => {
    render(<AdminKangurSettingsPage />);

    await expectInitialNarratorProbe();

    expect(screen.getByText('Server narrator ready')).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalledWith('Server narrator is ready.', {
      variant: 'success',
    });
    expect(toastMock).not.toHaveBeenCalledWith('Server narrator próbę found an issue.', {
      variant: 'error',
    });

    fireEvent.click(screen.getByRole('radio', { name: /^Echo\b/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/tts/probe',
        {
          voice: 'echo',
          locale: 'pl-PL',
        text: 'To jest krótki test narratora Kangur.',
        },
        { logError: false }
      )
    );
  });

  it('probes the server narrator and renders diagnostic feedback', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    apiPostMock.mockResolvedValueOnce({
      ok: false,
      stage: 'openai_speech',
      voice: 'coral',
      model: 'gpt-4o-mini-tts',
      checkedAt: '2026-03-08T06:00:00.000Z',
      message: '429 Your account is not active, please check your billing details on our website.',
      errorName: 'KangurLessonTtsGenerationError',
      errorStatus: 429,
      errorCode: 'billing_not_active',
    });

    fireEvent.click(screen.getByRole('button', { name: /test server narrator/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/tts/probe',
        {
          voice: 'coral',
          locale: 'pl-PL',
        text: 'To jest krótki test narratora Kangur.',
        },
        { logError: false }
      )
    );

    expect(screen.getByText('Server narrator unavailable')).toBeInTheDocument();
    expect(screen.getByText(/billing is inactive/i)).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith('Server narrator próbę found an issue.', {
      variant: 'error',
    });
  });
});
