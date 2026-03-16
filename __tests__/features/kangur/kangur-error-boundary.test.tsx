/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logKangurClientErrorMock } = vi.hoisted(() => ({
  logKangurClientErrorMock: vi.fn(),
}));

type KangurClientErrorHandlingOptions<T> = {
  fallback: T | (() => T);
  onError?: (error: unknown) => void;
  shouldReport?: (error: unknown) => boolean;
  shouldRethrow?: (error: unknown) => boolean;
};

const withKangurClientError = async <T,>(
  _report: unknown,
  task: () => Promise<T>,
  options: KangurClientErrorHandlingOptions<T>
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

const withKangurClientErrorSync = <T,>(
  _report: unknown,
  task: () => T,
  options: KangurClientErrorHandlingOptions<T>
): T => {
  try {
    return task();
  } catch (error) {
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) => (
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
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to Kangur' })).toHaveAttribute('href', '/kangur');
  });

  it('logs the error payload on render', () => {
    const error = Object.assign(new Error('Render failed'), { digest: 'digest-123' });

    render(<KangurErrorBoundary error={error} reset={vi.fn()} />);

    expect(logKangurClientErrorMock).toHaveBeenCalledWith(error, {
      source: 'kangur-error-boundary',
      action: 'render',
      digest: 'digest-123',
      homeHref: '/kangur',
    });
  });
});
