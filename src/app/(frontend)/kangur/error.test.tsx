/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logKangurClientErrorMock, kangurStandardPageLayoutMock } = vi.hoisted(() => ({
  logKangurClientErrorMock: vi.fn(),
  kangurStandardPageLayoutMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      backToHome: 'Back to home',
      errorDescription: 'Something went wrong.',
      errorTitle: 'Something went wrong',
      tryAgain: 'Try again',
    })[key] ?? key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({
    children,
    shellProps,
    containerProps,
  }: {
    children: ReactNode;
    shellProps?: Record<string, unknown>;
    containerProps?: Record<string, unknown>;
  }) => {
    kangurStandardPageLayoutMock({ shellProps, containerProps });
    return (
      <div data-testid='kangur-standard-page-layout' {...shellProps}>
        <main {...containerProps}>{children}</main>
      </div>
    );
  },
}));

describe('kangur error route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the Kangur error shell and reports the client error with digest context', async () => {
    const resetMock = vi.fn();
    const error = Object.assign(new Error('Boom'), {
      digest: 'digest-123',
    });

    const { default: KangurErrorPage } = await import('@/app/(frontend)/kangur/error');

    render(<KangurErrorPage error={error} reset={resetMock} />);

    expect(screen.getByTestId('kangur-error-shell')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/kangur');

    expect(kangurStandardPageLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        containerProps: expect.objectContaining({
          id: 'kangur-error-main',
        }),
        shellProps: expect.objectContaining({
          'data-testid': 'kangur-error-shell',
        }),
      })
    );
    expect(logKangurClientErrorMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        action: 'render',
        digest: 'digest-123',
        homeHref: '/kangur',
        source: 'kangur-error-page',
      })
    );
  });

  it('calls reset when the try-again action is pressed', async () => {
    const user = userEvent.setup();
    const resetMock = vi.fn();

    const { default: KangurErrorPage } = await import('@/app/(frontend)/kangur/error');

    render(<KangurErrorPage error={new Error('Retryable')} reset={resetMock} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
