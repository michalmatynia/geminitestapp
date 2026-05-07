/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BRAIN_MODEL_DEFAULT_VALUE } from '../SocialPublishingPage.Constants';
import { SOCIAL_PUBLISHING_CAPTURE_PRESETS } from '@/features/filemaker/social/shared/social-capture-presets';
import { SOCIAL_PUBLISHING_SETTINGS_KEY } from '@/features/filemaker/social/settings';

const {
  toastMock,
  useBrainModelOptionsMock,
  useIntegrationsMock,
  useIntegrationConnectionsMock,
  mutateAsyncMock,
  logSocialPublishingClientErrorMock,
  isRecoverableSocialPublishingClientFetchErrorMock,
  captureExceptionMock,
  settingsStoreMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useBrainModelOptionsMock: vi.fn(),
  useIntegrationsMock: vi.fn(),
  useIntegrationConnectionsMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  logSocialPublishingClientErrorMock: vi.fn(),
  isRecoverableSocialPublishingClientFetchErrorMock: vi.fn((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : error &&
              typeof error === 'object' &&
              'message' in error &&
              typeof error.message === 'string'
            ? error.message
            : null;
    if (!message) {
      return false;
    }
    const normalizedMessage = message.trim().toLowerCase();
    return (
      normalizedMessage.includes('failed to fetch') ||
      normalizedMessage.includes('load failed')
    );
  }),
  captureExceptionMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn(),
    refetch: vi.fn(),
  },
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: (...args: unknown[]) => useBrainModelOptionsMock(...args),
}));

