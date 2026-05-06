// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useIntegrationsDataMock,
  useIntegrationsFormMock,
  useIntegrationsTestingMock,
  useIntegrationsActionsMock,
  handleVintedManualLoginMock,
  handlePracujManualLoginMock,
} = vi.hoisted(() => ({
  useIntegrationsDataMock: vi.fn(),
  useIntegrationsFormMock: vi.fn(),
  useIntegrationsTestingMock: vi.fn(),
  useIntegrationsActionsMock: vi.fn(),
  handleVintedManualLoginMock: vi.fn(),
  handlePracujManualLoginMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/IntegrationsContext', () => ({
  useIntegrationsData: () => useIntegrationsDataMock(),
  useIntegrationsForm: () => useIntegrationsFormMock(),
  useIntegrationsTesting: () => useIntegrationsTestingMock(),
  useIntegrationsActions: () => useIntegrationsActionsMock(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
    className?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  SimpleSettingsList: ({
    items,
    renderActions,
  }: {
    items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      description?: React.ReactNode;
      original: unknown;
    }>;
    renderActions?: (item: {
      id: string;
      title: string;
      subtitle?: string;
      description?: React.ReactNode;
      original: unknown;
    }) => React.ReactNode;
    onDelete?: (item: unknown) => void;
    emptyMessage?: string;
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <div>{item.title}</div>
          {item.subtitle ? <div>{item.subtitle}</div> : null}
          {item.description}
          {renderActions?.(item)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./ConnectionEditModal', () => ({
  ConnectionEditModal: () => null,
}));

import { ConnectionList } from './ConnectionList';

describe('ConnectionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-vinted',
        slug: 'vinted',
      },
      connections: [
        {
          id: 'conn-vinted-1',
          integrationId: 'integration-vinted',
          name: 'Vinted Browser',
          username: '',
        },
      ],
    });
    useIntegrationsFormMock.mockReturnValue({
      editingConnectionId: null,
      setEditingConnectionId: vi.fn(),
    });
    useIntegrationsTestingMock.mockReturnValue({
      isTesting: false,
    });
    useIntegrationsActionsMock.mockReturnValue({
      handleDeleteConnection: vi.fn(),
      handleTestConnection: vi.fn(),
      handleBaselinkerTest: vi.fn(),
      handleAllegroTest: vi.fn(),
      handleTraderaManualLogin: vi.fn(),
      handleVintedManualLogin: handleVintedManualLoginMock,
      handle1688ManualLogin: vi.fn(),
      handlePracujManualLogin: handlePracujManualLoginMock,
    });
  });

  it('shows a reusable-session subtitle and opens the Vinted login window action', () => {
    render(<ConnectionList />);

    expect(screen.getByText('Vinted Browser')).toBeInTheDocument();
    expect(screen.getByText('Session-based browser login')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Login window' }));

    expect(handleVintedManualLoginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conn-vinted-1',
        name: 'Vinted Browser',
      })
    );
  });

  it('opens the Pracuj.pl login window action for job-search platform sessions', () => {
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-pracuj-1',
        slug: 'pracuj-pl',
      },
      connections: [
        {
          id: 'conn-pracuj-1',
          integrationId: 'integration-pracuj-1',
          name: 'Pracuj.pl Profile',
          username: '',
          jobApplicationPersonId: 'person-1',
          jobApplicationPersonName: 'Ada Lovelace',
        },
      ],
    });

    render(<ConnectionList />);

    expect(screen.getByText('Pracuj.pl Profile')).toBeInTheDocument();
    expect(screen.getByText('Session-based browser login')).toBeInTheDocument();
    expect(screen.getByText('Person: Ada Lovelace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Login window' }));

    expect(handlePracujManualLoginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conn-pracuj-1',
        name: 'Pracuj.pl Profile',
      })
    );
  });

  it('marks disabled Tradera connections and blocks test/login actions', () => {
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-tradera-1',
        slug: 'tradera',
      },
      connections: [
        {
          id: 'conn-tradera-1',
          integrationId: 'integration-tradera-1',
          name: 'Tradera Browser',
          username: 'seller@example.com',
          enabled: false,
        },
      ],
    });

    render(<ConnectionList />);

    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Login window' })).toBeDisabled();
  });
});
