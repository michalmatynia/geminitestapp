import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useIntegrationsDataMock,
  useIntegrationsActionsMock,
  useIntegrationsTestingMock,
  useIntegrationsSessionMock,
  useIntegrationTabsMock,
  formModalRenderSpy,
} = vi.hoisted(() => ({
  useIntegrationsDataMock: vi.fn(),
  useIntegrationsActionsMock: vi.fn(),
  useIntegrationsTestingMock: vi.fn(),
  useIntegrationsSessionMock: vi.fn(),
  useIntegrationTabsMock: vi.fn(),
  formModalRenderSpy: vi.fn(),
}));

vi.mock('@/features/integrations/context/IntegrationsContext', () => ({
  useIntegrationsData: () => useIntegrationsDataMock(),
  useIntegrationsActions: () => useIntegrationsActionsMock(),
  useIntegrationsTesting: () => useIntegrationsTestingMock(),
  useIntegrationsSession: () => useIntegrationsSessionMock(),
}));

vi.mock('./hooks/useIntegrationTabs', () => ({
  useIntegrationTabs: () => useIntegrationTabsMock(),
}));

vi.mock('@/shared/ui/FormModal', () => ({
  FormModal: ({
    title,
    subtitle,
    children,
    onClose,
    onSave,
    showSaveButton,
    showCancelButton,
    saveText,
    cancelText,
    isSaving,
  }: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    onClose: () => void;
    onSave: () => void;
    showSaveButton?: boolean;
    showCancelButton?: boolean;
    saveText?: string;
    cancelText?: string;
    isSaving?: boolean;
  }) => {
    formModalRenderSpy({
      showSaveButton,
      showCancelButton,
      saveText,
      cancelText,
      isSaving,
    });

    return (
      <div data-testid='form-modal'>
        <div>{title}</div>
        <div>{subtitle}</div>
        {showCancelButton ? <button onClick={onClose}>{cancelText ?? 'Cancel'}</button> : null}
        {showSaveButton ? (
          <button onClick={onSave} disabled={isSaving}>
            {saveText ?? 'Save'}
          </button>
        ) : null}
        {children}
      </div>
    );
  },
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Tabs: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => <div data-testid={`tabs-${value}`}>{children}</div>,
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

vi.mock('./ConnectionManager', () => ({
  ConnectionManager: () => <div data-testid='connection-manager' />,
}));

vi.mock('./integration-modal/IntegrationModalHeader', () => ({
  IntegrationModalHeader: () => <span>Tradera Integration</span>,
}));

vi.mock('./integration-modal/IntegrationModalSubtitle', () => ({
  IntegrationModalSubtitle: () => <span>Manage browser settings.</span>,
}));

vi.mock('./integration-modal/IntegrationTabsList', () => ({
  IntegrationTabsList: () => <div data-testid='integration-tabs-list' />,
}));

vi.mock('./integration-modal/IntegrationSettingsContent', () => ({
  IntegrationSettingsContent: () => <div data-testid='integration-settings-content' />,
}));

vi.mock('./PlaywrightTabContent', () => ({
  PlaywrightTabContent: () => <div data-testid='playwright-tab-content' />,
}));

vi.mock('./BaseApiConsole', () => ({
  BaseApiConsole: () => <div data-testid='base-api-console' />,
}));

vi.mock('./AllegroApiConsole', () => ({
  AllegroApiConsole: () => <div data-testid='allegro-api-console' />,
}));

vi.mock('./SessionModal', () => ({
  SessionModal: () => null,
}));

vi.mock('./TestLogModal', () => ({
  TestLogModal: () => null,
}));

vi.mock('./TestResultModal', () => ({
  TestResultModal: () => null,
}));

import { IntegrationModal } from './IntegrationModal';

describe('IntegrationModal', () => {
  beforeEach(() => {
    formModalRenderSpy.mockClear();
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-tradera',
        name: 'Tradera',
      },
    });
    useIntegrationsActionsMock.mockReturnValue({
      onCloseModal: vi.fn(),
      onOpenSessionModal: vi.fn(),
    });
    useIntegrationsTestingMock.mockReturnValue({
      showTestLogModal: false,
      setShowTestLogModal: vi.fn(),
      showTestErrorModal: false,
      setShowTestErrorModal: vi.fn(),
      showTestSuccessModal: false,
      setShowTestSuccessModal: vi.fn(),
    });
    useIntegrationsSessionMock.mockReturnValue({
      showSessionModal: false,
      setShowSessionModal: vi.fn(),
    });
    useIntegrationTabsMock.mockReturnValue({
      activeTab: 'settings',
      setActiveTab: vi.fn(),
      isTradera: true,
      isVinted: false,
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      showPlaywright: true,
      showAllegroConsole: false,
      showBaseConsole: false,
      activeConnection: { id: 'connection-1' },
    });
  });

  it('shows close without a Playwright settings save action for sequencer-managed integrations', () => {
    const onCloseModal = vi.fn();

    useIntegrationsActionsMock.mockReturnValue({
      onCloseModal,
      onOpenSessionModal: vi.fn(),
    });
    useIntegrationTabsMock.mockReturnValue({
      activeTab: 'settings',
      setActiveTab: vi.fn(),
      isTradera: true,
      isVinted: false,
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      showPlaywright: true,
      showAllegroConsole: false,
      showBaseConsole: false,
      activeConnection: { id: 'connection-1' },
    });

    render(<IntegrationModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onCloseModal).toHaveBeenCalledTimes(1);
    expect(formModalRenderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showSaveButton: false,
        showCancelButton: true,
        cancelText: 'Close',
      })
    );
  });

  it('keeps close available but hides save for non-browser integrations', () => {
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-base',
        name: 'Base',
      },
    });
    useIntegrationTabsMock.mockReturnValue({
      activeTab: 'settings',
      setActiveTab: vi.fn(),
      isTradera: false,
      isVinted: false,
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: true,
      showPlaywright: false,
      showAllegroConsole: false,
      showBaseConsole: true,
      activeConnection: null,
    });

    render(<IntegrationModal />);

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(formModalRenderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showSaveButton: false,
        showCancelButton: true,
        cancelText: 'Close',
      })
    );
  });

  it('keeps Playwright save actions hidden for Vinted browser settings on the settings tab', () => {
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-vinted',
        name: 'Vinted.pl',
      },
    });
    useIntegrationTabsMock.mockReturnValue({
      activeTab: 'settings',
      setActiveTab: vi.fn(),
      isTradera: false,
      isVinted: true,
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      showPlaywright: true,
      showAllegroConsole: false,
      showBaseConsole: false,
      activeConnection: { id: 'connection-vinted-1' },
    });

    render(<IntegrationModal />);

    expect(screen.queryByRole('button', { name: 'Save fallback settings' })).not.toBeInTheDocument();
    expect(formModalRenderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showSaveButton: false,
        showCancelButton: true,
      })
    );
  });
});
