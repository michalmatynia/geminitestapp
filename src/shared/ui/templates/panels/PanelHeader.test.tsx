// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PanelHeader } from './PanelHeader';

const { logClientCatchMock, logSystemEventMock } = vi.hoisted(() => ({
  logClientCatchMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
    className,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} disabled={disabled} title={title} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/RefreshButton', () => ({
  RefreshButton: ({
    onRefresh,
    isRefreshing,
  }: {
    onRefresh: () => void;
    isRefreshing?: boolean;
    label?: string;
    size?: string;
    className?: string;
  }) => (
    <button type='button' aria-label='Refresh' disabled={isRefreshing} onClick={onRefresh}>
      refresh
    </button>
  ),
}));

vi.mock('@/shared/lib/observability/system-logger-client', () => ({
  logSystemEvent: (...args: unknown[]) => logSystemEventMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
}));

describe('PanelHeader', () => {
  it('renders title, actions, custom actions, and refresh wiring', async () => {
    const onAction = vi.fn();
    const onRefresh = vi.fn();

    render(
      <PanelHeader
        title='Users'
        description='Manage accounts'
        actions={[
          {
            key: 'create',
            label: 'Create',
            onClick: onAction,
          },
        ]}
        customActions={<span>Custom Action</span>}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Manage accounts')).toBeInTheDocument();
    expect(screen.getByText('Custom Action')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('logs refresh failures instead of throwing', async () => {
    const refreshError = new Error('Refresh failed');

    render(
      <PanelHeader
        title='Failing panel'
        onRefresh={async () => {
          throw refreshError;
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await screen.findByText('Failing panel');

    expect(logClientCatchMock).toHaveBeenCalledWith(
      refreshError,
      expect.objectContaining({
        action: 'refresh',
        source: 'PanelHeader',
      })
    );
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: refreshError,
        message: 'Refresh action failed',
        source: 'PanelHeader',
      })
    );
  });
});
