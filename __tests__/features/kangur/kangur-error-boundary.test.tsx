/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logKangurClientErrorMock, withKangurClientError, withKangurClientErrorSync } =
  vi.hoisted(() => {
    const mocks = globalThis.__kangurClientErrorMocks();
    return {
      logKangurClientErrorMock: mocks.logKangurClientErrorMock,
      withKangurClientError: mocks.withKangurClientError,
      withKangurClientErrorSync: mocks.withKangurClientErrorSync,
    };
  });

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children?: ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import KangurErrorBoundary from '@/app/(frontend)/kangur/error';

describe('Kangur error boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared Kangur surface and exposes retry/back actions', () => {
    const reset = vi.fn();

    render(<KangurErrorBoundary error={new Error('Boom')} reset={reset} />);

    expect(screen.getByTestId('kangur-error-shell')).toHaveClass(
      'kangur-premium-bg',
      'min-h-screen'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Wróć do Kangura' })).toHaveAttribute(
      'href',
      '/kangur'
    );
  });

  it('logs the error payload on render', () => {
    const error = Object.assign(new Error('Render failed'), { digest: 'digest-123' });

    render(<KangurErrorBoundary error={error} reset={vi.fn()} />);

    expect(logKangurClientErrorMock).toHaveBeenCalledWith(error, {
      source: 'kangur-error-page',
      action: 'render',
      digest: 'digest-123',
      homeHref: '/kangur',
    });
  });
});
