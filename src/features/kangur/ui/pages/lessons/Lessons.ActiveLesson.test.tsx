/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useLessonsMock, useKangurMobileBreakpointMock } = vi.hoisted(() => ({
  useLessonsMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/lessons/lesson-ui-registry', () => ({
  LESSON_COMPONENTS: {},
}));

vi.mock('@/features/kangur/ui/components/KangurActiveLessonHeader', () => ({
  KangurActiveLessonHeader: () => <div data-testid='mock-active-lesson-header' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => <div data-testid='mock-lesson-docs' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNavigationWidget', () => ({
  KangurLessonNavigationWidget: () => <div data-testid='mock-lesson-navigation' />,
}));

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  KangurLessonNavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    fullWidth: _fullWidth,
    size: _size,
    variant: _variant,
    ...props
  }: {
    children: React.ReactNode;
    fullWidth?: boolean;
    size?: string;
    variant?: string;
  }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  KangurGlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurSummaryPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_PANEL_GAP_CLASSNAME: 'gap',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('@/features/kangur/ui/pages/lessons/LessonsContext', () => ({
  useLessons: () => useLessonsMock(),
}));

import { ActiveLessonView } from '@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson';

const activeLesson = {
  id: 'lesson-1',
  componentId: 'adding',
  title: 'Lesson 1',
  contentMode: 'document',
};

const nextLesson = {
  id: 'lesson-2',
  componentId: 'adding',
  title: 'Lesson 2',
  contentMode: 'document',
};

describe('ActiveLessonView mobile scroll controls', () => {
  beforeEach(() => {
    useKangurMobileBreakpointMock.mockReturnValue(true);
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    useLessonsMock.mockReturnValue({
      activeLesson,
      handleSelectLesson: vi.fn(),
      lessonDocuments: {},
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
      setIsActiveLessonComponentReady: vi.fn(),
      activeLessonHeaderRef: React.createRef<HTMLDivElement>(),
      activeLessonNavigationRef: React.createRef<HTMLDivElement>(),
      activeLessonContentRef: React.createRef<HTMLDivElement>(),
      activeLessonScrollRef: React.createRef<HTMLDivElement>(),
      orderedLessons: [activeLesson, nextLesson],
      isSecretLessonActive: false,
      progress: { lessonMastery: {} },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('locks vertical scroll and uses arrow controls on mobile', async () => {
    const { unmount } = render(<ActiveLessonView />);

    await act(async () => {});

    const scrollContainer = screen.getByTestId('kangur-lesson-scroll-container') as HTMLDivElement;
    const scrollByMock = vi.fn();
    const scrollToMock = vi.fn();
    scrollContainer.scrollBy = scrollByMock;
    scrollContainer.scrollTo = scrollToMock;

    const upButton = screen.getByRole('button', { name: 'Przewiń w górę' });
    const downButton = screen.getByRole('button', { name: 'Przewiń w dół' });

    fireEvent.click(downButton);
    fireEvent.click(upButton);

    expect(scrollByMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 240, behavior: 'smooth' })
    );
    expect(scrollByMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: -240, behavior: 'smooth' })
    );

    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });
});
