/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GAME_HOME_ACTIONS_LIST_CLASSNAME,
  GAME_HOME_ACTIONS_SHELL_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';

const { kangurTransitionLinkPropsMock } = vi.hoisted(() => ({
  kangurTransitionLinkPropsMock: vi.fn(),
}));

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

const { useOptionalKangurRouteTransitionStateMock } = vi.hoisted(() => ({
  useOptionalKangurRouteTransitionStateMock: vi.fn(),
}));

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    prefetch,
    targetPageKey,
    transitionAcknowledgeMs,
    transitionSourceId,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    targetPageKey?: string | null;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  }) => {
    kangurTransitionLinkPropsMock({
      href,
      prefetch,
      targetPageKey,
      transitionAcknowledgeMs,
      transitionSourceId,
    });

    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => useOptionalKangurRouteTransitionStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurGameHomeActionsWidget } from '../KangurGameHomeActionsWidget';

describe('KangurGameHomeActionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kangurTransitionLinkPropsMock.mockClear();
    useOptionalKangurRouteTransitionStateMock.mockReturnValue(null);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
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

  it('leaves the Duels home action as user-initiated navigation without prefetch', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(kangurTransitionLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/duels',
        prefetch: false,
        targetPageKey: 'Duels',
      })
    );
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

    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveClass(
      'focus-visible:ring-amber-300/70'
    );
    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[5rem]'
    );
    expect(screen.getByRole('button', { name: 'Grajmy!' })).toHaveClass(
      'focus-visible:ring-amber-300/70'
    );
    expect(screen.getByRole('button', { name: 'Grajmy!' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[5rem]'
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

    expect(screen.getByRole('button', { name: 'Grajmy!' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Pojedynki' })).toHaveAttribute(
      'href',
      '/kangur/duels'
    );
    expect(screen.getByRole('button', { name: 'StudiQ Matematyczny' })).toBeEnabled();
  });

  it('wires the lessons home action through the managed Kangur transition contract', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(kangurTransitionLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/lessons',
        targetPageKey: 'Lessons',
        
        transitionSourceId: 'game-home-action:lessons',
      })
    );
  });

  it('hides the kangur math contest action when English is selected', () => {
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.queryByRole('button', { name: 'StudiQ Matematyczny' })).toBeNull();
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

    expect(screen.getByTestId('kangur-home-actions-shell')).toHaveClass(
      ...GAME_HOME_ACTIONS_SHELL_CLASSNAME.split(' ')
    );
    expect(screen.getByTestId('kangur-home-actions-list')).toHaveClass(
      ...GAME_HOME_ACTIONS_LIST_CLASSNAME.split(' ')
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
    expect(screen.getByRole('button', { name: 'Grajmy!' })).toBeInTheDocument();
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

  it('hides the home actions shell once the lessons handoff starts', () => {
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

    expect(screen.getByTestId('kangur-home-actions-shell')).toHaveAttribute(
      'data-home-actions-transition-hidden',
      'true'
    );
    expect(screen.getByTestId('kangur-home-actions-shell')).toHaveClass(
      'pointer-events-none',
      'opacity-0'
    );
  });
});
