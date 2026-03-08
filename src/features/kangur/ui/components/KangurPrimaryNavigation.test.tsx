/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startRouteTransitionMock } = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('framer-motion', () => {
  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }): React.JSX.Element {
      return React.createElement(tag, props, children);
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      button: createMotionTag('button'),
      div: createMotionTag('div'),
    },
  };
});

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransition: () => ({
    isRoutePending: false,
    pendingPageKey: null,
    startRouteTransition: startRouteTransitionMock,
  }),
}));

import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';

describe('KangurPrimaryNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the SVG logo inside the home control', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const logo = screen.getByTestId('kangur-home-logo');

    expect(logo.querySelector('svg')).not.toBeNull();
    expect(logo.className).not.toContain('translate-x-');
    expect(screen.getByRole('link', { name: /strona glowna/i })).toHaveAttribute(
      'href',
      '/kangur'
    );
  });

  it('navigates to the learner profile directly from the profile item', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /profil/i })).toHaveAttribute(
      'href',
      '/kangur/profile'
    );
  });

  it('shows the tests link as a first-class navigation destination', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /testy/i })).toHaveAttribute(
      'href',
      '/kangur/tests'
    );
  });

  it('starts the Kangur route transition before navigating to another page', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /lekcje/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/kangur/lessons',
      pageKey: 'Lessons',
    });
  });

  it('renders the toolbar nav group at full width', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('navigation', { name: /glowna nawigacja kangur/i })).toHaveClass(
      'w-full'
    );
  });

  it('shows logout as a separate action and calls the logout handler', () => {
    const onLogout = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows login when the user is not authenticated', () => {
    const onLogin = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated={false}
        onLogin={onLogin}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
