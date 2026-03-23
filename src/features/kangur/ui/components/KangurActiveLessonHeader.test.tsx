/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subsectionSummaryMock } = vi.hoisted(() => ({
  subsectionSummaryMock: vi.fn(),
}));

vi.mock('@/features/kangur/lessons/lesson-catalog-i18n', () => ({
  getLocalizedKangurLessonTitle: (_componentId: string, _locale: string, fallback: string) => fallback,
  getLocalizedKangurLessonDescription: (
    _componentId: string,
    _locale: string,
    fallback: string
  ) => fallback,
}));

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  useKangurLessonSubsectionSummary: () => subsectionSummaryMock(),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='lesson-narrator' />,
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  KangurGlassPanel: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  KangurGradientIconTile: ({
    children,
    gradientClass: _gradientClass,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { gradientClass?: string }) => (
    <div {...props}>{children}</div>
  ),
  KangurHeadline: ({
    children,
    as: Component = 'h2',
    ...props
  }: React.HTMLAttributes<HTMLElement> & { as?: keyof JSX.IntrinsicElements }) => (
    <Component {...props}>{children}</Component>
  ),
  KangurPanelRow: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  KangurStatusChip: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';

describe('KangurActiveLessonHeader', () => {
  beforeEach(() => {
    subsectionSummaryMock.mockReset();
    subsectionSummaryMock.mockReturnValue(null);
  });

  it('keeps the lesson-level header when a subsection summary is active', () => {
    subsectionSummaryMock.mockReturnValue({
      emoji: '🎯',
      title: 'Pronouns',
      description: 'Subject and possessive forms.',
      isGame: false,
    });

    render(
      <KangurActiveLessonHeader
        lesson={{
          id: 'lesson-english-pronouns',
          componentId: 'lesson-english-pronouns',
          title: 'English: Parts of Speech',
          description: 'Rzeczowniki, czasowniki i zaimki w praktyce.',
          emoji: '📘',
          color: 'from-sky-500 to-cyan-400',
        } as never}
        lessonDocument={null}
        lessonContentRef={React.createRef()}
        headerTestId='active-header'
        headerActionsTestId='active-header-actions'
        iconTestId='active-header-icon'
        priorityChipTestId='active-header-priority'
        completedChipTestId='active-header-completed'
      />
    );

    expect(screen.getByRole('heading', { name: 'English: Parts of Speech' })).toBeInTheDocument();
    expect(
      screen.getByText('Rzeczowniki, czasowniki i zaimki w praktyce.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Pronouns')).not.toBeInTheDocument();
    expect(screen.queryByText(/subsection/i)).not.toBeInTheDocument();
  });
});
