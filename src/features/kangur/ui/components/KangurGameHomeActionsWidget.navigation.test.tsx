/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  localeMock,
  pathnameMock,
  routerPrefetchMock,
  routerPushMock,
  routerReplaceMock,
  startRouteTransitionMock,
  useKangurGameRuntimeMock,
  useKangurSubjectFocusMock,
  useOptionalKangurRouteTransitionStateMock,
  useOptionalKangurRoutingMock,
} = vi.hoisted(() => ({
  localeMock: vi.fn(),
  pathnameMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  startRouteTransitionMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  useOptionalKangurRouteTransitionStateMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
  useTranslations:
    () =>
    (key: string) =>
      (
        {
          sectionLabel: 'Home actions',
          'actions.lessons': 'Lessons',
          'actions.play': 'Play',
          'actions.duels': 'Duels',
          'actions.kangur': 'Kangur Math Contest',
        } as const
      )[key] ?? key,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    scroll?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    prefetch: routerPrefetchMock,
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    startRouteTransition: startRouteTransitionMock,
  }),
  useOptionalKangurRouteTransitionState: useOptionalKangurRouteTransitionStateMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurGameHomeActionsWidget } from './KangurGameHomeActionsWidget';

describe('KangurGameHomeActionsWidget navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur');
    startRouteTransitionMock.mockReturnValue({
      acknowledgeMs: 0,
      started: true,
    });
    useOptionalKangurRouteTransitionStateMock.mockReturnValue(null);
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/en/kangur',
      requestedPath: '/kangur',
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
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
  });

  it('navigates the lessons home action to the locale-prefixed Lessons route on the first click', () => {
    render(<KangurGameHomeActionsWidget />);

    fireEvent.click(screen.getByRole('link', { name: 'Lessons' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
      sourceId: 'game-home-action:lessons',
    });

    expect(routerPushMock).toHaveBeenCalledWith('/en/kangur/lessons', { scroll: false });
  });

  it('prefetches Lessons but not Duels from the home actions shell', () => {
    render(<KangurGameHomeActionsWidget />);

    expect(routerPrefetchMock).toHaveBeenCalledWith('/en/kangur/lessons');
    expect(routerPrefetchMock).not.toHaveBeenCalledWith('/en/kangur/duels');
  });
});
