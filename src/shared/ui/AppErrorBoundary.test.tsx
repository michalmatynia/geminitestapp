// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary, AppErrorFallback } from './AppErrorBoundary';

const { classifyErrorMock, getSuggestedActionsMock, logClientErrorMock, getLastUserActionMock } =
  vi.hoisted(() => ({
    classifyErrorMock: vi.fn(),
    getSuggestedActionsMock: vi.fn(),
    logClientErrorMock: vi.fn(),
    getLastUserActionMock: vi.fn(),
  }));

vi.mock('@/shared/errors/error-classifier', () => ({
  classifyError: (...args: unknown[]) => classifyErrorMock(...args),
  getSuggestedActions: (...args: unknown[]) => getSuggestedActionsMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

vi.mock('@/shared/utils/observability/user-action-tracker', () => ({
  getLastUserAction: (...args: unknown[]) => getLastUserActionMock(...args),
}));

describe('AppErrorBoundary', () => {
  it('renders fallback actions and wires the reset button through context', () => {
    classifyErrorMock.mockReturnValue('unknown');
    getSuggestedActionsMock.mockReturnValue([
      {
        label: 'Retry',
        description: 'Try the action again.',
      },
    ]);
    const resetErrorBoundary = vi.fn();

    render(
      <AppErrorFallback
        error={new Error('Boom')}
        resetErrorBoundary={resetErrorBoundary}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByText('Retry:')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it('logs error context when a child throws', () => {
    classifyErrorMock.mockReturnValue('unknown');
    getSuggestedActionsMock.mockReturnValue([]);
    getLastUserActionMock.mockReturnValue('clicked-save');

    const Thrower = (): React.JSX.Element => {
      throw new Error('Exploded');
    };

    render(
      <AppErrorBoundary source='TestBoundary'>
        <Thrower />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(logClientErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Exploded' }),
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'TestBoundary',
          lastUserAction: 'clicked-save',
        }),
      })
    );
  });
});
