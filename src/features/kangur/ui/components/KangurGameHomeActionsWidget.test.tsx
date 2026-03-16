/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

const { useOptionalKangurRouteTransitionStateMock } = vi.hoisted(() => ({
  useOptionalKangurRouteTransitionStateMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    targetPageKey?: string | null;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => useOptionalKangurRouteTransitionStateMock(),
}));

import { KangurGameHomeActionsWidget } from './KangurGameHomeActionsWidget';

describe('KangurGameHomeActionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOptionalKangurRouteTransitionStateMock.mockReturnValue(null);
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
    expect(screen.getByRole('link', { name: /pojedynki/i })).toHaveAttribute(
      'href',
      '/kangur/duels'
    );
    expect(screen.getByRole('button', { name: /kangur matematyczny/i })).toBeEnabled();
  });

  it('stacks the front-page actions into a single mobile column', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByTestId('kangur-home-actions-list')).toHaveClass(
      'grid',
      'grid-cols-1',
      'gap-3',
      'sm:gap-4'
    );
  });

  it('stays mounted outside the home screen when the transition override is disabled', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'operation',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />);

    expect(screen.getByTestId('kangur-home-actions-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grajmy!/i })).toBeInTheDocument();
  });

  it('marks the lessons action as pressed during the acknowledgement phase', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });
    useOptionalKangurRouteTransitionStateMock.mockReturnValue({
      activeTransitionPageKey: 'Lessons',
      activeTransitionSourceId: 'game-home-action:lessons',
      isRouteAcknowledging: true,
      isRoutePending: false,
      isRouteRevealing: false,
      pendingPageKey: null,
      transitionPhase: 'acknowledging',
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByTestId('kangur-home-action-lessons')).toHaveAttribute(
      'data-nav-state',
      'pressed'
    );
    expect(screen.getByTestId('kangur-home-action-play')).toHaveAttribute('data-nav-state', 'idle');
  });

  it('keeps the lessons action locked after the skeleton handoff starts', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });
    useOptionalKangurRouteTransitionStateMock.mockReturnValue({
      activeTransitionPageKey: 'Lessons',
      activeTransitionSourceId: 'game-home-action:lessons',
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteRevealing: false,
      pendingPageKey: 'Lessons',
      transitionPhase: 'pending',
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByTestId('kangur-home-action-lessons')).toHaveAttribute(
      'data-nav-state',
      'transitioning'
    );
  });
});
