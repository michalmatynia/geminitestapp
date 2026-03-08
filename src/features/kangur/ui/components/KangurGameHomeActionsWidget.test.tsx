/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
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

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

import { KangurGameHomeActionsWidget } from './KangurGameHomeActionsWidget';

describe('KangurGameHomeActionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show the observability action on the Kangur admin home surface', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/admin/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.queryByRole('link', { name: /obserwowalność/i })).not.toBeInTheDocument();
  });

  it('keeps the observability action off the learner-facing home surface', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.queryByRole('link', { name: /obserwowalność/i })).not.toBeInTheDocument();
  });

  it('uses the warm amber focus ring for home action cards', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByRole('link', { name: /lekcje/i })).toHaveClass(
      'focus-visible:ring-amber-300/70'
    );
    expect(screen.getByRole('button', { name: /grajmy!/i })).toHaveClass(
      'focus-visible:ring-amber-300/70'
    );
  });

  it('keeps guest play actions enabled on the home surface', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByRole('button', { name: /grajmy!/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /trening mieszany/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /kangur matematyczny/i })).toBeEnabled();
  });

  it('adds extra spacing between the front-page action pills', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByTestId('kangur-home-actions-list')).toHaveClass('space-y-6', 'sm:space-y-7');
  });
});
