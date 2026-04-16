import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useIntegrationModalViewContextMock, onOpenSessionModalMock } = vi.hoisted(() => ({
  useIntegrationModalViewContextMock: vi.fn(),
  onOpenSessionModalMock: vi.fn(),
}));

vi.mock('./IntegrationModalViewContext', () => ({
  useIntegrationModalViewContext: () => useIntegrationModalViewContextMock(),
}));

vi.mock('../AllegroSettings', () => ({
  AllegroSettings: () => <div data-testid='allegro-settings' />,
}));

vi.mock('../BaselinkerSettings', () => ({
  BaselinkerSettings: () => <div data-testid='baselinker-settings' />,
}));

vi.mock('../LinkedInSettings', () => ({
  LinkedInSettings: () => <div data-testid='linkedin-settings' />,
}));

vi.mock('../PlaywrightTabContent', () => ({
  PlaywrightTabContent: () => <div data-testid='playwright-tab-content'>playwright-settings</div>,
}));

vi.mock('../manager/ConnectionEditModal', () => ({
  ConnectionEditModal: ({
    connection,
  }: {
    connection: { id: string; name: string } | null;
    onClose: () => void;
  }) =>
    connection ? (
      <div data-testid='connection-edit-modal'>{connection.name}</div>
    ) : null,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

import { IntegrationSettingsContent } from './IntegrationSettingsContent';

describe('IntegrationSettingsContent', () => {
  it('renders Tradera browser settings summary, playwright settings, and edit shortcut', () => {
    useIntegrationModalViewContextMock.mockReturnValue({
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      isTradera: true,
      isVinted: false,
      showPlaywright: true,
      activeConnection: {
        id: 'connection-tradera-1',
        name: 'Tradera Browser',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
        traderaDefaultTemplateId: 'template-123',
        traderaDefaultDurationHours: 72,
        traderaAutoRelistEnabled: true,
        traderaAutoRelistLeadMinutes: 180,
        hasPlaywrightStorageState: true,
        playwrightStorageStateUpdatedAt: '2026-04-04T10:00:00.000Z',
      },
      onOpenSessionModal: onOpenSessionModalMock,
    });

    render(<IntegrationSettingsContent />);

    expect(screen.getByText('Tradera browser automation')).toBeInTheDocument();
    expect(screen.getByText('Playwright script')).toBeInTheDocument();
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByText('template-123')).toBeInTheDocument();
    expect(screen.getByText('72 hours')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('180 min')).toBeInTheDocument();
    expect(screen.getByTestId('playwright-tab-content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit active connection' }));

    expect(screen.getByTestId('connection-edit-modal')).toHaveTextContent('Tradera Browser');
  });

  it('opens the session modal from the Tradera browser session card', () => {
    useIntegrationModalViewContextMock.mockReturnValue({
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      isTradera: true,
      isVinted: false,
      showPlaywright: true,
      activeConnection: {
        id: 'connection-tradera-1',
        name: 'Tradera Browser',
        hasPlaywrightStorageState: true,
        playwrightStorageStateUpdatedAt: '2026-04-04T10:00:00.000Z',
      },
      onOpenSessionModal: onOpenSessionModalMock,
    });

    render(<IntegrationSettingsContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View details' }));

    expect(onOpenSessionModalMock).toHaveBeenCalledTimes(1);
  });

  it('renders Vinted browser session settings and the shared Playwright controls', () => {
    useIntegrationModalViewContextMock.mockReturnValue({
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      isTradera: false,
      isVinted: true,
      showPlaywright: true,
      activeConnection: {
        id: 'connection-vinted-1',
        name: 'Vinted Browser',
        username: '',
        hasPlaywrightStorageState: true,
        playwrightStorageStateUpdatedAt: '2026-04-04T10:00:00.000Z',
      },
      onOpenSessionModal: onOpenSessionModalMock,
    });

    render(<IntegrationSettingsContent />);

    expect(screen.getByText('Vinted browser automation')).toBeInTheDocument();
    expect(screen.getByText('Session-only browser login')).toBeInTheDocument();
    expect(screen.getByText('Stored')).toBeInTheDocument();
    expect(screen.getByTestId('playwright-tab-content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit active connection' }));

    expect(screen.getByTestId('connection-edit-modal')).toHaveTextContent('Vinted Browser');
  });
});
