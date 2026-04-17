import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

const {
  useIntegrationsDataMock,
  useIntegrationsFormMock,
  useIntegrationsActionsMock,
  usePlaywrightActionsMock,
} = vi.hoisted(() => ({
  useIntegrationsDataMock: vi.fn(),
  useIntegrationsFormMock: vi.fn(),
  useIntegrationsActionsMock: vi.fn(),
  usePlaywrightActionsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/IntegrationsContext', () => ({
  useIntegrationsData: () => useIntegrationsDataMock(),
  useIntegrationsForm: () => useIntegrationsFormMock(),
  useIntegrationsActions: () => useIntegrationsActionsMock(),
}));

vi.mock('@/shared/hooks/usePlaywrightStepSequencer', () => ({
  usePlaywrightActions: (options?: { enabled?: boolean }) => usePlaywrightActionsMock(options),
}));

vi.mock('./DynamicPlaywrightSettingsForm', () => ({
  DynamicPlaywrightSettingsForm: () => <div data-testid='dynamic-playwright-settings-form' />,
}));

import { PlaywrightTabContent } from './PlaywrightTabContent';

describe('PlaywrightTabContent', () => {
  it('shows sequencer-managed runtime actions for Tradera connections', () => {
    const vintedSeed = getPlaywrightRuntimeActionSeed('tradera_standard_list');
    const summaryAction =
      vintedSeed === null
        ? null
        : {
            ...vintedSeed,
            executionSettings: {
              ...vintedSeed.executionSettings,
              headless: false,
              browserPreference: 'chrome',
            },
            blocks: vintedSeed.blocks.map((block) =>
              block.refId === 'browser_preparation'
                ? {
                    ...block,
                    config: {
                      viewportWidth: 1440,
                      viewportHeight: 900,
                      settleDelayMs: 800,
                      permissions: ['geolocation'],
                    },
                  }
                : { ...block }
            ),
          };

    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: { id: 'integration-tradera', slug: 'tradera', name: 'Tradera' },
      connections: [
        {
          id: 'connection-tradera-1',
          traderaBrowserMode: 'builtin',
        },
      ],
      playwrightPersonas: [],
      playwrightPersonasLoading: false,
    });
    useIntegrationsFormMock.mockReturnValue({
      editingConnectionId: 'connection-tradera-1',
      playwrightPersonaId: null,
    });
    useIntegrationsActionsMock.mockReturnValue({
      handleSelectPlaywrightPersona: vi.fn(),
      handleResetListingScript: vi.fn(),
    });
    usePlaywrightActionsMock.mockReturnValue({
      data: summaryAction ? [summaryAction] : [],
      isLoading: false,
    });

    render(<PlaywrightTabContent />);

    expect(screen.getByText('Step Sequencer runtime actions')).toBeInTheDocument();
    expect(screen.getByText('Tradera Standard List')).toBeInTheDocument();
    expect(screen.getByText('Headed')).toBeInTheDocument();
    expect(screen.getByText('Browser: chrome')).toBeInTheDocument();
    expect(screen.getByText('Viewport: 1440x900')).toBeInTheDocument();
    expect(screen.getByText('Legacy connection fallback overrides')).toBeInTheDocument();
  });

  it('keeps the legacy connection editor primary for 1688 integrations', () => {
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: { id: 'integration-1688', slug: '1688', name: '1688' },
      connections: [{ id: 'connection-1688-1' }],
      playwrightPersonas: [],
      playwrightPersonasLoading: false,
    });
    useIntegrationsFormMock.mockReturnValue({
      editingConnectionId: 'connection-1688-1',
      playwrightPersonaId: null,
    });
    useIntegrationsActionsMock.mockReturnValue({
      handleSelectPlaywrightPersona: vi.fn(),
      handleResetListingScript: vi.fn(),
    });
    usePlaywrightActionsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<PlaywrightTabContent />);

    expect(screen.queryByText('Step Sequencer runtime actions')).not.toBeInTheDocument();
    expect(screen.getByText('Playwright connection settings')).toBeInTheDocument();
    expect(screen.getByTestId('dynamic-playwright-settings-form')).toBeInTheDocument();
  });
});
