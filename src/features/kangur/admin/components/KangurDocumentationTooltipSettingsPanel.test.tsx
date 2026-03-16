/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, mutateAsyncMock, toastMock, tooltipEnhancerMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  tooltipEnhancerMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: ({
    enabled,
    rootId,
  }: {
    enabled: boolean;
    rootId: string;
  }) => {
    tooltipEnhancerMock({ enabled, rootId });
    return (
      <div
        data-testid='kangur-docs-tooltip-enhancer'
        data-enabled={String(enabled)}
        data-root-id={rootId}
      />
    );
  },
}));

import { KANGUR_HELP_SETTINGS_KEY } from '@/features/kangur/help-settings';
import { KangurDocumentationTooltipSettingsPanel } from './KangurDocumentationTooltipSettingsPanel';

describe('KangurDocumentationTooltipSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({});
    settingsStoreMock.get.mockImplementation((key: string) => {
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

      return undefined;
    });
  });

  it('renders the tooltip settings panel with a clean preview state', () => {
    render(
      <div id='kangur-documentation-content'>
        <KangurDocumentationTooltipSettingsPanel />
      </div>
    );

    expect(screen.getByText('Docs & Tooltips')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /enable kangur docs tooltips/i })).toHaveAttribute(
      'data-state',
      'checked'
    );
    expect(screen.getByTestId('kangur-docs-tooltip-enhancer')).toHaveAttribute(
      'data-enabled',
      'true'
    );
    expect(screen.getByTestId('kangur-docs-tooltip-enhancer')).toHaveAttribute(
      'data-root-id',
      'kangur-documentation-content'
    );
    expect(screen.getByRole('button', { name: /save tooltip settings/i })).toBeDisabled();
  });

  it('updates the preview state before save and persists the changed tooltip settings', async () => {
    render(
      <div id='kangur-documentation-content'>
        <KangurDocumentationTooltipSettingsPanel />
      </div>
    );

    fireEvent.click(screen.getByRole('switch', { name: /admin docs tooltips/i }));

    expect(screen.getByText('Current admin preview')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-docs-tooltip-enhancer')).toHaveAttribute(
      'data-enabled',
      'false'
    );
    expect(screen.getByRole('button', { name: /save tooltip settings/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /save tooltip settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_HELP_SETTINGS_KEY,
        value: JSON.stringify({
          version: 1,
          docsTooltips: {
            enabled: true,
            homeEnabled: true,
            lessonsEnabled: true,
            testsEnabled: true,
            profileEnabled: true,
            parentDashboardEnabled: true,
            adminEnabled: false,
          },
        }),
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur documentation tooltip settings saved.', {
      variant: 'success',
    });
  });
});
