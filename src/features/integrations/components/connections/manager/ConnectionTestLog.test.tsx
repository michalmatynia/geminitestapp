// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useIntegrationsDataMock,
  useIntegrationsTestingMock,
  setSelectedStepMock,
  setShowTestLogModalMock,
} = vi.hoisted(() => ({
  useIntegrationsDataMock: vi.fn(),
  useIntegrationsTestingMock: vi.fn(),
  setSelectedStepMock: vi.fn(),
  setShowTestLogModalMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/IntegrationsContext', () => ({
  useIntegrationsData: () => useIntegrationsDataMock(),
  useIntegrationsTesting: () => useIntegrationsTestingMock(),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({
    status,
    onClick,
  }: {
    status: string;
    onClick?: () => void;
  }) => <button onClick={onClick}>{status}</button>,
}));

vi.mock('@/shared/ui/templates.public', () => ({
  SimpleSettingsList: ({
    items,
    renderActions,
    emptyMessage,
  }: {
    items: Array<{ id: string; title: string }>;
    renderActions?: (item: { id: string; title: string }) => React.ReactNode;
    emptyMessage?: string;
    padding?: string;
    itemClassName?: string;
    className?: string;
  }) => (
    <div>
      {items.length === 0 ? <div>{emptyMessage}</div> : null}
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.title}</span>
          {renderActions?.(item)}
        </div>
      ))}
    </div>
  ),
}));

import { ConnectionTestLog } from './ConnectionTestLog';

describe('ConnectionTestLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsDataMock.mockReturnValue({
      activeIntegration: {
        id: 'integration-vinted',
        slug: 'vinted',
      },
    });
    useIntegrationsTestingMock.mockReturnValue({
      isTesting: false,
      testLog: [
        {
          step: 'Await Vinted login',
          status: 'failed',
          message: 'AUTH_REQUIRED',
        },
      ],
      setSelectedStep: setSelectedStepMock,
      setShowTestLogModal: setShowTestLogModalMock,
    });
  });

  it('shows browser live updates for Vinted and opens the step details modal', () => {
    render(<ConnectionTestLog />);

    expect(screen.getByText('Browser live update')).toBeInTheDocument();
    expect(screen.getByText('Await Vinted login')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'FAILED' }));

    expect(setSelectedStepMock).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'Await Vinted login',
        status: 'failed',
      })
    );
    expect(setShowTestLogModalMock).toHaveBeenCalledWith(true);
  });
});