vi.mock('@/features/integrations/product-integrations-adapter', () => ({
  useIntegrations: (...args: unknown[]) => useIntegrationsMock(...args),
  useIntegrationConnections: (...args: unknown[]) => useIntegrationConnectionsMock(...args),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/filemaker/social/client-observability', () => ({
  isRecoverableSocialPublishingClientFetchError: (...args: unknown[]) =>
    isRecoverableSocialPublishingClientFetchErrorMock(...args),
  logSocialPublishingClientError: (...args: unknown[]) => logSocialPublishingClientErrorMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

import { useSocialSettings } from './useSocialSettings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useSocialSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockReturnValue(null);
    mutateAsyncMock.mockResolvedValue({});
    useBrainModelOptionsMock.mockImplementation(
      ({ capability }: { capability: string }) =>
        capability === 'social_publishing.post_generation'
          ? { effectiveModelId: 'brain-routing' }
          : { effectiveModelId: 'vision-routing' }
    );
    useIntegrationsMock.mockReturnValue({
      data: [{ id: 'linkedin-integration', slug: 'linkedin' }],
    });
    useIntegrationConnectionsMock.mockReturnValue({
      data: [{ id: 'conn-1', hasLinkedInAccessToken: true }],
    });
  });

  it('keeps modal-only model and publishing queries disabled until settings data is requested', () => {
    renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    expect(useBrainModelOptionsMock).toHaveBeenNthCalledWith(1, {
      capability: 'social_publishing.post_generation',
      enabled: false,
    });
    expect(useBrainModelOptionsMock).toHaveBeenNthCalledWith(2, {
      capability: 'social_publishing.visual_analysis',
      enabled: false,
    });
    expect(useIntegrationsMock).toHaveBeenCalledWith({ enabled: false });
    expect(useIntegrationConnectionsMock).toHaveBeenCalledWith('linkedin-integration', {
      enabled: false,
    });
  });

  it('enables model and publishing queries when settings modal data is requested', () => {
    renderHook(() => useSocialSettings({ preloadSettingsModalData: true }), {
      wrapper: createWrapper(),
    });

    expect(useBrainModelOptionsMock).toHaveBeenNthCalledWith(1, {
      capability: 'social_publishing.post_generation',
      enabled: true,
    });
    expect(useBrainModelOptionsMock).toHaveBeenNthCalledWith(2, {
      capability: 'social_publishing.visual_analysis',
      enabled: true,
    });
    expect(useIntegrationsMock).toHaveBeenCalledWith({ enabled: true });
    expect(useIntegrationConnectionsMock).toHaveBeenCalledWith('linkedin-integration', {
      enabled: true,
    });
  });

  it('hydrates defaults from the window origin and saves normalized settings', async () => {
    const { result } = renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.batchCaptureBaseUrl).toBe(window.location.origin)
    );

    act(() => {
      result.current.handleBrainModelChange('brain-override');
      result.current.handleVisionModelChange('vision-override');
      result.current.handlePublishingConnectionChange('conn-1');
      result.current.setProjectUrl(' https://project.example.com ');
      result.current.setBatchCaptureBaseUrl(' https://capture.example.com ');
      result.current.clearCapturePresets();
      result.current.handleToggleCapturePreset('game');
      result.current.setBatchCapturePresetLimit('2');
    });

    expect(result.current.isSettingsDirty).toBe(true);

    await act(async () => {
      await result.current.handleSaveSettings();
    });

    const saveCall = mutateAsyncMock.mock.calls[0]?.[0];
    expect(saveCall.key).toBe(SOCIAL_PUBLISHING_SETTINGS_KEY);
    expect(JSON.parse(saveCall.value)).toEqual({
      brainModelId: 'brain-override',
      visionModelId: 'vision-override',
      publishingConnectionId: 'conn-1',
      batchCaptureBaseUrl: 'https://capture.example.com',
      batchCapturePresetIds: ['game'],
      batchCapturePresetLimit: 2,
      programmableCaptureBaseUrl: null,
      programmableCapturePersonaId: null,
      programmableCaptureScript: expect.any(String),
      programmableCaptureRoutes: [],
      projectUrl: 'https://project.example.com',
      captureContentConfig: { slides: [] },
    });
    expect(settingsStoreMock.refetch).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith('Social settings saved.', {
      variant: 'success',
    });
  });

  it('exposes Project URL validation errors and blocks invalid settings saves', async () => {
    const { result } = renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setProjectUrl('http://localhost:3000');
    });

    expect(result.current.projectUrlError).toBe(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );

    let saveResult = true;
    await act(async () => {
      saveResult = await result.current.handleSaveSettings();
    });

    expect(saveResult).toBe(false);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.',
      { variant: 'warning' }
    );

    act(() => {
      result.current.setProjectUrl('');
    });

    expect(result.current.projectUrlError).toBe(
      'Set Settings Project URL before generating social posts.'
    );
  });

  it('respects persisted settings and supports reset-style handlers', async () => {
    settingsStoreMock.get.mockReturnValue(
      JSON.stringify({
        brainModelId: 'brain-persisted',
        visionModelId: 'vision-persisted',
        publishingConnectionId: 'conn-1',
        batchCaptureBaseUrl: 'https://persisted.example.com',
        batchCapturePresetIds: ['tests', 'profile'],
        batchCapturePresetLimit: 3,
        programmableCaptureBaseUrl: 'https://persisted-programmable.example.com',
        programmableCapturePersonaId: 'persona-fast',
        programmableCaptureScript: 'return input.captures;',
        programmableCaptureRoutes: [
          {
            id: 'route-1',
            title: 'Pricing page',
            path: '/pricing',
            description: 'Capture pricing hero',
            selector: '[data-pricing]',
            waitForMs: 200,
            waitForSelectorMs: 3000,
          },
        ],
        projectUrl: 'https://project.persisted.example.com',
      })
    );

    const { result } = renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.batchCaptureBaseUrl).toBe('https://persisted.example.com'));

    expect(result.current.brainModelId).toBe('brain-persisted');
    expect(result.current.visionModelId).toBe('vision-persisted');
    expect(result.current.batchCapturePresetIds).toEqual(['tests', 'profile']);
    expect(result.current.batchCapturePresetLimit).toBe(3);
    expect(result.current.persistedSocialSettings.programmableCaptureBaseUrl).toBe(
      'https://persisted-programmable.example.com'
    );
    expect(result.current.persistedSocialSettings.programmableCapturePersonaId).toBe(
      'persona-fast'
    );
    expect(result.current.persistedSocialSettings.programmableCaptureScript).toBe(
      'return input.captures;'
    );
    expect(result.current.persistedSocialSettings.programmableCaptureRoutes).toEqual([
      {
        id: 'route-1',
        title: 'Pricing page',
        path: '/pricing',
        description: 'Capture pricing hero',
        selector: '[data-pricing]',
        waitForMs: 200,
        waitForSelectorMs: 3000,
      },
    ]);

    act(() => {
      result.current.handleBrainModelChange(BRAIN_MODEL_DEFAULT_VALUE);
      result.current.selectAllCapturePresets();
      result.current.setBatchCapturePresetLimit('0');
    });

    expect(result.current.brainModelId).toBeNull();
    expect(result.current.batchCapturePresetIds).toEqual(
      SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => preset.id)
    );
    expect(result.current.batchCapturePresetLimit).toBeNull();
  });

  it('saves programmable Playwright defaults without overwriting the rest of the Social settings', async () => {
    settingsStoreMock.get.mockReturnValue(
      JSON.stringify({
        brainModelId: 'brain-persisted',
        visionModelId: 'vision-persisted',
        publishingConnectionId: 'conn-1',
        batchCaptureBaseUrl: 'https://persisted.example.com',
        batchCapturePresetIds: ['tests', 'profile'],
        batchCapturePresetLimit: 3,
        projectUrl: 'https://project.persisted.example.com',
      })
    );

    const { result } = renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleSaveProgrammableCaptureDefaults({
        baseUrl: 'https://programmable.example.com',
        personaId: 'persona-screens',
        script: 'return input.captures;',
        routes: [
          {
            id: 'route-1',
            title: 'Pricing page',
            path: '/pricing',
            description: 'Capture pricing hero',
            selector: '[data-pricing]',
            waitForMs: 200,
            waitForSelectorMs: 3000,
          },
        ],
      });
    });

    const saveCall = mutateAsyncMock.mock.calls.at(-1)?.[0];
    expect(saveCall.key).toBe(SOCIAL_PUBLISHING_SETTINGS_KEY);
    expect(JSON.parse(saveCall.value)).toEqual({
      brainModelId: 'brain-persisted',
      visionModelId: 'vision-persisted',
      publishingConnectionId: 'conn-1',
      batchCaptureBaseUrl: 'https://persisted.example.com',
      batchCapturePresetIds: ['tests', 'profile'],
      batchCapturePresetLimit: 3,
      programmableCaptureBaseUrl: 'https://programmable.example.com',
      programmableCapturePersonaId: 'persona-screens',
      programmableCaptureScript: 'return input.captures;',
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: 'Capture pricing hero',
          selector: '[data-pricing]',
          waitForMs: 200,
          waitForSelectorMs: 3000,
        },
      ],
      projectUrl: 'https://project.persisted.example.com',
      captureContentConfig: { slides: [] },
    });
    expect(toastMock).toHaveBeenCalledWith('Programmable Playwright defaults saved.', {
      variant: 'success',
    });
  });

  it('suppresses handled network save failures while keeping the user-facing error toast', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setProjectUrl('https://project.example.com');
    });

    let saveResult = true;
    await act(async () => {
      saveResult = await result.current.handleSaveSettings();
    });

    expect(saveResult).toBe(false);
    expect(isRecoverableSocialPublishingClientFetchErrorMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logSocialPublishingClientErrorMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Failed to save social settings. Check your connection and try again.',
      { variant: 'error' }
    );
  });

  it('still reports unexpected save failures through client observability', async () => {
    const unexpectedError = new Error('Unexpected save failure');
    mutateAsyncMock.mockRejectedValueOnce(unexpectedError);

    const { result } = renderHook(() => useSocialSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setProjectUrl('https://project.example.com');
    });

    let saveResult = true;
    await act(async () => {
      saveResult = await result.current.handleSaveSettings();
    });

    expect(saveResult).toBe(false);
    expect(isRecoverableSocialPublishingClientFetchErrorMock).toHaveBeenCalledWith(unexpectedError);
    expect(captureExceptionMock).toHaveBeenCalledWith(unexpectedError);
    expect(logSocialPublishingClientErrorMock).toHaveBeenCalledWith(
      unexpectedError,
      expect.objectContaining({
        source: 'AdminSocialPublishingPage',
        action: 'saveSettings',
      })
    );
    expect(toastMock).toHaveBeenCalledWith('Failed to save social settings.', {
      variant: 'error',
    });
  });
});
