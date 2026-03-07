/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';

describe('KangurPrimaryNavigation', () => {
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
      '/kangur/game'
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
