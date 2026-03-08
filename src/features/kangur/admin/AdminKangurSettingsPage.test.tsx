/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, mutateAsyncMock, toastMock, useAgentPersonasMock, apiPostMock } =
  vi.hoisted(() => ({
    settingsStoreMock: {
      get: vi.fn<(key: string) => string | undefined>(),
    },
    mutateAsyncMock: vi.fn(),
    toastMock: vi.fn(),
    useAgentPersonasMock: vi.fn(),
    apiPostMock: vi.fn(),
  }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
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

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/features/ai', () => ({
  AgentPersonaMoodAvatar: () => null,
  resolveAgentPersonaMood: () => ({
    id: 'neutral',
    svgContent: '<svg />',
    avatarImageUrl: null,
  }),
  useAgentPersonas: useAgentPersonasMock,
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import { AdminKangurSettingsPage } from '@/features/kangur/admin/AdminKangurSettingsPage';
import { KANGUR_HELP_SETTINGS_KEY, KANGUR_NARRATOR_SETTINGS_KEY } from '@/features/kangur/settings';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';

const expectInitialNarratorProbe = async (): Promise<void> => {
  await waitFor(() =>
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/tts/probe',
      {
        voice: 'coral',
        locale: 'pl-PL',
        text: 'To jest krotki test narratora Kangur.',
      },
      { logError: false }
    )
  );
};

describe('AdminKangurSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({});
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
        });
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

  it('loads and saves global AI tutor settings from the admin page', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    expect(screen.queryByLabelText(/agent nauczający/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/persona \(charakter tutora\)/i)).toHaveValue('persona-1');
    expect(screen.getByLabelText(/preset ruchu tutora/i)).toHaveValue('tablet');
    expect(screen.getByLabelText(/dzienny limit wiadomości/i)).toHaveValue(12);

    fireEvent.change(screen.getByLabelText(/dzienny limit wiadomości/i), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
        value: JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: 'tablet',
          dailyMessageLimit: 20,
        }),
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur AI tutor settings saved.', {
      variant: 'success',
    });
  });

  it('loads persisted docs tooltip settings and saves updated Kangur help settings', async () => {
    render(<AdminKangurSettingsPage />);
    await expectInitialNarratorProbe();

    const masterToggle = screen.getByRole('switch', {
      name: /enable kangur docs tooltips/i,
    });
    const homeToggle = screen.getByRole('switch', {
      name: /home docs tooltips/i,
    });

    expect(masterToggle).toHaveAttribute('data-state', 'checked');
    expect(homeToggle).toHaveAttribute('data-state', 'checked');

    fireEvent.click(homeToggle);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_HELP_SETTINGS_KEY,
        value: JSON.stringify({
          version: 1,
          docsTooltips: {
            enabled: true,
            homeEnabled: false,
            lessonsEnabled: true,
            testsEnabled: true,
            profileEnabled: true,
            parentDashboardEnabled: true,
            adminEnabled: true,
          },
        }),
      })
    );

    expect(screen.queryByText('Kangur Documentation Index')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open documentation center/i })).toHaveAttribute(
      'href',
      '/admin/kangur/documentation'
    );
    expect(toastMock).toHaveBeenCalledWith('Kangur documentation tooltip settings saved.', {
      variant: 'success',
    });
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

  it('runs the narrator probe automatically without showing probe toasts', async () => {
    render(<AdminKangurSettingsPage />);

    await expectInitialNarratorProbe();

    expect(screen.getByText('Server narrator ready')).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalledWith('Server narrator is ready.', {
      variant: 'success',
    });
    expect(toastMock).not.toHaveBeenCalledWith('Server narrator probe found an issue.', {
      variant: 'error',
    });

    fireEvent.click(screen.getByRole('radio', { name: /^Echo\b/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/tts/probe',
        {
          voice: 'echo',
          locale: 'pl-PL',
          text: 'To jest krotki test narratora Kangur.',
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
          text: 'To jest krotki test narratora Kangur.',
        },
        { logError: false }
      )
    );

    expect(screen.getByText('Server narrator unavailable')).toBeInTheDocument();
    expect(screen.getByText(/billing is inactive/i)).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith('Server narrator probe found an issue.', {
      variant: 'error',
    });
  });
});
