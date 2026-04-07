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
} = vi.hoisted(() => ({
  useIntegrationsDataMock: vi.fn(),
  useIntegrationsFormMock: vi.fn(),
  useIntegrationsTestingMock: vi.fn(),
  useIntegrationsActionsMock: vi.fn(),
  handleVintedManualLoginMock: vi.fn(),
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
});
