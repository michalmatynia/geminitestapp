/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurAssignmentsMock, useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurAssignmentsMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
  useTranslations:
    () =>
    (key: string) =>
      key === 'spotlight.title' ? 'Misja od rodzica' : key,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    scroll: _scroll,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    onClick,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    scroll?: boolean;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

import { KangurAssignmentSpotlight } from '@/features/kangur/ui/components/KangurAssignmentSpotlight';

describe('KangurAssignmentSpotlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject: vi.fn(),
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          title: 'Trening mieszany',
          description: 'Wykonaj mieszany trening i utrzymaj regularność pracy.',
          priority: 'high',
          archived: false,
          createdAt: '2026-03-10T10:00:00.000Z',
          updatedAt: '2026-03-10T10:00:00.000Z',
          progress: {
            status: 'in_progress',
            percent: 42,
            summary: '1 z 3 rund ukończona',
            attemptsCompleted: 1,
            attemptsRequired: 3,
            lastActivityAt: null,
            completedAt: null,
          },
          target: {
            type: 'practice',
            operation: 'mixed',
            requiredAttempts: 1,
            minAccuracyPercent: 70,
          },
          timeLimitMinutes: null,
          timeLimitStartsAt: null,
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      reassignAssignment: vi.fn(),
    });
  });

  it('uses a touch-friendly CTA and syncs the subject before opening the assignment', () => {
    const setSubject = vi.fn();
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject,
    });

    render(
      <KangurAssignmentSpotlight
        basePath='/kangur'
        enabled
      />
    );

    const action = screen.getByRole('link', { name: 'Uruchom trening' });

    expect(action).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    expect(action).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training&categories=addition%2Csubtraction%2Cmultiplication%2Cdivision%2Cdecimals%2Cpowers%2Croots&count=10&difficulty=medium'
    );

    fireEvent.click(action);

    expect(setSubject).toHaveBeenCalledWith('maths');
  });
});
